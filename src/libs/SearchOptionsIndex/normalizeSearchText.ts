import StringUtils from '@libs/StringUtils';

import deburr from 'lodash/deburr';

/**
 * A superset of both canonical matchers: `deburr` (the cheap check in `getValidOptions`, which maps ł/ø/ß/æ)
 * and `normalizeForMatch` (`filterReports`, which strips NFD marks deburr misses and zero-width characters).
 */
function normalizeSearchText(text: string): string {
    return StringUtils.normalizeForMatch(deburr(text.toLocaleLowerCase()));
}

export default normalizeSearchText;
