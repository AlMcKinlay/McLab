#!/usr/bin/env node

// Checks every unarchived series in the Notion comics tracker against the
// Metron comic database (https://metron.cloud) and reports which series are
// officially finished (Completed/Cancelled) with the final issue already
// read — i.e. which ones are ready to be archived.
//
// Credentials come from the environment (or scripts/.env):
//   CLAUDE_NOTION_KEY  — Notion integration token (read access to the Comics page)
//   METRON_KEY         — metron.cloud API token (or METRON_USERNAME + METRON_PASSWORD)
//
// Usage: node scripts/check-finished-comics.js [--all] [--limit=N] [--only=text]
//   --all        also print ongoing series that checked out OK
//   --limit=N    only check the first N series (for testing)
//   --only=text  only check series whose name contains text (case-insensitive)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NOTION_VERSION = '2022-06-28';
const SERIES_DB = '2cd0a3f5-0f23-8046-91a5-e782cd51f185'; // "Comic Series"
const TRACKER_DB = '2b90a3f5-0f23-80db-91e8-ead90228f72f'; // "Comics Tracker"

const METRON_BASE = 'https://metron.cloud/api';
const METRON_DELAY_MS = 2100; // Metron throttles at 30 requests/minute

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function loadEnv() {
  const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`Missing environment variables (or scripts/.env entries): ${missing.join(', ')}`);
    process.exit(1);
  }
}

// --- Notion ---

async function notionQueryAll(databaseId, filter) {
  const pages = [];
  let cursor;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CLAUDE_NOTION_KEY}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_size: 100,
        ...(filter ? { filter } : {}),
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Notion query failed (${res.status}): ${await res.text()}`);
    const data = await res.json();
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return pages;
}

const plainText = (rich) => (rich || []).map((t) => t.plain_text).join('').trim();

async function fetchUnarchivedSeries() {
  const pages = await notionQueryAll(SERIES_DB, { property: 'Archived', checkbox: { equals: false } });
  return pages
    .map((p) => ({ id: p.id, name: plainText(p.properties.Name.title), url: p.url }))
    .filter((s) => s.name);
}

// One full scan of the tracker beats one filtered query per series: the
// per-series Issues relation is capped at 25 entries, so it can't be trusted
// for long runs anyway.
async function fetchReadIssuesBySeries() {
  const pages = await notionQueryAll(TRACKER_DB);
  const bySeries = new Map();
  for (const page of pages) {
    const num = parseFloat(plainText(page.properties['#'].title).replace(/^#/, ''));
    for (const rel of page.properties['Comic Series'].relation) {
      const entry = bySeries.get(rel.id) || { count: 0, max: null };
      entry.count += 1;
      if (Number.isFinite(num) && (entry.max === null || num > entry.max)) entry.max = num;
      bySeries.set(rel.id, entry);
    }
  }
  return bySeries;
}

// --- Metron ---

let lastMetronRequest = 0;

function metronAuthHeader() {
  if (process.env.METRON_KEY) return `Bearer ${process.env.METRON_KEY}`;
  const basic = Buffer.from(`${process.env.METRON_USERNAME}:${process.env.METRON_PASSWORD}`).toString('base64');
  return `Basic ${basic}`;
}

async function metron(pathname, params = {}) {
  const url = new URL(`${METRON_BASE}${pathname}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  while (true) {
    const wait = lastMetronRequest + METRON_DELAY_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastMetronRequest = Date.now();

    const res = await fetch(url, { headers: { Authorization: metronAuthHeader() } });
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('Retry-After')) || 10;
      await sleep(retryAfter * 1000);
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Metron rejected the credentials (${res.status}) — check METRON_KEY (or METRON_USERNAME/METRON_PASSWORD).`
      );
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Metron request failed (${res.status}): ${await res.text()}`);
    return res.json();
  }
}

async function metronList(pathname, params, maxPages = 10) {
  const results = [];
  let page = 1;
  let data;
  do {
    data = await metron(pathname, { ...params, page });
    if (!data) break;
    results.push(...data.results);
    page += 1;
  } while (data.next && page <= maxPages);
  return results;
}

// Leading articles are stripped because Metron and the tracker disagree on
// them ("The Amazing Spider-Man" vs "Amazing Spider-Man").
const normalize = (s) =>
  s
    .normalize('NFKD')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^the /, '');

