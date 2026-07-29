# Web POC — Detailed Implementation Plan

Concretization of `Web_POC_Plan.md` (which explains the *why* behind every choice below; findings live in `Web_POC.md`; the popup-transport library's usage rules, internals, and version-pinning risks live in `Web_POC_ExpoWebBrowser.md`). This doc is the file-by-file execution order: every file to create or modify, with anchors, code sketches, and the test shapes. Line numbers are approximate — the quoted anchor text is authoritative.

Sketches are guidance, not gospel: signatures and control flow are load-bearing, variable names and formatting are not.

**Revised Jul 27 (review round 2).** Headline changes from the previous revision: PKCE is pre-warmed on menu mount so the click → `window.open` path has zero awaits; config no longer normalizes `''` into `'/'`; OAuth `resource` uses the origin form the registration was verified with; terminal refresh failures (`invalid_grant`) clear the session instead of dead-ending re-auth; a second 401 after refresh throws the re-auth error instead of a generic one; `HttpUtils`' parsed-response stage is hoisted so the retry can't double-fire its `alert()`/`alertUser()` side effects (the earlier claim that stage was pure was wrong); the probe wraps its whole flow in try/catch; `pkce.ts` reuses `src/utils/Base64URL.ts`; the regeneration-guard test is deterministic; language keys go into **all** locale files (they're strictly typed against `en`); the TestTool buttons get ready/busy gating.

**Revised Jul 27 (review round 3).** PKCE preparation is single-flight and re-warms *inside* the auth flow's settlement, so the busy UI can't release into an unprepared press — and the inline-generation fallback is gone (a missing pair fails fast instead of racing the popup blocker). `refreshCfSession` returns a discriminated result and **throws** transient failures — a network blip no longer reads as "re-auth required" — and a malformed 2xx on refresh is terminal (CF has already rotated by then). A second 401 now also *drops* the rejected session (token-guarded) so the next press reaches the popup branch instead of looping refresh → retry → 401. Clear shares one busy flag with Run, awaits its Onyx write, is no longer gated on PKCE readiness, and prepare failures surface as an error result instead of a forever-disabled button. Callback validation checks `state` before reading `error`/`code`; the token response must carry `token_type: bearer` (requests hardcode the Bearer scheme). `isQAServerRequest` requires the full validated config (https API origin, bare-hostname team domain) so partial or http configs attach nothing. New tests: OAuth request construction, the probe decision tree, `alertUser()`-fires-once on retry, behavioral export removal of `cfSession`, and a native import-safety smoke test. The final gate is `npm run typecheck` (tsc), not only tsgo.

## Step 0 — Env plumbing

### 0.1 `.env` (local only, gitignored — verified `/.env` in `.gitignore`)

```bash
QA_EXPENSIFY_URL=https://<worker-host>/
QA_CF_TEAM_DOMAIN=<team>.cloudflareaccess.com
QA_CF_OAUTH_CLIENT_ID=<client_id>
```

Real values come from the `Web_POC.md` §4 artifacts table. Restart `npm run web` after editing — rsbuild inlines the parsed `.env` at startup.

### 0.2 `.env.example` (committed) — append after the `USE_WEB_PROXY=false` block

```bash
# QA server auth POC — values are distributed privately, ask Sesha for the .env
QA_EXPENSIFY_URL=
QA_CF_TEAM_DOMAIN=
QA_CF_OAUTH_CLIENT_ID=
```

### 0.3 `src/CONFIG.ts` — modify

Module level, next to the other `get(Config, …)` reads (anchor: `const useWebProxy = get(Config, 'USE_WEB_PROXY', 'true') === 'true';`):

```typescript
const qaExpensifyURL = get(Config, 'QA_EXPENSIFY_URL', '');
```

Inside the exported object (anchor: after the `IS_HYBRID_APP` entry):

```typescript
QA_AUTH: {
    // '' is the "not configured" sentinel — normalize the slash only on non-empty values,
    // because addTrailingForwardSlash('') returns '/' and would make a partial config look configured
    API_ROOT: qaExpensifyURL ? addTrailingForwardSlash(qaExpensifyURL) : '',
    TEAM_DOMAIN: get(Config, 'QA_CF_TEAM_DOMAIN', ''),
    CLIENT_ID: get(Config, 'QA_CF_OAUTH_CLIENT_ID', ''),
},
```

## Step 1 — Types, Onyx key, export classification, error constant

### 1.1 `src/types/onyx/CloudflareSession.ts` — new

```typescript
/** OAuth session for the Cloudflare Access-protected QA server (POC — see Web_POC.md) */
type CloudflareSession = {
    /** Opaque `oauth:…` bearer token, ≈15 min lifetime */
    accessToken: string;

    /** Rotates on every refresh — must always be persisted atomically together with accessToken */
    refreshToken: string;

    /** Epoch ms when accessToken expires (computed from the token response's expires_in at issue time) */
    expiresAt: number;
};

export default CloudflareSession;
```

### 1.2 `src/types/onyx/index.ts` — modify

Alphabetical insertion in both blocks (pattern: `import type Session from './Session';` at ≈line 173 and `Session,` in the export list at ≈line 334):

```typescript
import type CloudflareSession from './CloudflareSession';
// …and `CloudflareSession,` in the export type block
```

### 1.3 `src/ONYXKEYS.ts` — modify (two places)

Key, right after the staging-server key (anchor: `SHOULD_USE_STAGING_SERVER: 'shouldUseStagingServer',` ≈line 569):

```typescript
/** OAuth session for the Cloudflare Access-protected QA server (POC) */
CF_SESSION: 'cfSession',
```

Values-type entry (anchor: `[ONYXKEYS.SHOULD_USE_STAGING_SERVER]: boolean;` ≈line 1661):

```typescript
[ONYXKEYS.CF_SESSION]: OnyxTypes.CloudflareSession;
```

### 1.4 `src/libs/ExportOnyxState/common.ts` + its test — modify (both CI-mandatory)

Add to `onyxKeysToRemove` (anchor: the `ONYXKEYS.MAPBOX_ACCESS_TOKEN` entry and its comment, ≈line 32):

```typescript
// Same story as MAPBOX_ACCESS_TOKEN: the secrets sit in fields maskFragileData doesn't key on
ONYXKEYS.CF_SESSION,
```

The coverage test in `tests/unit/ExportOnyxStateTest.ts` derives its buckets from this file, so the bucket entry alone keeps CI green — but that only proves the key is *categorized*, not that it's categorized *correctly*. Also add `CF_SESSION` to the test's "known-sensitive keys must never be classified as safe" list (≈line 342): that assertion is what pins the removal if someone later re-buckets the key. Treat it as part of this step, not optional.

### 1.5 `src/CONST/index.ts` — modify (two entries)

`HTTP_STATUS` block (≈line 2475) has no 401 today — add it:

```typescript
UNAUTHORIZED: 401,
```

New error constant in the `ERROR` block right below (anchor: `FAILED_TO_FETCH: 'Failed to fetch',` ≈line 2488):

```typescript
CF_REAUTH_REQUIRED: 'Cloudflare re-authentication required',
```

The error string is the distinct rejection `HttpUtils` throws when a silent refresh can't rescue a QA 401 (Step 4) — callers match on it to decide about UI. *(Delta vs the high-level plan: it didn't list `CONST/index.ts`; the repo convention is that `HttpsError` messages come from `CONST.ERROR` and status codes from `CONST.HTTP_STATUS`, so both land there rather than in a POC module.)*

## Step 2 — Protocol library: `src/libs/CloudflareOAuth/` (new directory, pure, no Onyx)

### 2.1 `config.ts`

```typescript
import CONFIG from '@src/CONFIG';

// Bare hostname only — TEAM_DOMAIN is interpolated into the endpoint URLs below, so a value
// carrying a scheme, slash, or other URL junk must fail closed instead of building a bogus origin.
// Deliberately not pinned to *.cloudflareaccess.com: Zero Trust orgs can front Access with a custom domain.
const TEAM_DOMAIN_SHAPE = /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;

/**
 * Full-config gate and the enforcement point for the "https only" claim: all three values present,
 * the API root parses as an https URL, the team domain is a plausible bare hostname. Anything less
 * counts as not configured — no bearer attachment, no flow, no UI.
 */
function isQAAuthConfigured(): boolean {
    const {API_ROOT, TEAM_DOMAIN, CLIENT_ID} = CONFIG.QA_AUTH;
    if (!API_ROOT || !CLIENT_ID || !TEAM_DOMAIN_SHAPE.test(TEAM_DOMAIN)) {
        return false;
    }
    try {
        return new URL(API_ROOT).protocol === 'https:';
    } catch {
        return false;
    }
}

/** Exact-origin comparison: catches lookalike hosts, http downgrades, and port tricks in one check */
function isQAServerRequest(url: string): boolean {
    // Gate on the FULL validated config, not just API_ROOT: a partially configured clone (or an
    // http-misconfigured one) must attach nothing, ever — e.g. a session persisted under an earlier
    // complete config must not ride along once the auth half of the config is gone.
    if (!isQAAuthConfigured()) {
        return false;
    }
    try {
        return new URL(url).origin === new URL(CONFIG.QA_AUTH.API_ROOT).origin;
    } catch {
        return false;
    }
}

/**
 * RFC 8707 resource indicator. Derived from API_ROOT rather than configured separately, and in
 * origin form (no trailing slash) — that's the exact value the client registration and the
 * end-to-end token flow were verified with (Web_POC.md §4). Only reachable from flow code that
 * already passed isQAAuthConfigured(), so the URL constructor can't throw here.
 */
function getQAResource(): string {
    return new URL(CONFIG.QA_AUTH.API_ROOT).origin;
}

function getAuthorizationEndpoint(): string {
    return `https://${CONFIG.QA_AUTH.TEAM_DOMAIN}/cdn-cgi/access/oauth/authorization`;
}

