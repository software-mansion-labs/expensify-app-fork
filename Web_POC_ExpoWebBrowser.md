# expo-web-browser on Web — Usage, Internals, and Version-Pinning Risks

Companion to `Web_POC.md` (protocol findings), `Web_POC_Plan.md` (spike plan), and `Web_POC_Implementation.md` (file-by-file execution). This doc owns everything about the popup-transport library: why `expo-web-browser` drives the OAuth popup, exactly which API surface we call and under what constraints, the undocumented internals the severed-opener recovery rides on, and what must be re-verified whenever the package version moves. The other docs summarize and point here.

## 1. The choice, and why

The decision is set: web and mobile share one Cloudflare OAuth flow, and on web the authorize hop runs in a **popup** driven by `expo-web-browser`'s web implementation (`openAuthSessionAsync` + `maybeCompleteAuthSession`). What makes it the right default:

- **It's already in the tree.** `expo-web-browser@56.0.5` ships in `package.json`, and the app already uses exactly this machinery in production: `callSAMLSignOut` (`src/libs/actions/Session/index.ts` ≈line 289) opens the SAML sign-out popup with `openAuthSessionAsync`, and `maybeCompleteAuthSession()` already sits at `src/App.tsx` module scope (≈line 57) to complete it. Our flow adds a second consumer, not a new mechanism.
- **One transport API across platforms.** The same `openAuthSessionAsync` call is the intended transport on native (backed there by the system auth session UI), so using it on web keeps the flow code identical up to the redirect URI.
- **The documented alternative stays on the shelf.** A full-page redirect (park `state`/`code_verifier` in `sessionStorage`, return through a real `/oauth/callback` route) is the contingency if popups prove unreliable — it needs the route interception the popup path avoids (`linkingConfig/subscribe.ts`, the Plaid pattern) and is deliberately deferred.

## 2. The API surface we call, and the rules that come with it

Three functions, each with a constraint discovered either in the installed source or live:

| Call | Where | Constraint / behavior |
|---|---|---|
| `openAuthSessionAsync(authorizeUrl, redirectUri)` | opener, inside the button press | `window.open` runs **synchronously at the top of the call** and the lib throws `ERR_WEB_BROWSER_BLOCKED` when the browser has revoked the user activation — the error text itself warns about invoking it "too long after a user input was fired". Hence the pre-warm design: the PKCE pair and Onyx hydration are ready before the press, and the click path has **zero awaits** before the call — browsers (Safari strictest) can void transient activation across *any* await, the same reasoning as the repo's pre-open workaround in `asyncOpenURL/index.web.ts`. |
| `maybeCompleteAuthSession()` | popup, `App.tsx` module scope | Detects "I am the popup opened by `openAuthSessionAsync`", publishes the callback URL (localStorage first, then postMessage — §3), and normally the opener closes the popup. The popup boots the whole NewDot bundle to get there: the router may flash `/not-found`, and two console errors are known cosmetics of that short-lived boot — `Failed to load the gib.js script` and a `ChunkLoadError` for the push-notification chunk. None of it blocks the handshake; a static callback page would remove all three (§6). |
| `dismissAuthSession()` | opener, right after the auth race settles | Closes the popup via the retained `window.open` handle and removes the lib's localStorage handles. We call it unconditionally after a success from either channel (§4): when the severed-opener watcher won, the lib's session is still dangling — this is the cleanup. No-op after a normal completion. |

Result handling: `result.type !== 'success'` is a cancel/dismiss, not an error. Note the deliberate difference from the SAML precedent: sign-out proceeds even when its popup fails, whereas a failed **auth** popup must abort the flow.

## 3. The internal handshake we depend on

`expo-web-browser`'s web build coordinates its two windows through a private protocol — not a spec, not public API. Read from the installed `node_modules/expo-web-browser/build/ExpoWebBrowser.web.js` at 56.0.5:

1. **Opener, `openAuthSessionAsync(url, redirectUrl)`:** `window.open(url)` synchronously, then writes two localStorage keys — `ExpoWebBrowserRedirectHandle` = the session handle, and `ExpoWebBrowser_RedirectUrl_<handle>` = the normalized redirect URL. **The handle is our own OAuth `state`:** expo parses the authorize URL and reuses its `state` query param when present (`getStateFromUrlOrGenerateAsync`). That reuse is what makes the breadcrumb key *derivable* from a value we generated — no scanning, no guessing. The opener then waits on a `message` listener (same-origin + `expoSender === handle` checks), plus two built-in fallbacks that both fail us (§4).
2. **Popup, `maybeCompleteAuthSession()` at App boot:** finds the handle in the shared localStorage → verifies the current URL against `ExpoWebBrowser_RedirectUrl_<handle>` → **writes the full callback URL to `ExpoWebBrowser_OriginUrl_<handle>`** → only then posts `{url, expoSender: handle}` to `window.opener ?? window.parent`.
3. **Opener, on the message:** `dismissPopup()` — closes the popup through the `window.open` handle and removes all three keys.

The load-bearing accident: the localStorage breadcrumb is written **before** the postMessage, and localStorage is shared same-origin regardless of opener health. That ordering is the entire severed-opener recovery.

## 4. The severed-opener failure mode, and the recovery built on §3

**What happened live (Jul 27, right after a fresh login):** the flow hung on an endless spinner. The popup's `window.opener` came back **severed** after the Cloudflare redirect chain, so step 2's postMessage went nowhere — with a severed opener, `window.opener ?? window.parent` of a top-level window is the window *itself*, a message posted to a window with no listener and silently dropped. `openAuthSessionAsync` never settles.

