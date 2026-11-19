/**
 * The navigation calls of the flows. The controller decides where to go and these helpers turn a position into the
 * route call, so no other module of the flows imports `Navigation`.
 */
import Navigation from '@libs/Navigation/Navigation';

import type {FlowPosition} from '@pages/SimplifiedBankOnboarding/flow/position';

import ROUTES from '@src/ROUTES';

import type {FlowRouteTarget} from './routes';

import {getEntryRoute, getFlowRoute, getPositionRoute} from './routes';

function goToPosition(target: FlowRouteTarget, position: FlowPosition) {
    Navigation.navigate(getPositionRoute(target, position));
}

function goBackToPosition(target: FlowRouteTarget, position: FlowPosition) {
    Navigation.goBack(getPositionRoute(target, position));
}

/** Swaps the URL for another position without a new history entry, such as a redirect from an unreachable position */
function replacePosition(target: FlowRouteTarget, position: FlowPosition) {
    Navigation.navigate(getPositionRoute(target, position), {forceReplace: true});
}

/** Opens a flow where it resumes, such as the NonUSD flow after a start over */
function openFlow(target: FlowRouteTarget) {
    Navigation.navigate(getFlowRoute(target));
}

/**
 * Leaves the flow for the page that opened the entry page, or closes the modal without one. The invited director page
 * returns to the page that opened it.
 */
function exitFlow(target: FlowRouteTarget) {
    if (target.kind === 'enterSignerInfo') {
        Navigation.goBack();
        return;
    }
    if (target.backTo) {
        Navigation.goBack(target.backTo);
        return;
    }
    Navigation.dismissModal();
}

/** Back from the first page of the flow returns to the entry page */
function goBackToEntry(target: FlowRouteTarget) {
    const entryRoute = getEntryRoute(target);
    if (!entryRoute) {
        exitFlow(target);
        return;
    }
    Navigation.goBack(entryRoute);
}

/** Opens the page that an invited director receives, which the mock plays from the page that waits for the directors */
function openEnterSignerInfo(policyID: string | undefined, bankAccountID: number | undefined) {
    Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_ENTER_SIGNER_INFO.getRoute({policyID, bankAccountID}));
}

export {exitFlow, goBackToEntry, goBackToPosition, goToPosition, openEnterSignerInfo, openFlow, replacePosition};
