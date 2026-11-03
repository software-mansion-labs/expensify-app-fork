/** Tells whether a hostname belongs to one of the app's web link prefixes */
import 'react-native-url-polyfill/auto';
import prefixes from './prefixes';

const appLinkHostnames = new Set(prefixes.filter((prefix) => prefix.startsWith('https://')).map((prefix) => new URL(prefix).hostname.toLowerCase()));

/** Whether a URL's hostname is one the app answers on as a web link, in any environment */
function isAppLinkHostname(hostname: string): boolean {
    return appLinkHostnames.has(hostname.toLowerCase().replace(/\.$/, ''));
}

export default isAppLinkHostname;