**What severs an opener:** any hop that disowns the popup does it; the known mechanisms are a browser-initiated navigation and a `Cross-Origin-Opener-Policy` header on an intermediate page. Which one Cloudflare Access used was never pinned down, and the recovery deliberately does not depend on knowing: it keys off the callback URL landing in localStorage, whatever nulled the opener. The live symptom does rule one of them out. COOP puts the popup in a new browsing context group, which is expected to make the opener's own popup handle read as closed, so expo would have resolved `dismiss` within a second rather than hanging. A hang means the popup stayed reachable from the opener while its own `window.opener` was gone.

**Why expo's own two fallbacks don't rescue the severed case on web:**

- Its AppState listener re-reads the `OriginUrl` breadcrumb only on an `active` transition — but web AppState is document-visibility-based, and the opener tab never flips visibility during the popup dance, so it never fires.
- Its 1 s `popupWindow.closed` poll resolves (as `dismiss`, losing the URL) only once the popup closes — and in the severed case nothing ever closes it, because the closer is the opener-side `dismissPopup()` that only runs on the message that never arrives.

**The recovery (shipped, `src/libs/CloudflareOAuth/popupCompletionRecovery.ts`):** two pieces, both riding §3:

- **Opener side:** `watchForSeveredOpenerCompletion(state)` resolves with the callback URL when `ExpoWebBrowser_OriginUrl_<state>` appears — a `storage` event for writes after attach, plus a 1 s poll for one written before it. `runAuthFlow` races it against `openAuthSessionAsync` and calls `dismissAuthSession()` after a success from either channel.
- **Popup side:** `closeQAAuthPopupIfSeveredOpener()` (one line in `App.tsx`, right after `maybeCompleteAuthSession()`) — the popup closes *itself*, since its opener no longer can. Every gate must pass: on the callback path, completion breadcrumb published, opener actually gone, QA auth configured (plus a web-storage guard so native is a no-op). "Never close the main window" is the invariant the gates encode.

**Why prod never needed this:** the app's only pre-existing web popup (SAML sign-out) routes exclusively through Expensify-controlled pages, which evidently never sever the opener. But `callSAMLSignOut` awaits `openAuthSessionAsync` with no recovery either — it shares the latent hazard; our flow is simply the first to put a third party's pages in the middle of the chain (see §6).

## 5. Version brittleness — what is pinned, and what breaks how

Everything in §3 is private implementation detail of `expo-web-browser@56.0.5`. A version bump can invalidate any row below without a changelog entry:

| Pinned fact (56.0.5) | What relies on it | If an upgrade changes it |
|---|---|---|
| `window.open` runs synchronously at the top of `openAuthSessionAsync` | The zero-awaits click path / user-activation design | Popups die as `ERR_WEB_BROWSER_BLOCKED` on every press |
| Session handle = the authorize URL's `state` param (`getStateFromUrlOrGenerateAsync`) | The watcher derives the breadcrumb key from our own `state` | Watcher waits on a key that never appears → the severed case hangs again (healthy case still works) |
| Key names `ExpoWebBrowserRedirectHandle`, `ExpoWebBrowser_RedirectUrl_<handle>`, `ExpoWebBrowser_OriginUrl_<handle>` | The watcher and the popup self-close gates | Same silent regression to the pre-fix hang |
| Breadcrumb written **before** the postMessage | The severed case has a signal at all | The recovery loses its only channel |
| `dismissAuthSession()` closes via the retained handle and clears the keys | Post-race cleanup | Dangling handles, or a popup left open after the fallback wins |
| Completion message shape `{url, expoSender}` + same-origin check | The healthy (unsevered) channel | Healthy-path completion breaks — caught immediately by any manual run |

Mitigation, not prevention: the unit tests (`Web_POC_Implementation.md` §7.1 self-close gate table, §7.2 severed-opener recovery + poll fallback) hard-code the key names and the ordering, so an expo upgrade that reshapes the handshake **fails the suite loudly instead of hanging a live flow quietly**. Accepted as POC risk.

**Upgrade checklist for any `expo-web-browser` bump:**

1. Re-read `node_modules/expo-web-browser/build/ExpoWebBrowser.web.js` (it's small) and re-verify every row of the table above.
2. Run the unit suites covering `popupCompletionRecovery` and the `CloudflareSession` severed-recovery/poll cases — they fail on renamed keys or reordered writes.
3. One live (or scripted-browser) run of both variants: healthy opener and severed opener.
4. Update the pinned version here, in the constants comment in `popupCompletionRecovery.ts`, and in `Web_POC_Implementation.md` §2.5.

## 6. Open questions / follow-ups

- **Static callback page.** The popup boots the entire NewDot bundle just to publish a URL and close (the `/not-found` flash and the two benign console errors in §2 are all symptoms of that). A minimal static page at `/oauth/callback` performing §3 step 2 by hand would cut seconds off every auth — production optimization, not spike work.
- **Full-page-redirect fallback.** The §1 contingency for popup-hostile browsers. Build only if live testing shows popup blockers are a real problem.
- **Upstreaming.** The clean fix for §5 would be expo exposing the breadcrumb watch as public API — or handling severed openers itself, since it already owns both ends of the handshake. If this flow graduates from POC, an upstream issue/PR would delete our private-API dependency.
- **SAML sign-out latent hazard.** Same `openAuthSessionAsync`, no recovery; safe only while its redirect chain stays on Expensify-controlled pages (§4). Worth a heads-up to the owners of `callSAMLSignOut` independent of this POC.
