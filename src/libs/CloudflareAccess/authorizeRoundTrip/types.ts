import type {AuthorizedCodeExchange} from '@libs/CloudflareAccess/captureAuthCallbackURL/types';

type AuthorizeRoundTripResult =
    /** The callback passed every check; the caller runs the exchange */
    | {outcome: 'exchange'; exchange: AuthorizedCodeExchange}

    /** The user closed the browser without authorizing */
    | {outcome: 'cancelled'}
    | {outcome: 'failed'; errorMessage: string};

type AuthorizeRoundTripRequest = {
    authorizeURL: string;

    /** Echoed back by Cloudflare on the callback and compared there */
    state: string;

    /** Held until the exchange, which is why it comes back out in the result */
    codeVerifier: string;

    /** Where the user should land once the flow completes. Web only: native never leaves the screen */
    returnURL?: string;
};

/**
 * Web never settles this: the page navigates away and the callback arrives as a fresh load, handled by the
 * boot-time capture phase. Native keeps running, so it resolves with the parsed callback.
 */
type RunAuthorizeRoundTrip = (request: AuthorizeRoundTripRequest) => Promise<AuthorizeRoundTripResult>;

export type {AuthorizeRoundTripRequest, AuthorizeRoundTripResult, RunAuthorizeRoundTrip};