function getTokenEndpoint(): string {
    return `https://${CONFIG.QA_AUTH.TEAM_DOMAIN}/cdn-cgi/access/oauth/token`;
}

/**
 * Only ever called from the web-only auth flow. The `window` reference is inside a function body,
 * so importing this module on native (HttpUtils imports it everywhere) stays safe — split into
 * getOAuthRedirectURI/index.native.ts when the native transport lands.
 */
function getOAuthRedirectURI(): string {
    return `${window.location.origin}/oauth/callback`;
}
```

Exports: all of the above (named). No values at module scope beyond imports — nothing touches `window` at import time.

### 2.2 `getWebCrypto/` — `types.ts`, `index.ts`, `index.native.ts`

Implementations verbatim from `Web_POC.md` §2.1, plus the shared contract the repo's platform-split modules use (same pattern as `asyncOpenURL/types.ts`):

```typescript
// getWebCrypto/types.ts
type WebCryptoProvider = {
    getRandomValues: (array: Uint8Array) => Uint8Array;
    sha256: (data: ArrayBuffer) => Promise<ArrayBuffer>;
};
export default WebCryptoProvider;
```

Both `index.ts` (browser built-ins) and `index.native.ts` annotate their default export with it. The native side throws **inside** the functions (`throw new Error('CloudflareOAuth crypto is not implemented on native yet');`), never at import time — native does import this graph (Step 6's component → probe → session → pkce), it just must never call it.

### 2.3 `pkce.ts`

Reuses the existing `src/utils/Base64URL.ts` (Buffer-backed via the `buffer` npm package — already exercised on web by the WebAuthn flows, and available in Jest) instead of hand-rolling an encoder.

```typescript
import Base64URL from '@src/utils/Base64URL';

import getWebCrypto from './getWebCrypto';

type PKCEPair = {codeVerifier: string; codeChallenge: string};

function generateState(): string {
    return Base64URL.encode(getWebCrypto.getRandomValues(new Uint8Array(16)));
}

/** Exposed separately so the RFC 7636 test vector can exercise it with a fixed verifier */
async function computeCodeChallenge(codeVerifier: string): Promise<string> {
    const digest = await getWebCrypto.sha256(new TextEncoder().encode(codeVerifier).buffer as ArrayBuffer);
    return Base64URL.encode(new Uint8Array(digest));
}

