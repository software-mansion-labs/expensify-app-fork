/**
 * The navigation calls that know the lab routes: opening a flow, leaving it and the routes that the flow page of the
 * engine moves along. The engine navigates only along the routes it is handed, so every route of a flow is decided here.
 */
import Navigation from '@libs/Navigation/Navigation';

import type {FlowRoutes} from '@pages/SimplifiedBankOnboarding/core';

import ROUTES from '@src/ROUTES';

import type {FlowRouteTarget} from './flowRoutes';

import {getEntryRoute, getFlowRoute, getPositionRoute} from './flowRoutes';

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

/** Opens the page that an invited director receives, which the mock plays from the page that waits for the directors */
function openEnterSignerInfo(policyID: string | undefined, bankAccountID: number | undefined) {
    Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_ENTER_SIGNER_INFO.getRoute({policyID, bankAccountID}));
}

/** The routes of a flow in the shape that the flow page of the engine takes */
function getFlowRoutes(target: FlowRouteTarget): FlowRoutes {
    return {
        getPositionRoute: (position) => getPositionRoute(target, position),
        entryRoute: getEntryRoute(target),
        exit: () => exitFlow(target),
    };
}

export {exitFlow, getFlowRoutes, openEnterSignerInfo, openFlow};
