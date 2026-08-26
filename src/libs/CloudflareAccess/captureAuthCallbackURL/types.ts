import type {CloudflareSignInOutcome} from '@libs/CloudflareAccess/finishSignInFromURL/types';

type AuthorizedCodeExchange = {
    /** Cloudflare's single-use authorization code */
    code: string;

    /** The PKCE secret the authorize request committed to */
    codeVerifier: string;
};

/** What the callback URL turned out to be, decided synchronously at capture */
type CapturedAuthCallback = {
    outcome: CloudflareSignInOutcome;
    errorMessage?: string;

    /** Set only when the callback passed every check and the exchange has been authorized but not run */
    exchange?: AuthorizedCodeExchange;
};

/** Call once, before the app's module graph is evaluated */
type CaptureCloudflareAuthCallbackURL = () => CapturedAuthCallback;

/** The result of the single capture this load performed */
type GetCapturedCloudflareAuthCallback = () => CapturedAuthCallback;

export type {AuthorizedCodeExchange, CapturedAuthCallback, CaptureCloudflareAuthCallbackURL, GetCapturedCloudflareAuthCallback};
