import deburr from 'lodash/deburr';

/** The normalization `getValidOptions` applies to both the text of an option and the terms typed against it. */
function normalizeSearchText(text: string): string {
    return deburr(text.toLocaleLowerCase());
}

export default normalizeSearchText;
