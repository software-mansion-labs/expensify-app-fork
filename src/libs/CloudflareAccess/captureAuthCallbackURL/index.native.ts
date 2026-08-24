import type {CaptureCloudflareAuthCallbackURL, GetCapturedCloudflareAuthCallback} from './types';

/** Native: nothing to capture. Receiving the callback needs claimed Universal/App Links, not set up yet */
const captureCloudflareAuthCallbackURL: CaptureCloudflareAuthCallbackURL = () => ({outcome: 'not-a-callback'});

const getCapturedCloudflareAuthCallback: GetCapturedCloudflareAuthCallback = () => ({outcome: 'not-a-callback'});

export {captureCloudflareAuthCallbackURL, getCapturedCloudflareAuthCallback};