async function generatePKCEPair(): Promise<PKCEPair> {
    // Regenerate until the challenge starts with [a-zA-Z0-9] — CF's parser chokes on a leading - or _
    // (Web_POC.md §3.3). 2 of the 64 base64url alphabet chars are bad → 1/32 discard chance per round.
    let codeVerifier: string;
    let codeChallenge: string;
    do {
        codeVerifier = Base64URL.encode(getWebCrypto.getRandomValues(new Uint8Array(32))); // 43 chars
        codeChallenge = await computeCodeChallenge(codeVerifier);
    } while (!/^[a-zA-Z0-9]/.test(codeChallenge));
    return {codeVerifier, codeChallenge};
}
```

### 2.4 `oauthClient.ts`

Plain `fetch` (deliberately not `HttpUtils` — token calls must never carry the QA bearer). All bodies `application/x-www-form-urlencoded` via `URLSearchParams`. The token endpoint is an external API boundary, so responses are parsed as `unknown` and every field that changes client behavior is validated (`isRecord` from `@libs/ObjectUtils`) — including `token_type`, because `HttpUtils` hardcodes the `Bearer` scheme, so a non-bearer answer would mean sending the wrong header. Deliberately *not* asserted: `scope` and the `resource` echo — nothing reads them, so checking them is noise. Exports: all four functions **plus `OAuthError`** (the session action matches on it) — and `pkce.ts` exports the `PKCEPair` type alongside its functions.

```typescript
import {isRecord} from '@libs/ObjectUtils';
import type CloudflareSession from '@src/types/onyx/CloudflareSession';

/** Carries the RFC 6749 §5.2 error code so callers can tell terminal failures (invalid_grant) from transient ones */
class OAuthError extends Error {
    constructor(
        readonly code: string,
        message?: string,
    ) {
        super(message ?? code);
    }
}

async function postTokenEndpoint(params: URLSearchParams): Promise<CloudflareSession> {
    // credentials: 'omit' for the same reason HttpUtils sets it (see the comment there) — token calls
    // must stand on the OAuth params alone, never on ambient team-domain cookies
    const response = await fetch(getTokenEndpoint(), {method: 'POST', body: params, credentials: 'omit'});
    const json: unknown = await response.json().catch(() => null);
    if (!response.ok) {
        const code = isRecord(json) && typeof json.error === 'string' ? json.error : String(response.status);
        const description = isRecord(json) && typeof json.error_description === 'string' ? json.error_description : undefined;
        throw new OAuthError(code, description);
    }
    if (
        !isRecord(json) ||
        typeof json.access_token !== 'string' ||
        !json.access_token ||
        typeof json.refresh_token !== 'string' ||
        !json.refresh_token ||
        typeof json.expires_in !== 'number' ||
        json.expires_in <= 0 ||
        typeof json.token_type !== 'string' ||
        json.token_type.toLowerCase() !== 'bearer'
    ) {
        // A 2xx with a malformed body must not become a broken persisted session
        throw new OAuthError('invalid_response');
    }
    return {accessToken: json.access_token, refreshToken: json.refresh_token, expiresAt: Date.now() + json.expires_in * 1000};
}

function buildAuthorizeURL({state, codeChallenge}: {state: string; codeChallenge: string}): string {
    // response_type=code, client_id, redirect_uri (getOAuthRedirectURI()), state,
    // code_challenge, code_challenge_method=S256, resource=getQAResource()  ← RFC 8707, origin form
}

function exchangeCode({code, codeVerifier}: {code: string; codeVerifier: string}): Promise<CloudflareSession> {
    // postTokenEndpoint: grant_type=authorization_code, code, code_verifier,
    // redirect_uri (must byte-match the authorize request), client_id, resource=getQAResource()
}

function refreshTokens(refreshToken: string): Promise<CloudflareSession> {
    // postTokenEndpoint: grant_type=refresh_token, refresh_token, client_id — no resource (verified)
}
```

### 2.5 `popupCompletionRecovery.ts` — the recovery channel for openerless popups (added after live testing)

Found live (Jul 27): the popup's `window.opener` can come back **severed** after the Cloudflare redirect chain. `maybeCompleteAuthSession()` then posts its completion message into the void and `openAuthSessionAsync` hangs forever — the user sees an endless spinner. The recovery rides the lib's own internal handshake: the completion URL is written to localStorage **before** the postMessage (to the key `ExpoWebBrowser_OriginUrl_<handle>`, where the handle is our own OAuth `state`), and localStorage is shared same-origin regardless of opener health. The full walkthrough of that handshake — key names, write ordering, why the lib's built-in fallbacks don't fire on web, what severs openers — plus the version-pinning risk table and upgrade checklist live in `Web_POC_ExpoWebBrowser.md` §3–§5; treat that doc as the reference when touching this file or bumping the package.

The key names and ordering are private implementation details of `expo-web-browser@56.0.5`, not public API — version-pinned risk, accepted for a POC and pinned by the unit tests (7.1/7.2), so an expo upgrade that reshapes the handshake fails loudly instead of hanging quietly.

```typescript
// Expo's protocol constants (pinned against expo-web-browser@56.0.5's web implementation)
const EXPO_SESSION_HANDLE_KEY = 'ExpoWebBrowserRedirectHandle';
const EXPO_ORIGIN_URL_KEY_PREFIX = 'ExpoWebBrowser_OriginUrl_';

/**
 * Opener side: resolves with the callback URL when the popup's breadcrumb appears —
 * storage event for writes after attach, plus a 1 s poll for one written before it.
 * Returns {completion, stop}; the caller races `completion` against openAuthSessionAsync
 * and calls `stop()` in a finally.
 */
function watchForSeveredOpenerCompletion(state: string): SeveredOpenerWatcher {}

/**
 * Popup side, called from App.tsx module scope right after maybeCompleteAuthSession().
 * Closes the popup its opener can no longer close. Every gate must pass:
 * on the callback path + completion breadcrumb published + opener actually gone + QA configured.
 * "Never close the main window" is the invariant the gates encode.
 */
function closeQAAuthPopupIfSeveredOpener(): void {}
```

Call-site change in **`src/App.tsx`** — one line under the existing module-scope `maybeCompleteAuthSession()`: `closeQAAuthPopupIfSeveredOpener()`. No-op in the main window (wrong path), on native (`hasWebStorage` guard), and on clones without the `.env` (config gate).

## Step 3 — Session action: `src/libs/actions/CloudflareSession.ts` (new; never imports HttpUtils)

`NetworkStore.ts` is the pattern for the hydration handshake (`undefined` = not read yet, `null` = read + absent):

```typescript
let cfSession: CloudflareSession | null | undefined;
let resolveHydration: () => void;
const hydrationPromise = new Promise<void>((resolve) => {
    resolveHydration = resolve;
});

