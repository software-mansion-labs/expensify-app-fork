function removeInvisible(str) {
    // eslint-disable-next-line no-control-regex
    return str.replace(/[\0-\x1F\x7F-\x9F\u200E-\u200F\u202A-\u202E\u200B\u00A0\u2060]/g, '').trim();
}

export default removeInvisible;