// "Daredevil (2026)" → { base: "Daredevil", year: 2026 }
function parseSeriesName(name) {
  const m = name.match(/^(.*?)\s*\((\d{4})\)$/);
  return m ? { base: m[1], year: Number(m[2]) } : { base: name, year: null };
}

// Metron display names can trail the year with a series type,
// e.g. "X-Men '97: Strike Files Infinity Comic (2026) Digital".
const stripYearSuffix = (s) => s.replace(/\s*\(\d{4}\).*$/, '');

async function findMetronSeries(name) {
  const { base, year } = parseSeriesName(name);
  const query = base.normalize('NFKD').replace(/[‘’]/g, "'");

  // Metron search misses "&" spelled as "and" and subtitle-heavy names, so
  // fall through progressively looser queries; matching happens below anyway.
  const queries = [...new Set([query, query.replace(/&/g, 'and'), query.split(':')[0].trim()])];
  let candidates = [];
  for (const q of queries) {
    candidates = await metronList('/series/', { name: q });
    if (candidates.length) break;
  }
  if (!candidates.length) return { match: null, note: 'no Metron search results' };

  const target = normalize(base);
  let pool = candidates.filter((c) => normalize(stripYearSuffix(c.series)) === target);
  let fuzzy = false;
  if (!pool.length) {
    // Digital-first series carry suffixes the tracker omits ("Infinity
    // Comic") — accept a longer Metron name that starts with ours.
    pool = candidates.filter((c) => normalize(stripYearSuffix(c.series)).startsWith(`${target} `));
    fuzzy = true;
  }
  if (!pool.length && year) {
    // Cover titles sometimes differ from the indicia title Metron indexes
    // ("The Mortal Thor" is indexed as "Thor") — retry on trailing words and
    // accept a candidate whose whole name is a suffix of ours.
    const words = base.trim().split(/\s+/);
    for (let i = 1; i < words.length && !pool.length; i++) {
      const sub = await metronList('/series/', { name: words.slice(i).join(' '), year_began: year });
      pool = sub.filter((c) => target.endsWith(` ${normalize(stripYearSuffix(c.series))}`));
    }
    fuzzy = true;
  }
  if (!pool.length) {
    return { match: null, note: `no name match (closest: "${candidates[0].series}")` };
  }

  if (year) {
    pool = pool.filter((c) => c.year_began === year);
    if (!pool.length) return { match: null, note: `name matches but no volume began in ${year}` };
  }
  // With multiple volumes and nothing to disambiguate, the newest volume is
  // the one being tracked — but flag it so a wrong pick doesn't silently pass.
  const pick = pool.reduce((a, b) => (b.year_began > a.year_began ? b : a));
  const notes = [];
  if (fuzzy) notes.push(`matched "${pick.series}" inexactly — verify`);
  if (pool.length > 1) notes.push(`multiple volumes on Metron, assumed newest (${pick.series})`);
  return { match: pick, note: notes.join('; ') || null, fuzzy };
}

async function finalIssueNumber(seriesId) {
  const issues = await metronList('/issue/', { series_id: seriesId });
  const numbers = issues.map((i) => parseFloat(i.number)).filter(Number.isFinite);
  return numbers.length ? Math.max(...numbers) : null;
}

// --- Main ---

const FINISHED = /^(completed|cancell?ed)$/i;