Onyx.connectWithoutView({
    key: ONYXKEYS.CF_SESSION,
    callback: (value) => {
        cfSession = value ?? null;
        resolveHydration();
    },
});

function getCfSession(): CloudflareSession | null | undefined { return cfSession; }
function waitForCfSessionHydration(): Promise<void> { return hydrationPromise; }
function isSessionNearExpiry(session: CloudflareSession): boolean { return session.expiresAt - Date.now() < ACCESS_TOKEN_EXPIRY_BUFFER_MS; } // 60_000, named module const
```

Pre-warming — the load-bearing piece of the user-activation story. Browsers (Safari strictest) can void transient activation across `await` boundaries, and the repo already works around exactly this in `asyncOpenURL/index.web.ts` by pre-opening windows. Instead of pre-opening, we remove every await from the click path: the PKCE pair is generated when the menu mounts, so the press consumes a ready value and `openAuthSessionAsync` — whose `window.open` runs synchronously at the top of the call (verified in the installed `expo-web-browser@56.0.5` source) — fires within the activation.

```typescript
let preparedPKCE: PKCEPair | null = null;
let pkcePreparePromise: Promise<void> | null = null;

/** Single-flight: concurrent callers (mount effect + post-flow re-warm) share one generation */
function ensurePreparedPKCEPair(): Promise<void> {
    if (preparedPKCE) {
        return Promise.resolve();
    }
    pkcePreparePromise ??= generatePKCEPair()
        .then((pair) => {
            preparedPKCE = pair;
        })
        .finally(() => {
            pkcePreparePromise = null;
        });
    return pkcePreparePromise;
}

/** TestToolMenu calls this on mount (web only); the Run button stays disabled until it resolves */
function prepareQAAuthFlow(): Promise<void> {
    return Promise.all([waitForCfSessionHydration(), ensurePreparedPKCEPair()]).then(() => undefined);
}
```

Auth flow — single-flight; zero awaits before the popup, and the *next* press is covered too: the pair is re-warmed **inside** the flow's settlement (`finally` waits on the returned promise), so the busy UI can't re-enable the button before a fresh pair exists. There is deliberately **no inline-generation fallback** — an `await` between press and `window.open` is the exact activation-voiding failure §0 of the plan exists to prevent, so a missing pair fails fast instead (the probe surfaces it as a semantic error):

```typescript
let authFlowPromise: Promise<boolean> | null = null;

function startQAAuthFlow(): Promise<boolean> {
    authFlowPromise ??= runAuthFlow().finally(() => {
        authFlowPromise = null;
        // Re-warm before the flow settles; swallow re-warm failures (they must not veto a
        // successful auth) — a later press then fails fast in runAuthFlow below.
        return ensurePreparedPKCEPair().catch(() => undefined);
    });
    return authFlowPromise;
}

async function runAuthFlow(): Promise<boolean> {
    const pkce = preparedPKCE;
    preparedPKCE = null;
    if (!pkce) {
        throw new Error('PKCE pair is not pre-warmed — prepareQAAuthFlow() must resolve before the auth flow starts');
    }
    const state = generateState(); // synchronous — still zero awaits before the popup
    // A severed opener posts the completion into the void and openAuthSessionAsync hangs forever
    // (verified live — Web_POC.md §5.4). Race it against the popup's localStorage breadcrumb.
    const fallback = watchForSeveredOpenerCompletion(state);
    let result: WebBrowserAuthSessionResult | AuthSessionCompletion;
    try {
        result = await Promise.race([openAuthSessionAsync(buildAuthorizeURL({state, codeChallenge: pkce.codeChallenge}), getOAuthRedirectURI()), fallback.completion]);
    } finally {
        fallback.stop();
    }
    if (result.type !== 'success') {
        return false; // cancelled/dismissed — semantic result, not an exception
    }
    // When the fallback won, expo's session is still dangling: dismissAuthSession() closes the popup
    // where the handle still works and clears the localStorage handles either way. No-op after a
    // normal completion.
    dismissAuthSession();
    // Expo's own localStorage-handle check is NOT state validation (the popup shares localStorage).
    // State first: a callback that fails provenance is discarded wholesale — its error/code params
    // are untrusted data and must not be interpreted at all.
    const params = new URL(result.url).searchParams;
    if (params.get('state') !== state) {
        throw new Error('OAuth callback state mismatch');
    }
    const oauthError = params.get('error');
    if (oauthError) {
        throw new OAuthError(oauthError, params.get('error_description') ?? undefined); // e.g. access_denied — never exchange
    }
    const code = params.get('code');
    if (!code) {
        throw new Error('OAuth callback is missing the authorization code');
    }
    const session = await exchangeCode({code, codeVerifier: pkce.codeVerifier});
    cfSession = session; // cache first: an immediate retry must see the token before disk I/O settles
    await Onyx.set(ONYXKEYS.CF_SESSION, session);
    return true;
}
```

If that final `Onyx.set` rejects (storage quota etc.), the flow rejects while the cache keeps the fresh session — deliberate, not an oversight: the session is real and usable for this tab, a rollback would discard a working credential because *disk* failed, and the divergence is self-limiting (reload → no persisted session → re-auth).

Refresh — single-flight first, staleness shortcut only when idle. The result is a **discriminated union, not a boolean**: "the session is dead, re-authenticate" and "the network hiccuped, the session is fine" are incompatible outcomes that the previous boolean collapsed — terminal failures resolve `'reauth-required'` (after clearing the session), transient ones **throw** so callers see an ordinary failure:

```typescript
type CfRefreshResult = 'refreshed' | 'skipped-newer-token' | 'reauth-required';

let refreshPromise: Promise<CfRefreshResult> | null = null;

