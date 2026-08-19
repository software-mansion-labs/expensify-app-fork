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
    // Toggling between APIs is not allowed on production or on an internal dev environment
    if (envName === CONST.ENVIRONMENT.PRODUCTION || CONFIG.IS_USING_LOCAL_WEB) {
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

    if (activeServer === CONST.SERVER.STAGING && forceProduction !== true) {
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

function getActiveServer(): ValueOf<typeof CONST.SERVER> {
    return activeServer;
}

/** Resolves once `activeServer` reflects the environment and the stored choice. See the comment above it. */
function waitForActiveServerHydration(): Promise<void> {
    return activeServerHydrationPromise;
}

export {getActiveServer, getApiRoot, getCommandURL, isUsingStagingApi, waitForActiveServerHydration};
