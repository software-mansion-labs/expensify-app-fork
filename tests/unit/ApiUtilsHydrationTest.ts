import type * as ApiUtilsModule from '@libs/ApiUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type {ValueOf} from 'type-fest';

import Onyx from 'react-native-onyx';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

const mockConfig = {
    IS_USING_LOCAL_WEB: false,
    IS_USING_WEB_PROXY: false,
    EXPENSIFY: {
        DEFAULT_API_ROOT: 'https://www.expensify.com/',
        DEFAULT_SECURE_API_ROOT: 'https://secure.expensify.com/',
        STAGING_API_ROOT: 'https://staging.expensify.com/',
        STAGING_SECURE_API_ROOT: 'https://staging-secure.expensify.com/',
        QA_API_ROOT: 'https://qa.exops.io/',
        QA_SECURE_API_ROOT: 'https://qa-secure.exops.io/',
        EXPENSIFY_URL: 'https://www.expensify.com/',
        SECURE_EXPENSIFY_URL: 'https://secure.expensify.com/',
    },
};

// The sibling env suites hardcode a resolved environment, which leaves them nothing to observe: by the
// time a test runs, hydration has already happened. This suite holds the environment open instead, so the
// window before hydration is reachable and the promise's contract can be checked from both sides. That is
// what the `mock*` prefix buys, since a jest.mock factory may not reach any other out-of-scope binding.
let resolveMockEnvironment: (envName: ValueOf<typeof CONST.ENVIRONMENT>) => void = () => {};
const mockEnvironmentPromise = new Promise<ValueOf<typeof CONST.ENVIRONMENT>>((resolve) => {
    resolveMockEnvironment = resolve;
});

jest.mock('@src/libs/Environment/getEnvironment', () => ({
    __esModule: true,
    default: () => mockEnvironmentPromise,
}));

jest.mock('@src/CONFIG', () => ({__esModule: true, default: mockConfig}));

Onyx.init({keys: ONYXKEYS});

// Lazy-require so the @src/CONFIG mock factory sees an initialized mockConfig. Otherwise the
// hoisted import order would resolve CONFIG.default while mockConfig was still in the TDZ.
const ApiUtils = require<typeof ApiUtilsModule>('@libs/ApiUtils');

describe('waitForActiveServerHydration', () => {
    it('stays pending until the environment is known, so a one-shot decision that awaits it cannot read a QA build as production', async () => {
        let isHydrated = false;
        const hydration = ApiUtils.waitForActiveServerHydration().then(() => {
            isHydrated = true;
        });

        await waitForBatchedUpdates();

        // No amount of flushing can hydrate while getEnvironment() is unresolved, because that is what
        // subscribes to ACTIVE_SERVER. Until then every build reads as an unpinned production one, which
        // is exactly what a caller skipping the await would act on.
        expect(isHydrated).toBe(false);
        expect(ApiUtils.getActiveServer()).toBe(CONST.SERVER.PRODUCTION);
        expect(ApiUtils.isQAServerActive()).toBe(false);

        resolveMockEnvironment(CONST.ENVIRONMENT.QA);
        await hydration;

        expect(ApiUtils.getActiveServer()).toBe(CONST.SERVER.QA);
        expect(ApiUtils.isQAServerActive()).toBe(true);
    });
});
