import type {CloudflareSignInOutcome} from '@libs/CloudflareAccess/finishSignInFromURL/types';

/** The authorization the capture phase hands to the exchange phase. Both halves are secrets */
type AuthorizedCodeExchange = {
    /** Cloudflare's single-use authorization code, read off this document's own location */
    code: string;

    /** The PKCE secret the authorize request committed to, recovered from the parked flow */
    codeVerifier: string;
};

/**
 * What the callback URL turned out to be, decided synchronously at capture. Every field is already final
 * except when an exchange is owed, which only the exchange phase can conclude.
 */
type CapturedAuthCallback = {
    outcome: CloudflareSignInOutcome;
    errorMessage?: string;

    /** Set only when the callback passed every check and the exchange has been authorized but not run */
    exchange?: AuthorizedCodeExchange;
};

/**
 * Call once, before the app's module graph is evaluated. Rewrites the URL off the redirect path and returns
 * what it found. A no-op on every load that is not the callback.
 */
type CaptureCloudflareAuthCallbackURL = () => CapturedAuthCallback;

/** The result of the single capture this load performed, for the exchange phase that runs later */
type GetCapturedCloudflareAuthCallback = () => CapturedAuthCallback;

export type {AuthorizedCodeExchange, CapturedAuthCallback, CaptureCloudflareAuthCallbackURL, GetCapturedCloudflareAuthCallback};
