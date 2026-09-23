/**
 * `reauth-required` is reachable on native only: web never returns from a sign-in, because the page leaves
 * for Cloudflare and the callback arrives as a fresh load.
 */
type QAAuthGateResult = 'ready' | 'reauth-required';

type EnsureQAAuthenticated = (command?: string) => Promise<QAAuthGateResult>;

type HandleQAReauthRequired = (command?: string) => void;

export type {EnsureQAAuthenticated, HandleQAReauthRequired, QAAuthGateResult};