function refreshCfSession(staleAccessToken?: string): Promise<CfRefreshResult> {
    // Join any in-flight refresh before the staleness shortcut — its resolution already
    // guarantees the rotated pair hit Onyx, so late 401 callers can't race ahead of persistence
    if (refreshPromise) {
        return refreshPromise;
    }
    const current = cfSession;
    if (!current?.refreshToken) {
        return Promise.resolve('reauth-required');
    }
    // Rotation already completed while this caller's request was in flight — retry with the new token
    if (staleAccessToken && current.accessToken !== staleAccessToken) {
        return Promise.resolve('skipped-newer-token');
    }
    refreshPromise = refreshTokens(current.refreshToken)
        .then((session) => {
            cfSession = session;
            return Onyx.set(ONYXKEYS.CF_SESSION, session).then((): CfRefreshResult => 'refreshed');
        })
        .catch((error): Promise<CfRefreshResult> => {
            if (error instanceof OAuthError && (error.code === 'invalid_grant' || error.code === 'invalid_response')) {
                // invalid_grant: the refresh token is spent/revoked. invalid_response: a 2xx arrived,
                // so CF already rotated — the old token is dead even though the new one was unreadable.
                // Either way this stored session can never refresh again; keeping it would trap every
                // future press in the retry-refresh branch, never reaching the no-session popup branch.
                return clearCfSession().then(() => 'reauth-required');
            }
            throw error; // transient (network, 5xx) — session kept, callers see the real failure
        })
        .finally(() => {
            refreshPromise = null;
        });
    return refreshPromise;
}

function clearCfSession(): Promise<void> {
    cfSession = null; // synchronous — a probe right after Clear must not read the dead session
    return Onyx.set(ONYXKEYS.CF_SESSION, null);
}

/**
 * A 401 for a freshly refreshed token means the session is broken in a way refresh can't fix.
 * Drop it so the next press reaches the popup branch — guarded on the rejected token, so a newer
 * session established concurrently is never collateral damage. HttpUtils calls this (Step 4).
 */
function markCfSessionRejected(rejectedAccessToken: string): Promise<void> {
    if (cfSession?.accessToken !== rejectedAccessToken) {
        return Promise.resolve();
    }
    return clearCfSession();
}
```

Accepted papercut, worth its comment: a network failure can land *after* CF already processed the rotation (response lost in transit). The kept session then fails its next refresh with `invalid_grant`, which clears it — one wasted press, self-healing, not a dead end.

Sign-out hook — cache only. Nulling the in-flight promise refs would not cancel the underlying work but *would* let a second flight start and overlap the first. A refresh/exchange landing after logout and re-writing the key remains the known, accepted POC race (`Web_POC_Plan.md` §7):

```typescript
registerSessionCleanupCallback(() => {
    cfSession = null;
});
```

## Step 4 — `src/libs/HttpUtils.ts` — modify

Imports: `isQAServerRequest` from `./CloudflareOAuth/config`, `{getCfSession, refreshCfSession, markCfSessionRejected}` from `./actions/CloudflareSession`. (Direction check: session action → oauthClient → config; nothing imports back into HttpUtils — the probe lives elsewhere.)

`processHTTPRequest` gains a trailing `isQARetry = false` parameter and three changes:

1. Before the `fetch` call:

```typescript
const qaAccessToken = isQAServerRequest(url) ? (getCfSession()?.accessToken ?? null) : null;
```

2. In the `fetch` init (anchor: `credentials: 'omit',`):

```typescript
headers: qaAccessToken ? {Authorization: `Bearer ${qaAccessToken}`} : undefined,
credentials: 'omit', // untouched
```

3. Restructure the response handling. First hoist the current parsed-response stage (the third `.then`, ≈lines 148–189: `jsonCode` checks, `alert('Too many auth writes', …)`, `alertUser()`) into a module-level `processJSONResponse<TKey>(response: Response<TKey>): Response<TKey>` helper. That stage is **not** pure — it fires `alert()` and the update-required modal — so the retried response must flow through it exactly once, inside the recursive call, never again in the outer chain. *(Corrects the previous revision of this doc, which claimed those checks were pure.)* Then the ok-check `.then` becomes:

```typescript
if (response.status === CONST.HTTP_STATUS.UNAUTHORIZED && qaAccessToken) {
    if (isQARetry) {
        // The freshly refreshed token still gets 401 — refresh can't fix this session. Drop it
        // (token-guarded, cache clears synchronously) so the next press reaches the popup branch
        // instead of looping refresh → retry → 401 forever, then surface re-auth.
        void markCfSessionRejected(qaAccessToken);
        throw new HttpsError({message: CONST.ERROR.CF_REAUTH_REQUIRED, status: '401'});
    }
    return refreshCfSession(qaAccessToken).then((refreshResult) => {
        if (refreshResult === 'reauth-required') {
            throw new HttpsError({message: CONST.ERROR.CF_REAUTH_REQUIRED, status: '401'});
        }
        // 'refreshed' / 'skipped-newer-token' → retry with the rotated token. Transient refresh
        // failures never reach this line: refreshCfSession rethrows them, so they propagate to the
        // caller as ordinary network errors — NOT as the re-auth error (the session is still alive).
        // Already fully processed inside the recursion — must NOT pass through processJSONResponse again
        return processHTTPRequest<TKey>(url, method, body, abortSignal, true);
    });
}
if (!response.ok) {
    // …the existing serviceInterrupted / throttled / generic throws, unchanged…
}
return (response.json() as Promise<Response<TKey>>).then(processJSONResponse);
```

Remaining accepted quirk, worth a code comment: the outer `.finally(() => markAppStartupNetworkRequestEnd(command))` also runs for the recursion's own chain — it no-ops for the untracked `CloudflareAuthProbe` command, and the probe path deliberately avoids `OpenApp` so the `addSkewList` time-skew logic never sees the mock's `Date` header.

Non-QA requests: `qaAccessToken` is `null`, every insertion is inert — behavior byte-identical to today (the hoisted helper is called in exactly the place the inline code sat).

## Step 5 — Probe action: `src/libs/actions/CloudflareProbe.ts` (new; the only module importing both HttpUtils and the session)

The whole flow sits inside try/catch: popup failures, state mismatches, and exchange errors become semantic results, not unhandled rejections (the UI consumes the result with `.then` only). `detail` is raw diagnostic output (Worker echo / error text) — deliberately untranslated, same treatment as raw server errors elsewhere in the app.

```typescript
type QAProbeStatus = 'success' | 'cancelled' | 'reauthRequired' | 'error';
type QAProbeResult = {status: QAProbeStatus; detail?: string};

