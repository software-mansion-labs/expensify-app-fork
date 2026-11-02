/**
 * Returns the URL's path, without its query string or fragment.
 */
function getPathnameFromURL(url: string): string {
    return url.split(/[?#]/).at(0) ?? '';
}

export default getPathnameFromURL;
