type CloudflareSignInOutcome =
    /** Every normal boot, every native boot, and every boot without QA auth configured */
    | 'not-a-callback'
    | 'exchanging'
    | 'invalid-callback'
    | 'provider-error'
    /** No stored flow in this tab: a replayed callback URL, or one opened in a different tab */
    | 'no-pending-flow';

/** Call once during boot, before any render */
type FinishCloudflareSignInFromURL = () => CloudflareSignInOutcome;

export type {CloudflareSignInOutcome, FinishCloudflareSignInFromURL};
