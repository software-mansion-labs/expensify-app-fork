import CONFIG from '@src/CONFIG';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Request} from '@src/types/onyx';

import type {OnyxKey} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';

import Onyx from 'react-native-onyx';

import proxyConfig from '../../config/proxyConfig';
import {READ_COMMANDS, SIDE_EFFECT_REQUEST_COMMANDS, WRITE_COMMANDS} from './API/types';
// TEMPORARY debug instrumentation for the QA Cloudflare flow. Remove with the QAAuthTrace directory.
import {isQAAuthConfigured} from './CloudflareAccess/Config';
import {traceQAAuth} from './CloudflareAccess/QAAuthTrace';
import getEnvironment from './Environment/getEnvironment';

// To avoid rebuilding native apps, native apps use production config for both staging and prod
// We use the async environment check because it works on all platforms
let activeServer: ValueOf<typeof CONST.SERVER> = CONST.SERVER.PRODUCTION;

/**
 * `activeServer` above is a placeholder, not an answer: it is only real once getEnvironment() has resolved
 * AND the first Onyx callback below has run. Render paths re-render when the value arrives, but boot code
 * that decides something once — the QA gate in particular — must await this or it reads 'production' on
 * every build, QA included.
 */
const {promise: activeServerHydrationPromise, resolve: resolveActiveServerHydration} = Promise.withResolvers<void>();

/**
 * TEMPORARY debug instrumentation: resolved once, because a build without QA credentials can never enter the
 * traced flow and should not pay for the trace. Remove with the QAAuthTrace directory.
 */
const shouldTraceQAAuth = isQAAuthConfigured();

/**
 * The whole decision table in one place, taking the environment as a parameter so it can be read without
 * chasing the async plumbing around it.
 */
function resolveActiveServer(value: ValueOf<typeof CONST.SERVER> | undefined, envName: ValueOf<typeof CONST.ENVIRONMENT>): ValueOf<typeof CONST.SERVER> {
    // A QA build is pinned to QA: the environment is baked into the bundle, and there is no meaningful way
    // to point qa.new.exops.io at production
    if (envName === CONST.ENVIRONMENT.QA) {
        return CONST.SERVER.QA;
    }

    // Switching servers is not allowed on production
    if (envName === CONST.ENVIRONMENT.PRODUCTION) {
        return CONST.SERVER.PRODUCTION;
    }

    // A stored 'qa' outlives the config that produced it: clearing QA_EXPENSIFY_URL hides the switch and
    // turns the boot gate off, but leaves the old Onyx value behind. Ignore it rather than resolve to a
    // server this build has no address for.
    const storedServer = value === CONST.SERVER.QA && !CONFIG.EXPENSIFY.QA_API_ROOT ? undefined : value;

    // Toggling between APIs is not allowed on an internal dev environment, with QA as the one exception:
    // internal devs are exactly who needs to reach QA from a local build, and it is opt-in so it can never
    // become a default
    if (CONFIG.IS_USING_LOCAL_WEB && storedServer !== CONST.SERVER.QA) {
        return CONST.SERVER.PRODUCTION;
    }

    const defaultServer = envName === CONST.ENVIRONMENT.STAGING || envName === CONST.ENVIRONMENT.ADHOC ? CONST.SERVER.STAGING : CONST.SERVER.PRODUCTION;
    return storedServer ?? defaultServer;
}

getEnvironment().then((envName) => {
    // We subscribe inside the .then so `envName` is already resolved whenever the Onyx callback runs.
    // Since this isn't connected to a UI anywhere, it's OK to use connectWithoutView()
    Onyx.connectWithoutView({
        key: ONYXKEYS.ACTIVE_SERVER,
        callback: (value) => {
            activeServer = resolveActiveServer(value, envName);
            // TEMPORARY debug instrumentation: this is the value that decides whether sign-in POSTs to the QA
            // origin or to production, and it is the one thing no static reading of the repo can tell us.
            if (shouldTraceQAAuth) {
                traceQAAuth('activeServer.resolved', {stored: value ?? null, environment: envName, resolved: activeServer});
            }
            resolveActiveServerHydration();
        },
    });
});

/**
 * Get the currently used API endpoint, unless forceProduction is set to true
 * (Non-production environments allow for dynamically switching the API)
 */
