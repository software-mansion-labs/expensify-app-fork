/**
 *  Checks if the string would be empty if all invisible characters were removed.
 */
function isEmptyString(value: string): boolean {
    // \p{C} matches all 'Other' characters
    // \p{Z} matches all separators (spaces etc.)
    // Source: http://www.unicode.org/reports/tr18/#General_Category_Property
    return value.replace(/[\p{C}\p{Z}]/gu, '') === '';
}

export default isEmptyString;
