import type {AuthorizationCodeExchange} from '@libs/CloudflareAccess/OAuthClient';

type AuthorizeRoundTripResult =
    /** The callback passed every check; the caller runs the exchange */
    | {outcome: 'exchange'; exchange: AuthorizationCodeExchange}

    /** The user closed the browser without authorizing, or on web went Back to the app before the callback */
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
 * Web settles this only as `cancelled`, when Back restores the page: otherwise the page navigates away and the
 * callback arrives as a fresh load, handled by the boot-time capture phase. Native resolves with the parsed callback.
 */
type RunAuthorizeRoundTrip = (request: AuthorizeRoundTripRequest) => Promise<AuthorizeRoundTripResult>;

export type {AuthorizeRoundTripRequest, AuthorizeRoundTripResult, RunAuthorizeRoundTrip};
