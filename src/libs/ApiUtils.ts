import CONFIG from '@src/CONFIG';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Request} from '@src/types/onyx';

import type {OnyxKey} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';

import Onyx from 'react-native-onyx';

import proxyConfig from '../../config/proxyConfig';
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

    // Toggling between APIs is not allowed on an internal dev environment, with QA as the one exception:
    // internal devs are exactly who needs to reach QA from a local build, and it is opt-in so it can never
    // become a default
    if (CONFIG.IS_USING_LOCAL_WEB && value !== CONST.SERVER.QA) {
        return CONST.SERVER.PRODUCTION;
    }

    const defaultServer = envName === CONST.ENVIRONMENT.STAGING || envName === CONST.ENVIRONMENT.ADHOC ? CONST.SERVER.STAGING : CONST.SERVER.PRODUCTION;
    return value ?? defaultServer;
}

getEnvironment().then((envName) => {
    // We subscribe inside the .then so `envName` is already resolved whenever the Onyx callback runs.
    // Since this isn't connected to a UI anywhere, it's OK to use connectWithoutView()
    Onyx.connectWithoutView({
        key: ONYXKEYS.ACTIVE_SERVER,
        callback: (value) => {
            activeServer = resolveActiveServer(value, envName);
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
        return shouldUseSecure ? CONFIG.EXPENSIFY.QA_SECURE_API_ROOT : CONFIG.EXPENSIFY.QA_API_ROOT;
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

/**
 * Get the command url for the given request
 * @param - the name of the API command
 */
function getCommandURL<TKey extends OnyxKey>(request: Request<TKey>): string {
    // If request.command already contains ? then we don't need to append it
    return `${getApiRoot(request)}api/${request.command}${request.command.includes('?') ? '' : '?'}`;
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
