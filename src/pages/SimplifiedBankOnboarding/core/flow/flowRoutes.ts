/**
 * The routes of the flows and the reading of flow routes. A position (step, sub page, edit flag) maps to the route of
 * its flow and back, so no other module knows the three route shapes, their params or the screen names.
 *
 * What it hides: the `page`, `subPage` and `action=edit` params, `policyID`, `backTo`, `bankAccountID` and
 * `isCompleted`, the one step of the invited director (its route has no step param), and the search of flow routes in
 * a navigation state.
 */
import Navigation from '@libs/Navigation/Navigation';

import {ENTER_SIGNER_INFO_STEP_ID, isPageID, isStepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {PageID, StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';

import ROUTES from '@src/ROUTES';
import type {Route} from '@src/ROUTES';
import SCREENS from '@src/SCREENS';

import type {FlowTarget} from './flowContext';

/** A position as the routes know it. The edit flag is the `action=edit` param. */
type FlowPosition = {step?: StepID; page?: PageID; isEditing?: boolean};

/** The part of a navigation state that the reads need, so a test can pass a plain object */
type FlowNavigationState = {routes: ReadonlyArray<{key: string; name: string; params?: unknown}>};

const EDIT_ACTION = 'edit';

/** The route of a flow position. Steps never call this. The entry, the lab buttons and the shells do. */
function getFlowRoute(target: FlowTarget, position: FlowPosition = {}): Route {
    const action = position.isEditing ? EDIT_ACTION : undefined;
    switch (target.kind) {
        case 'usd':
            return ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({policyID: target.policyID, page: position.step, subPage: position.page, action, backTo: target.backTo});
        case 'nonUSD':
            return ROUTES.SETTINGS_BANK_ONBOARDING_LAB_NON_USD_SETUP.getRoute({policyID: target.policyID, page: position.step, subPage: position.page, action, backTo: target.backTo});
        default:
            return ROUTES.SETTINGS_BANK_ONBOARDING_LAB_ENTER_SIGNER_INFO.getRoute({
                policyID: target.policyID,
                bankAccountID: target.bankAccountID,
                isCompleted: target.isCompleted,
                subPage: position.page,
                action,
            });
    }
}

/** Navigates to getFlowRoute. `shouldReplace` uses forceReplace (the verify page). */
function openFlow(target: FlowTarget, position?: FlowPosition, options?: {shouldReplace?: boolean}) {
    Navigation.navigate(getFlowRoute(target, position), options?.shouldReplace ? {forceReplace: true} : undefined);
}

/**
 * Writes the step that the flow shows into the route `routeKey`, for a URL that named no step, an unknown one or a
 * skipped one. The sub page and the edit flag of the URL belonged to the other step, so they are dropped.
 */
function writeShownStep(routeKey: string, step: StepID) {
    Navigation.setParams({page: step, subPage: undefined, action: undefined}, routeKey);
}

function getFlowScreenName(target: FlowTarget): string {
    switch (target.kind) {
        case 'usd':
            return SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP;
        case 'nonUSD':
            return SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP;
        default:
            return SCREENS.SETTINGS.BANK_ONBOARDING_LAB.ENTER_SIGNER_INFO;
    }
}

function readStringParam(params: unknown, name: string): string | undefined {
    const value: unknown = typeof params === 'object' && params !== null ? Object.entries(params).find(([key]) => key === name)?.[1] : undefined;
    return typeof value === 'string' ? value : undefined;
}

/** The position that route params name. A step or a page that is not an ID of the flows counts as missing. */
function parseFlowPosition(target: FlowTarget, params: unknown): FlowPosition {
    const step = target.kind === 'enterSignerInfo' ? ENTER_SIGNER_INFO_STEP_ID : readStringParam(params, 'page');
    const page = readStringParam(params, 'subPage');
    return {
        step: isStepID(step) ? step : undefined,
        page: isPageID(page) ? page : undefined,
        isEditing: readStringParam(params, 'action') === EDIT_ACTION,
    };
}

/** The routes under the route `routeKey`, nearest first, that show the screen of the flow */
function getFlowRoutesBelow(state: FlowNavigationState | undefined, routeKey: string, target: FlowTarget) {
    const routes = state?.routes ?? [];
    const routeIndex = routes.findIndex((route) => route.key === routeKey);
    const screenName = getFlowScreenName(target);
    return routes
        .slice(0, Math.max(routeIndex, 0))
        .reverse()
        .filter((route) => route.name === screenName);
}

/** The step of the route directly under the route `routeKey`, when that route shows the same flow */
function getStepBelow(state: FlowNavigationState | undefined, routeKey: string, target: FlowTarget): StepID | undefined {
    const routes = state?.routes ?? [];
    const routeIndex = routes.findIndex((route) => route.key === routeKey);
    const routeBelow = routeIndex > 0 ? routes.at(routeIndex - 1) : undefined;
    if (!routeBelow || routeBelow.name !== getFlowScreenName(target)) {
        return undefined;
    }
    return parseFlowPosition(target, routeBelow.params).step;
}

/** The position of the latest route under the route `routeKey` that shows `step`, built from that route's params */
function findLatestRouteOfStep(state: FlowNavigationState | undefined, routeKey: string, target: FlowTarget, step: StepID): FlowPosition | undefined {
    return getFlowRoutesBelow(state, routeKey, target)
        .map((route) => parseFlowPosition(target, route.params))
        .find((position) => position.step === step);
}

/** Leaves the whole onboarding: back to the screen that opened it, else closes the modal */
function leaveOnboarding(backTo: Route | undefined) {
    if (backTo) {
        Navigation.goBack(backTo);
        return;
    }
    Navigation.dismissModal();
}

export {findLatestRouteOfStep, getFlowRoute, getStepBelow, leaveOnboarding, openFlow, parseFlowPosition, writeShownStep};
export type {FlowNavigationState, FlowPosition};
