function removeInvisible(str) {
    const matchFn = (match) => {
        if (match === '\u200D') {
            return match;
        }
        return '';
    };
    return str.replace(/\p{C}/gu, matchFn).trim();
}

export default removeInvisible;