async function runQAProbe(): Promise<QAProbeResult> {
    try {
        // No awaits before the popup branch: TestToolMenu keeps the button disabled until
        // prepareQAAuthFlow() resolved, so the cache is hydrated and PKCE is pre-warmed
        const session = getCfSession();
        if (!session) {
            const didAuthenticate = await startQAAuthFlow(); // window.open fires synchronously inside
            if (!didAuthenticate) {
                return {status: 'cancelled'};
            }
        } else if (isSessionNearExpiry(session)) {
            // Transient refresh failures throw and land in the catch below as a plain 'error' —
            // the session is kept, so "try again" is honest advice there
            const refreshResult = await refreshCfSession();
            if (refreshResult === 'reauth-required') {
                // Terminal failure already cleared the session. Deliberately no popup from here — the
                // failed round trip consumed the user activation; the NEXT press lands in the popup branch
                return {status: 'reauthRequired'};
            }
        }
        const response = await HttpUtils.processHTTPRequest(`${CONFIG.QA_AUTH.API_ROOT}api/CloudflareAuthProbe`, CONST.NETWORK.METHOD.POST);
        const {authenticatedVia} = response as unknown as {authenticatedVia?: string}; // mock Worker echo — POC-only loose read
        return {status: 'success', detail: `authenticatedVia: ${authenticatedVia ?? 'null'}`};
    } catch (error) {
        if (error instanceof Error && error.message === CONST.ERROR.CF_REAUTH_REQUIRED) {
            // Whoever threw this already dropped the dead session (terminal refresh inside
            // refreshCfSession, or the double-401 path via markCfSessionRejected)
            return {status: 'reauthRequired'};
        }
        return {status: 'error', detail: error instanceof Error ? error.message : undefined};
    }
}
```

## Step 6 — UI + strings

### 6.1 `src/components/TestToolMenu.tsx` — modify

Anchor: insert right after the staging-server `TestToolRow` block (`{!CONFIG.IS_USING_LOCAL_WEB && (…useStagingServer…)}`, ≈line 121–132). Web gate mirrors the existing branch-name row's `Platform.OS === 'web'` check in the same file.

Component state + the mount-time pre-warm (this effect is where the Step 3 user-activation story is anchored):

```tsx
const [isQAAuthReady, setIsQAAuthReady] = useState(false);
const [isQAOperationRunning, setIsQAOperationRunning] = useState(false);
const [qaProbeResult, setQAProbeResult] = useState<QAProbeResult | null>(null);

useEffect(() => {
    // The platform gate is load-bearing: on native, prepareQAAuthFlow would hit the throwing crypto stub
    if (Platform.OS !== 'web' || !isQAAuthConfigured()) {
        return;
    }
    prepareQAAuthFlow()
        .then(() => setIsQAAuthReady(true))
        // Surface preparation failures — otherwise Run just sits disabled forever with no explanation
        .catch((error: unknown) => setQAProbeResult({status: 'error', detail: error instanceof Error ? error.message : undefined}));
}, []);
```

Rows — one shared busy flag serializes Run and Clear (neither starts while the other runs, and Clear now *awaits* its Onyx write inside that window). Run is additionally gated on readiness; Clear deliberately is not — clearing needs neither hydration nor a PKCE pair, and a failed pre-warm must not lock the user out of clearing:

```tsx
{Platform.OS === 'web' && isQAAuthConfigured() && (
    <>
        {/* POC: Cloudflare Access OAuth against the QA mock Worker — see Web_POC.md */}
        <TestToolRow title={translate('initialSettingsPage.troubleshoot.qaAuth')}>
            <Button
                small
                text={translate('initialSettingsPage.troubleshoot.qaAuthRunProbe')}
                isDisabled={!isQAAuthReady || isQAOperationRunning}
                isLoading={isQAOperationRunning}
                onPress={() => {
                    setIsQAOperationRunning(true);
                    // runQAProbe never rejects — every failure comes back as a semantic result
                    runQAProbe()
                        .then(setQAProbeResult)
                        .finally(() => setIsQAOperationRunning(false));
                }}
            />
        </TestToolRow>
        <TestToolRow title={translate('initialSettingsPage.troubleshoot.qaAuthSession')}>
            <Button
                small
                text={translate('initialSettingsPage.troubleshoot.qaAuthClearSession')}
                isDisabled={isQAOperationRunning}
                onPress={() => {
                    setIsQAOperationRunning(true);
                    clearCfSession()
                        .then(() => setQAProbeResult(null))
                        .catch((error: unknown) => setQAProbeResult({status: 'error', detail: error instanceof Error ? error.message : undefined}))
                        .finally(() => setIsQAOperationRunning(false));
                }}
            />
        </TestToolRow>
        {!!qaProbeResult && (
            <Text style={styles.textLabelSupporting}>
                {translate(`initialSettingsPage.troubleshoot.${QA_PROBE_STATUS_TRANSLATION_KEYS[qaProbeResult.status]}`)}
                {qaProbeResult.detail ? ` (${qaProbeResult.detail})` : ''}
            </Text>
        )}
    </>
)}
```

`QA_PROBE_STATUS_TRANSLATION_KEYS` is a small component-local `const` mapping the four statuses to the translation keys below (statuses are semantic and translated; the raw `detail` diagnostic stays verbatim). Run the React Compiler check afterwards (component changed).

### 6.2 `src/languages/en.ts` — modify (anchor: `useStagingServer: 'Use Staging Server',` ≈line 2298)

```typescript
qaAuth: 'QA auth (Cloudflare)',
qaAuthRunProbe: 'Run probe',
qaAuthSession: 'QA auth session',
qaAuthClearSession: 'Clear session',
qaAuthStatusSuccess: 'Probe succeeded',
qaAuthStatusCancelled: 'Sign-in was cancelled',
qaAuthStatusReauthRequired: 'Session expired — run again to sign in',
qaAuthStatusError: 'Probe failed',
```

### 6.3 The nine non-English locale files — modify

`de.ts`, `es.ts`, `fr.ts`, `it.ts`, `ja.ts`, `nl.ts`, `pl.ts`, `pt-BR.ts`, `zh-hans.ts` are each typed `TranslationDeepObject<typeof en>` (no partiality), so adding keys to `en.ts` alone fails typecheck across all of them — en+es is not enough. Add the same eight keys at the same anchor in every file (e.g. `useStagingServer: 'Usar servidor "staging"',` ≈line 2088 in `es.ts`). Hand-written translations (or English values) are fine for this dev-only tool; the production path — `scripts/generateTranslations.ts`, a bun script that drives ChatGPT — needs API credentials and is overkill for a POC branch.

## Step 7 — Tests

Jest resolves `.native.ts` before `.ts` under the repo's `jest-expo` preset (its haste config is `{defaultPlatform: 'ios', platforms: ['android', 'ios', 'native']}`), so anything touching `getWebCrypto` must mock the provider. For real-crypto tests, back it with Node's WebCrypto:

```typescript
import {webcrypto} from 'node:crypto';

