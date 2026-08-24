/**
 * Side-effect module: runs the QA auth callback capture as soon as it is imported.
 *
 * It has to be a module body rather than a call from the entry point, because the entry point's own
 * statements only run once every one of its imports has been evaluated — including the app itself. The URL
 * must be rewritten off the redirect path before that, so nothing in the app can resolve a route from a
 * location that has no route. Import it before the app, and only for that reason.
 *
 * A no-op on every load that is not the callback, and on native, where the callback never arrives this way.
 */
import {captureCloudflareAuthCallbackURL} from '@libs/CloudflareAccess/captureAuthCallbackURL';

captureCloudflareAuthCallbackURL();
