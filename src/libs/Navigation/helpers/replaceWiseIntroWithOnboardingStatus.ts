import Navigation from '@libs/Navigation/Navigation';

import {DYNAMIC_ROUTES} from '@src/ROUTES';
import type {Route} from '@src/ROUTES';

import createDynamicRoute from './dynamicRoutesUtils/createDynamicRoute';
import stripDynamicRouteSuffixFromPath from './dynamicRoutesUtils/stripDynamicRouteSuffixFromPath';

/**
 * Puts the status page in place of the intro and the flow's page above it, so it sits over the screen that opened the flow and its URL, which Wise
 * also gets as the redirect, does not repeat the intro. Both steps update the state synchronously, so the intro never shows between them.
 */
function replaceWiseIntroWithOnboardingStatus(introPath: Route, bankAccountID: number) {
    Navigation.goBack(introPath);
    const entryPath = stripDynamicRouteSuffixFromPath(introPath, DYNAMIC_ROUTES.WISE_GLOBAL_REIMBURSEMENTS_INTRO.path);
    Navigation.navigate(createDynamicRoute(DYNAMIC_ROUTES.WISE_ONBOARDING_STATUS.getRoute(bankAccountID), entryPath), {forceReplace: true});
}

export default replaceWiseIntroWithOnboardingStatus;
