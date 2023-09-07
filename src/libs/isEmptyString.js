function isEmptyString(str) {
    // \p{C} matches all 'Other' characters
    // \p{Z} matches all separators (spaces etc.)
    // Source: http://www.unicode.org/reports/tr18/#General_Category_Property
    return str.replace(/[\p{C}\p{Z}]/gu, '') === '';
}

export default isEmptyString;
