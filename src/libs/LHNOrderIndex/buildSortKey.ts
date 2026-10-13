const NUMERIC_PAD_WIDTH = 15;
const DIGIT_SEQUENCE = /\d+/g;

/**
 * Builds a normalized sort key for fast string comparison using plain < / > operators.
 * Lowercases the name and zero-pads numeric segments ("Report 2" → "report 000000000000002")
 * so that numeric ordering is preserved without Intl.Collator.
 */
function buildSortKey(displayName: string): string {
    return displayName.toLowerCase().replaceAll(DIGIT_SEQUENCE, (match) => match.padStart(NUMERIC_PAD_WIDTH, '0'));
}

export default buildSortKey;