jest.mock('@libs/CloudflareOAuth/getWebCrypto', () => ({
    __esModule: true,
    default: {
        getRandomValues: (arr: Uint8Array) => webcrypto.getRandomValues(arr),
        sha256: (data: ArrayBuffer) => webcrypto.subtle.digest('SHA-256', data),
    },
}));
```

### 7.1 `tests/unit/CloudflareOAuthTest.ts` — new

- **RFC 7636 Appendix B vector** (pins the encoding, uses the real-crypto mock above): `computeCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')` → `'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'`.
- **Regeneration guard — deterministic**, not probabilistic (50 random runs would let a deleted guard pass ≈20% of the time: (31/32)⁵⁰). Use a controlled provider mock: `sha256` returns first a digest whose leading byte is in 248–251 (top 6 bits = 62 → first base64url char `-`; 252–255 would give 63 → `_`, also non-alphanumeric), then an alphanumeric-leading one. Assert `generatePKCEPair()` called `sha256` twice, returned the second verifier, and the challenge starts alphanumeric. One extra seeded run asserts the verifier shape (43 chars of `[A-Za-z0-9_-]`).
- **`isQAServerRequest` table** (mock `@src/CONFIG` with a complete `QA_AUTH` config, `API_ROOT = 'https://qa.example.com/'`): exact origin → true; `https://evil-qa.example.com`, `http://qa.example.com`, `https://qa.example.com:444`, `https://attacker.com/qa.example.com`, garbage string → false; unconfigured → false; **partial config in both directions** (`API_ROOT: ''` with team domain + client ID set, and `API_ROOT` set with `CLIENT_ID: ''`) → false — pins the Step 0.3 sentinel bug *and* the full-config gate; **invalid config values** (`API_ROOT: 'http://qa.example.com/'`, team domain with a scheme or slash) → `isQAAuthConfigured()` false and `isQAServerRequest` false — pins the https/hostname enforcement.
- **`oauthClient` boundary** (mock `global.fetch`): 400 `{"error":"invalid_grant"}` → rejects with `OAuthError` carrying `code === 'invalid_grant'`; 200 with `refresh_token` missing → `invalid_response`; 200 with `token_type` missing or ≠ `bearer` (case-insensitive) → `invalid_response`; happy path maps `expires_in` into a future `expiresAt`.
- **Request construction** (capture the `URLSearchParams` the fetch mock receives — responses were verified live, the *outgoing* side only has this suite): `buildAuthorizeURL` carries exactly `response_type=code`, `client_id`, `redirect_uri`, `state`, `code_challenge`, `code_challenge_method=S256`, and `resource` in origin form (no trailing slash); `exchangeCode` posts `grant_type=authorization_code` + `code` + `code_verifier` + `client_id` + `resource` + a `redirect_uri` byte-matching the authorize request's; `refreshTokens` posts `grant_type=refresh_token` + `refresh_token` + `client_id` and **omits `resource`** (the §4-verified shape).
- **Popup self-close gate table** (`closeQAAuthPopupIfSeveredOpener`, jsdom: spy `window.close`, shape the severed popup via `history.replaceState` + expo's localStorage handles): closes exactly the openerless, completed, callback-path popup; never with a live opener (the healthy channel closes it), never off the callback path (the main tab also runs this at boot — the load-bearing safety case), never before the completion breadcrumb exists (mid-flow), never unconfigured.

### 7.2 `tests/unit/CloudflareSessionTest.ts` — new (mock `oauthClient` and `expo-web-browser`; `Onyx.init` like `HttpUtilsTest`)

Refresh:

- **Single-flight**: two concurrent `refreshCfSession()` → exactly one `refreshTokens` call, both resolve `'refreshed'`.
- **In-flight join beats the staleness shortcut**: while a refresh's `Onyx.set` is intentionally held pending (deferred mock), a late `refreshCfSession(oldAccessToken)` returns the *same* promise — it must not resolve before the rotated pair is persisted.
- **Staleness shortcut when idle**: after a completed rotation, `refreshCfSession(oldAccessToken)` resolves `'skipped-newer-token'` with no network call.
- **Terminal failure clears**: `refreshTokens` rejecting with `OAuthError('invalid_grant')` → resolves `'reauth-required'`, cache and Onyx both null (the "failed refresh must not dead-end re-auth" invariant); same for `OAuthError('invalid_response')` (CF already rotated); a plain network rejection **rethrows** and the session survives — pins the terminal/transient split.
- **No refresh token** → resolves `'reauth-required'`, no network call.
- **`markCfSessionRejected`**: clears when the rejected token matches the current session; no-ops when a newer session took its place.

Auth flow (mocked `openAuthSessionAsync`):

- **Cancel**: `{type: 'dismiss'}` → resolves false, `exchangeCode` never called.
- **Cancel → immediate retry stays pre-warmed**: after the first flow settles, a second `startQAAuthFlow()` opens the popup with a *fresh* challenge and never generates a pair inside the press (the re-warm resolved before settlement — assert via provider-mock call ordering/counts). This is the readiness gap the round-3 review caught.
- **Not-pre-warmed guard**: with `preparedPKCE` empty and re-warm blocked, `startQAAuthFlow()` rejects fast and `openAuthSessionAsync` is never called (no popup-blocker roulette).
- **Prepare single-flight**: two concurrent `prepareQAAuthFlow()` → one `generatePKCEPair` call.
- **Callback validation**: state mismatch → rejects without exchanging, even when the URL *also* carries `error` or `code` (state is checked first); `error=access_denied` with a valid state → rejects without exchanging; missing `code` → rejects.
- **Single-flight**: two concurrent `startQAAuthFlow()` → one popup, both settle with the same result.
- **Persist order**: success resolves only after `Onyx.set` completed with the exchanged session.
- **Severed-opener recovery**: `openAuthSessionAsync` mocked to never settle (the reproduced hang) → dispatching the breadcrumb `StorageEvent` (`ExpoWebBrowser_OriginUrl_<state>` with the callback URL) completes the flow, exchanges the code, and calls `dismissAuthSession` to clean up the dangling expo session.
- **Poll fallback**: a breadcrumb seeded in localStorage *before* the flow starts also completes it — the storage event only fires for writes after the listener attached, so the poll is that key's only channel (real timers; costs one ≈1 s tick).
- **Native import smoke**: importing the session module resolves `getWebCrypto/index.native.ts` under this preset (see above) — assert the import itself doesn't throw. That's the "import-safe on native, throws only when called" claim, tested for free on every run.

### 7.3 `tests/unit/HttpUtilsTest.ts` — extend (existing `mockFetchResponse` style, plus mock `@libs/actions/CloudflareSession`)

- Bearer attached on the QA origin, absent on `www.expensify.com` URLs; `credentials: 'omit'` in both fetch inits.
- QA 401 → `refreshCfSession` called once with the used token → resolves `'refreshed'` → request retried exactly once with the new token (fetch mock: 401 then 200).
- QA 401 with `refreshCfSession` → `'reauth-required'` ⇒ rejects with `CONST.ERROR.CF_REAUTH_REQUIRED`, exactly one fetch (no retry).
- QA 401 with `refreshCfSession` **rejecting** (transient) ⇒ the rejection propagates as-is, **not** as `CF_REAUTH_REQUIRED` — pins the discriminated-result semantics at the consumer.
- **QA 401 → `'refreshed'` → retry also 401** ⇒ rejects with `CONST.ERROR.CF_REAUTH_REQUIRED`, exactly two fetches, one refresh, and `markCfSessionRejected` called with the retried token — pins both the "second 401 must not fall into the generic error" fix and the round-3 "drop the rejected session" fix.
- **Retry side effects fire once**: 401 → refresh → retry succeeding with a `jsonCode` that triggers `alertUser()` (`UPDATE_REQUIRED`) ⇒ the mocked alert fires exactly once. The hoist makes this structural, but the test pins it against a future refactor un-hoisting it.
- Non-QA 401 → today's generic error path, `refreshCfSession` never called.

*(The "N parallel 401s → one refresh" invariant is proven in 7.2 where the single-flight actually lives; 7.3 mocks the session action, so duplicating it there would test the mock.)*

### 7.4 `tests/unit/CloudflareProbeTest.ts` — new (mock the session action and `HttpUtils`; the readiness/busy logic is load-bearing now, so the decision tree gets its own suite)

- No session → `startQAAuthFlow` called, then the probe request → `{status: 'success', detail: 'authenticatedVia: …'}`.
- Auth flow resolves false (cancel) → `{status: 'cancelled'}`, no request fired.
- Near-expiry session + refresh `'reauth-required'` → `{status: 'reauthRequired'}`, **no popup and no request** — the "background code never opens UI" rule.
- Near-expiry session + refresh rejecting (transient) → `{status: 'error'}` with the failure detail, session untouched.
- Request rejecting with `CONST.ERROR.CF_REAUTH_REQUIRED` → `{status: 'reauthRequired'}`.
- Auth flow rejecting (state mismatch / blocked popup) → `{status: 'error'}` — nothing escapes as an unhandled rejection.

Deliberately still no RTL test for `TestToolMenu` itself: the logic worth pinning lives in the probe/session modules above; a menu test would assert prop wiring on a dev-only screen through heavy provider mocking, and every manual stage exercises that wiring live.

### 7.5 `tests/unit/ExportOnyxStateTest.ts` — extend (same file as the 1.4 classification entry)

One behavioral case beyond the classification lists: run the export/masking path over a state containing a populated `cfSession` and assert the key is **absent from the output**. The known-sensitive list only proves the key isn't classified as safe; this proves the removal actually happens.

## Step 8 — Checks and manual verification

After each step: `npm run fmt`, `npm run lint-changed`; after type-bearing steps (1, 2, 3): `npm run typecheck-tsgo` (Step 6 too — the locale files are type-checked against `en`); after Step 6: `npm run react-compiler-compliance-check check-changed`. Tests: `npm run test -- CloudflareOAuth CloudflareSession CloudflareProbe HttpUtils ExportOnyxState`. Before declaring done: one full `npm run typecheck` — tsgo is the fast dev loop, but tsc is what CI gates on (CLAUDE.md), and they occasionally disagree.

Manual stages 2–5 run exactly as written in `Web_POC_Plan.md` §3 (happy path with the pre-warmed popup-from-press, silent refresh, DevTools negative checks, real sign-out). Reminder from §4 there: the dev server must actually be on `:8082`. Since the §2.5 fallback: a popup that comes back openerless (live this hung the probe on an endless spinner) must still complete the probe within about a second and close itself; `gib.js` / push-notification-chunk console errors inside the popup are known cosmetics of the short-lived boot, not failures.

## Explicitly unchanged (so nobody "fixes" these)

- **`src/ROUTES.ts` / `src/SCREENS.ts` / linking config** — no `/oauth/callback` route. The popup boots the app, `maybeCompleteAuthSession()` (already at `App.tsx` module scope) posts the URL to the opener, and the opener closes the popup; the router may flash `/not-found` inside the popup for a moment, which is acceptable POC noise. Route interception matters only for the deferred full-page-redirect fallback (`Web_POC_Plan.md` §7).
- **`src/libs/ApiUtils.ts`** — no global API-root switch against a mock backend (`Web_POC_Plan.md` §2).
- **Native behavior** — native *does* import the new graph (`TestToolMenu` → probe → session → pkce → `getWebCrypto/index.native.ts`), which is why every native-reaching surface is import-safe: the crypto stub throws only when called, `getOAuthRedirectURI` touches `window` only when called, and both the mount effect and the rows are platform-gated so nothing ever calls them on native.
