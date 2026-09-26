import type {CloudflareSignInOutcome} from '@libs/CloudflareAccess/captureAuthCallbackURL/types';

/** Call once during boot, before any render */
type FinishCloudflareSignInFromURL = () => CloudflareSignInOutcome;

export default FinishCloudflareSignInFromURL;
