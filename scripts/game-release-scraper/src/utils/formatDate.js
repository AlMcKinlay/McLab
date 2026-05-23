const MONTHS = {
	january: "Jan",
	february: "Feb",
	march: "Mar",
	april: "Apr",
	may: "May",
	june: "Jun",
	july: "Jul",
	august: "Aug",
	september: "Sep",
	october: "Oct",
	november: "Nov",
	december: "Dec",
	jan: "Jan",
	feb: "Feb",
	mar: "Mar",
	apr: "Apr",
	jun: "Jun",
	jul: "Jul",
	aug: "Aug",
	sep: "Sep",
	oct: "Oct",
	nov: "Nov",
	dec: "Dec",
};

/**
 * Normalise a date string to "Mon D, YYYY" (e.g. "Apr 13, 2026").
 * Returns the original string unchanged if it can't be parsed.
 */
export function formatDate(raw) {
	if (!raw) return raw;

	// Already just a year — leave as-is
	if (/^\d{4}$/.test(raw.trim())) return raw.trim();

	// Try parsing via Date — handles ISO, "Month D, YYYY", etc.
	const parsed = new Date(raw);
	if (!isNaN(parsed)) {
		return parsed.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	}

	// Manual parse for formats like "13 Apr, 2026" or "26 September 2024"
	const manual = raw.match(/(\d{1,2})\s+([A-Za-z]+)[,\s]+(\d{4})/);
	if (manual) {
		const [, day, monthRaw, year] = manual;
		const month = MONTHS[monthRaw.toLowerCase()];
		if (month) return `${month} ${parseInt(day, 10)}, ${year}`;
	}

	return raw;
}