async function checkSeries(series, read) {
  const { match, note, fuzzy } = await findMetronSeries(series.name);
  if (!match) return { verdict: 'NOTFOUND', detail: note };

  const detail = await metron(`/series/${match.id}/`);
  const status = detail?.status || null;
  const suffix = note ? ` [${note}]` : '';
  if (!status) return { verdict: 'CHECK', detail: `matched "${match.series}" but Metron has no status${suffix}` };

  if (!FINISHED.test(status)) {
    return { verdict: 'OK', detail: `${status}, read ${read?.count ?? 0} of ${detail.issue_count ?? '?'} issues${suffix}` };
  }

  // Logging more issues than the matched series has means the wrong volume
  // got matched (e.g. a one-shot sharing the main title's name and year).
  if (detail.issue_count && read?.count > detail.issue_count) {
    return { verdict: 'CHECK', detail: `matched "${match.series}" has only ${detail.issue_count} issue(s) but you've logged ${read.count} — probably the wrong volume${suffix}` };
  }

  const final = await finalIssueNumber(match.id);
  if (final === null) {
    return { verdict: 'CHECK', detail: `${status}, but couldn't determine the final issue number${suffix}` };
  }
  // Indicia numbering can jump to legacy numbers mid-run, so a full log
  // counts as finished even when the logged numbers never reach the final
  // indicia number.
  const allLogged = Boolean(detail.issue_count) && read?.count >= detail.issue_count;
  // Reading past the "final" issue means the wrong series got matched (e.g. a
  // mini sharing the main title's name).
  if (read?.max != null && read.max > final && !allLogged) {
    return { verdict: 'CHECK', detail: `matched "${match.series}" ends at #${final} but you've read #${read.max} — probably the wrong series${suffix}` };
  }
  if ((read?.max != null && read.max >= final) || allLogged) {
    if (fuzzy) {
      return { verdict: 'CHECK', detail: `${status} at #${final} and final issue read, but the match was inexact — verify before archiving${suffix}` };
    }
    const basis = read?.max != null && read.max >= final
      ? `final issue #${final} read${detail.issue_count && read.count < detail.issue_count ? ` (only ${read.count} of ${detail.issue_count} issues logged)` : ''}`
      : `all ${detail.issue_count} issues logged (numbering ends at #${final})`;
    return { verdict: 'ARCHIVE', detail: `${status}, ${basis}${suffix}` };
  }
  // Finished series with issues still unread are routine — Marvel Unlimited
  // runs ~3 months behind print — so they stay out of the default report.
  return {
    verdict: 'OK',
    detail: `${status} at #${final}, you're at ${read?.max != null ? `#${read.max}` : 'no issues logged'}${suffix}`,
  };
}

const SECTIONS = [
  ['ARCHIVE', '🗄️  Ready to archive — series finished and final issue read'],
  ['CHECK', '👀 Check manually'],
  ['NOTFOUND', '❓ Not found on Metron'],
];

async function main() {
  loadEnv();
  requireEnv(['CLAUDE_NOTION_KEY']);
  if (!process.env.METRON_KEY && !(process.env.METRON_USERNAME && process.env.METRON_PASSWORD)) {
    console.error('Metron credentials missing: set METRON_KEY, or METRON_USERNAME and METRON_PASSWORD.');
    process.exit(1);
  }

  const showAll = process.argv.includes('--all');
  const limitArg = process.argv.find((a) => a.startsWith('--limit'));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
  const onlyArg = process.argv.find((a) => a.startsWith('--only'));
  const only = onlyArg ? onlyArg.split('=')[1].toLowerCase() : null;

  console.error('Fetching series and read issues from Notion…');
  const [series, readBySeries] = await Promise.all([fetchUnarchivedSeries(), fetchReadIssuesBySeries()]);
  const toCheck = series.filter((s) => !only || s.name.toLowerCase().includes(only)).slice(0, limit);
  console.error(`${series.length} unarchived series, checking ${toCheck.length} against Metron (~2s per lookup).`);

  const results = [];
  for (let i = 0; i < toCheck.length; i++) {
    const s = toCheck[i];
    if (process.stderr.isTTY) {
      process.stderr.write(`\rChecking ${String(i + 1).padStart(3)}/${toCheck.length}  ${s.name.slice(0, 50).padEnd(50)}`);
    }
    let result;
    try {
      result = await checkSeries(s, readBySeries.get(s.id));
    } catch (err) {
      if (/credentials/i.test(err.message)) throw err;
      result = { verdict: 'CHECK', detail: `lookup failed: ${err.message}` };
    }
    results.push({ series: s, ...result });
  }
  if (process.stderr.isTTY) process.stderr.write(`\r${' '.repeat(70)}\r`);

  for (const [key, heading] of SECTIONS) {
    const rows = results.filter((r) => r.verdict === key);
    if (!rows.length) continue;
    console.log(`\n${heading} (${rows.length})`);
    for (const r of rows) console.log(`  - ${r.series.name} — ${r.detail}`);
  }

  const ok = results.filter((r) => r.verdict === 'OK');
  if (showAll && ok.length) {
    console.log(`\n✅ Nothing to do yet — ongoing or still reading (${ok.length})`);
    for (const r of ok) console.log(`  - ${r.series.name} — ${r.detail}`);
  }

  const counts = SECTIONS.map(([key]) => [key, results.filter((r) => r.verdict === key).length])
    .filter(([, n]) => n)
    .map(([key, n]) => `${key.toLowerCase()}: ${n}`)
    .join(', ');
  console.log(`\nChecked ${results.length} series — nothing to do: ${ok.length}${counts ? `, ${counts}` : ''}.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
