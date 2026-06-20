# Skill: Recreate VS Code Setup on macOS (Self-Contained)

## Purpose

Recreate this exact VS Code setup on another macOS machine using the committed snapshot files in this folder.

## Source of Truth (Committed Snapshot)

This skill expects all reproducible setup data to live here:

- snapshot/vscode-extensions.txt
- snapshot/User/settings.json
- snapshot/User/keybindings.json
- snapshot/User/tasks.json
- snapshot/User/snippets/

The target machine should be configured from these files directly.

## What This Recreates

- User extensions
- User settings
- User keybindings
- User tasks
- User snippets

Not fully reproducible by file copy alone:

- Account sign-in state
- Keychain-backed credentials/tokens
- Some extension secrets/state stored outside User JSON files

## Target Paths (macOS)

- User root: ~/Library/Application Support/Code/User
- Settings: ~/Library/Application Support/Code/User/settings.json
- Keybindings: ~/Library/Application Support/Code/User/keybindings.json
- Tasks: ~/Library/Application Support/Code/User/tasks.json
- Snippets: ~/Library/Application Support/Code/User/snippets

## Apply on a New Machine

Run these commands from the skill directory:

```bash
cd /path/to/McLab/skills/vscode-setup-recreate

# 1) Install extensions
while IFS= read -r ext; do
  [ -n "$ext" ] && code --install-extension "$ext"
done < snapshot/vscode-extensions.txt

# 2) Restore User files
mkdir -p "$HOME/Library/Application Support/Code/User/snippets"
cp snapshot/User/settings.json "$HOME/Library/Application Support/Code/User/settings.json"
cp snapshot/User/keybindings.json "$HOME/Library/Application Support/Code/User/keybindings.json"
cp snapshot/User/tasks.json "$HOME/Library/Application Support/Code/User/tasks.json"
cp -R snapshot/User/snippets/. "$HOME/Library/Application Support/Code/User/snippets/"
```

Then fully quit and relaunch VS Code.

## Git Graph Auto-open and Pin (Included)

This snapshot includes the task-based startup approach:

- tasks.json contains Open Git Graph, Pin Active Editor, and Open and Pin Git Graph with runOn: folderOpen
- settings.json includes task.allowAutomaticTasks = on

This is sufficient for Git Graph startup behavior; window/session restore settings are optional.

## Refresh Snapshot from Current Machine

Use this only when intentionally updating baseline setup:

```bash
cd /path/to/McLab/skills/vscode-setup-recreate
mkdir -p snapshot/User/snippets
code --list-extensions > snapshot/vscode-extensions.txt
cp "$HOME/Library/Application Support/Code/User/settings.json" snapshot/User/settings.json
cp "$HOME/Library/Application Support/Code/User/keybindings.json" snapshot/User/keybindings.json
cp "$HOME/Library/Application Support/Code/User/tasks.json" snapshot/User/tasks.json
cp -R "$HOME/Library/Application Support/Code/User/snippets/." snapshot/User/snippets/
```

Before committing changes, review snapshot files for secrets or machine-specific values.

## Compare Current State vs Snapshot (Drift Check)

Use this to find differences between this machine and the committed snapshot.

Run from this folder:

```bash
cd /path/to/McLab/skills/vscode-setup-recreate
USER_DIR="$HOME/Library/Application Support/Code/User"
```

### Extensions

```bash
# Build sorted lists
code --list-extensions | sort > /tmp/current-extensions.txt
sort snapshot/vscode-extensions.txt > /tmp/snapshot-extensions.txt

# Installed now, but missing from snapshot
comm -23 /tmp/current-extensions.txt /tmp/snapshot-extensions.txt

# In snapshot, but missing now
comm -13 /tmp/current-extensions.txt /tmp/snapshot-extensions.txt
```

### Settings, Keybindings, Tasks (File Diff)

```bash
diff -u snapshot/User/settings.json "$USER_DIR/settings.json" || true
diff -u snapshot/User/keybindings.json "$USER_DIR/keybindings.json" || true
diff -u snapshot/User/tasks.json "$USER_DIR/tasks.json" || true
```

Optional normalized JSON diff if jq is available:

```bash
if command -v jq >/dev/null 2>&1; then
  jq -S . snapshot/User/settings.json > /tmp/snapshot-settings.json
  jq -S . "$USER_DIR/settings.json" > /tmp/current-settings.json
  diff -u /tmp/snapshot-settings.json /tmp/current-settings.json || true

  jq -S . snapshot/User/keybindings.json > /tmp/snapshot-keybindings.json
  jq -S . "$USER_DIR/keybindings.json" > /tmp/current-keybindings.json
  diff -u /tmp/snapshot-keybindings.json /tmp/current-keybindings.json || true

  jq -S . snapshot/User/tasks.json > /tmp/snapshot-tasks.json
  jq -S . "$USER_DIR/tasks.json" > /tmp/current-tasks.json
  diff -u /tmp/snapshot-tasks.json /tmp/current-tasks.json || true
fi
```

### Snippets

```bash
# Compare snippet file names
find snapshot/User/snippets -type f | sed 's#^snapshot/User/snippets/##' | sort > /tmp/snapshot-snippets.txt
find "$USER_DIR/snippets" -type f | sed "s#^$USER_DIR/snippets/##" | sort > /tmp/current-snippets.txt

# Snippets present now, but not in snapshot
comm -23 /tmp/current-snippets.txt /tmp/snapshot-snippets.txt

# Snippets in snapshot, but missing now
comm -13 /tmp/current-snippets.txt /tmp/snapshot-snippets.txt
```

For snippet files with same name, compare content:

```bash
while IFS= read -r rel; do
  if [ -f "$USER_DIR/snippets/$rel" ]; then
    diff -u "snapshot/User/snippets/$rel" "$USER_DIR/snippets/$rel" || true
  fi
done < /tmp/snapshot-snippets.txt
```

## Sync Strategy for Two Similar Machines

1. Run the drift check on both machines.
2. Decide direction:
   - snapshot is canonical: apply snapshot to both machines.
   - one machine is newer: refresh snapshot from that machine, then apply to the other.
3. Re-run drift check and ensure outputs are empty (or only intentional differences remain).

## Verification Checklist

1. code --list-extensions contains expected IDs, including mhutchie.git-graph.
2. VS Code loads settings/tasks/keybindings without JSON errors.
3. Snippets appear in completion.
4. On folder open, Git Graph opens and pins automatically.

## LLM Prompt Template

Use this with another LLM:

1. Follow this skill exactly.
2. Use snapshot files in this folder as the only source of truth.
3. Configure global VS Code user files on macOS.
4. Return only:
   - commands to run
   - exact file edits
   - verification steps