function getApiRoot<TKey extends OnyxKey = never>(request?: Partial<Pick<Request<TKey>, 'shouldUseSecure' | 'shouldSkipWebProxy' | 'command'>>, forceProduction = false): string {
    const shouldUseSecure = request?.shouldUseSecure ?? false;
    // `forceProduction` means "route as if nothing is toggled on", so apply it once rather than repeating it
    // as a guard on every non-production branch below
    const server = forceProduction ? CONST.SERVER.PRODUCTION : activeServer;

    if (server === CONST.SERVER.QA) {
        // Deliberately no web-proxy branch: Cloudflare Access answers the preflight and matches the bearer
        // against the real origin, so routing QA through a same-origin proxy path would defeat both
        if (!shouldUseSecure) {
            return CONFIG.EXPENSIFY.QA_API_ROOT;
        }

        // A QA deployment with one host is a supported shape — isQAAuthConfigured() accepts it and the bearer
        // allowlist carries a single entry — so this is an unavailable host, not bad config. Returning the
        // empty root would be far worse than failing: getCommandURL would build a relative `api/Command?`,
        // which the browser resolves against the app's own origin, quietly sending the request to the dev
        // server with no bearer on it.
        if (!CONFIG.EXPENSIFY.QA_SECURE_API_ROOT) {
            throw new Error(`The QA server has no secure host, so it cannot serve ${request?.command ?? 'a secure command'}. Set QA_SECURE_EXPENSIFY_URL to reach one.`);
        }

        return CONFIG.EXPENSIFY.QA_SECURE_API_ROOT;
    }
    if (server === CONST.SERVER.STAGING) {
        if (CONFIG.IS_USING_WEB_PROXY && !request?.shouldSkipWebProxy) {
            return shouldUseSecure ? proxyConfig.STAGING_SECURE : proxyConfig.STAGING;
        }
        return shouldUseSecure ? CONFIG.EXPENSIFY.STAGING_SECURE_API_ROOT : CONFIG.EXPENSIFY.STAGING_API_ROOT;
    }
    if (request?.shouldSkipWebProxy) {
        return shouldUseSecure ? CONFIG.EXPENSIFY.SECURE_EXPENSIFY_URL : CONFIG.EXPENSIFY.EXPENSIFY_URL;
    }
    return shouldUseSecure ? CONFIG.EXPENSIFY.DEFAULT_SECURE_API_ROOT : CONFIG.EXPENSIFY.DEFAULT_API_ROOT;
}

/** TEMPORARY debug instrumentation: the commands whose destination decides whether a magic code is ever sent */
const TRACED_COMMANDS = new Set<string>([
    READ_COMMANDS.BEGIN_SIGNIN,
    WRITE_COMMANDS.SIGN_IN_USER,
    READ_COMMANDS.SIGN_IN_WITH_SHORT_LIVED_AUTH_TOKEN,
    WRITE_COMMANDS.OPEN_APP,
    WRITE_COMMANDS.RECONNECT_APP,
    SIDE_EFFECT_REQUEST_COMMANDS.RECONNECT_APP,
    SIDE_EFFECT_REQUEST_COMMANDS.AUTHENTICATE_PUSHER,
]);

/**
 * Get the command url for the given request
 * @param - the name of the API command
 */
function getCommandURL<TKey extends OnyxKey>(request: Request<TKey>): string {
    // If request.command already contains ? then we don't need to append it
    const url = `${getApiRoot(request)}api/${request.command}${request.command.includes('?') ? '' : '?'}`;

    // TEMPORARY debug instrumentation: only the commands that decide a sign-in, so ordinary traffic cannot
    // evict the boot and callback records this exists to capture. `getApiRoot` derives the URL from
    // `activeServer`, so tracing every QA request would add volume without adding an independent fact.
    if (shouldTraceQAAuth && TRACED_COMMANDS.has(request.command)) {
        traceQAAuth('api.commandURL', {command: request.command, activeServer, url});
    }

    return url;
}

/**
 * Check if we're currently using the staging API root
 */
function isUsingStagingApi(): boolean {
    return activeServer === CONST.SERVER.STAGING;
}

/**
 * Whether QA is the active server. Routing does not use this: `getApiRoot` asks about the effective server for
 * one request, which `forceProduction` can differ from.
 */
function isQAServerActive(): boolean {
    return activeServer === CONST.SERVER.QA;
}

function getActiveServer(): ValueOf<typeof CONST.SERVER> {
    return activeServer;
}

/** Resolves once `activeServer` reflects the environment and the stored choice. See the comment above it. */
function waitForActiveServerHydration(): Promise<void> {
    return activeServerHydrationPromise;
}

export {getActiveServer, getApiRoot, getCommandURL, isQAServerActive, isUsingStagingApi, waitForActiveServerHydration};
