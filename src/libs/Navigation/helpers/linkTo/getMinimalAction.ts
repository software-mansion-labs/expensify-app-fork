import getParamsFromRoute from '@libs/Navigation/helpers/getParamsFromRoute';
import {isSplitNavigatorName} from '@libs/Navigation/helpers/isNavigatorName';
import {SPLIT_TO_SIDEBAR} from '@libs/Navigation/linkingConfig/RELATIONS';
import {isRecord} from '@libs/ObjectUtils';

import type {NavigationRoute, State} from '@navigation/types';

import CONST from '@src/CONST';

import type {NavigationAction, NavigationState} from '@react-navigation/native';
import type {Writable} from 'type-fest';

import type {ActionPayload} from './types';

type MinimalAction = {
    action: Writable<NavigationAction>;
    targetState: State | undefined;

    /** The action was rewritten to PUSH a new split navigator, so `goUp` has to pop to the matching one first. */
    isCrossScopeSplitPush: boolean;
};

function isNamedActionPayload(payload: unknown): payload is ActionPayload & {name: string} {
    return isRecord(payload) && typeof payload.name === 'string';
}

/** `domainAccountID` is a number in the state and a string in a parsed path, so scope values are compared as strings. */
function getComparableScopeValue(value: unknown): string | undefined {
    if (typeof value !== 'string' && typeof value !== 'number') {
        return;
    }

    return String(value);
}

/**
 * One split navigator exists per policy and per domain, and what distinguishes two instances is the path params of
 * their sidebar screen (`workspaces/:policyID`, `domain/:domainAccountID`) - the split's scope. Splits whose sidebar
 * has no path param (`settings`, `inbox`) have an empty scope, so the predicates below never fire for them.
 *
 * Derived from the linking config rather than naming `policyID` / `domainAccountID` here, because
 * `SplitRouter.adaptStateIfNecessary` already identifies a split from the same config and a second list would drift.
 * `includeSharedParams` is omitted so `backTo` stays out: it says where the user came from, not which workspace they
 * are in. The target scope is read from the action's central screen params because an action entering a split names
 * the central screen, which works because every central screen of a scoped split repeats its sidebar's scope param.
 */
function getSplitScopeComparisonValues(currentRoute: NavigationRoute, payload: unknown) {
    if (!isNamedActionPayload(payload) || !isSplitNavigatorName(currentRoute.name) || currentRoute.name !== payload.name || !currentRoute.state) {
        return;
    }

    const sidebarScreen = SPLIT_TO_SIDEBAR[currentRoute.name];
    const scopeParams = getParamsFromRoute(sidebarScreen);
    // SplitRouter inserts the sidebar only when `shouldSplitHaveSidebar` holds, so on a narrow layout a split can
    // hold central screens alone. Falling back to the focused one is safe: it carries the same scope param.
    const scopeRoute = currentRoute.state.routes.find((route) => route.name === sidebarScreen) ?? currentRoute.state.routes.at(currentRoute.state.index ?? -1);
    const currentParams: unknown = scopeRoute?.params;
    const targetParams = payload.params?.params;
    if (!scopeParams.length || !isRecord(currentParams) || !isRecord(targetParams)) {
        return;
    }

    return {scopeParams, currentParams, targetParams};
}

/*
 * The two predicates below are deliberately not complements: a missing or incomparable scope value makes both false,
 * so an incomplete state neither pushes a duplicate split nor treats an unrelated one as a back target.
 */

/** The focused split navigator belongs to a different workspace/domain than the action targets. */
function hasDifferentSplitScope(currentRoute: NavigationRoute, payload: unknown): boolean {
    const comparisonValues = getSplitScopeComparisonValues(currentRoute, payload);
    if (!comparisonValues) {
        return false;
    }

    const {scopeParams, currentParams, targetParams} = comparisonValues;
    return scopeParams.some((param) => {
        const currentValue = getComparableScopeValue(currentParams[param]);
        const targetValue = getComparableScopeValue(targetParams[param]);
        return currentValue !== undefined && targetValue !== undefined && currentValue !== targetValue;
    });
}

/** This split navigator is the instance the action targets, so it can be navigated back into. */
function hasMatchingSplitScope(currentRoute: NavigationRoute, payload: unknown): boolean {
    const comparisonValues = getSplitScopeComparisonValues(currentRoute, payload);
    if (!comparisonValues) {
        return false;
    }

    const {scopeParams, currentParams, targetParams} = comparisonValues;
    return scopeParams.every((param) => {
        const currentValue = getComparableScopeValue(currentParams[param]);
        return currentValue !== undefined && currentValue === getComparableScopeValue(targetParams[param]);
    });
}

/**
 * Motivation for this function is described in NAVIGATION.md
 *
 * The returned type is not guaranteed to match the input type: descending into a split navigator of a different
 * workspace would leave a stale sidebar above the new central screen, so the action is returned as a PUSH instead.
 *
 * @param action action generated by getActionFromState
 * @param state The root state
 * @returns minimalAction minimal action is the action that we should dispatch
 */
function getMinimalAction(action: NavigationAction, state: NavigationState): MinimalAction {
    let currentAction: NavigationAction = action;
    let currentState: State | undefined = state;
    let currentTargetKey: string | undefined;
    let isCrossScopeSplitPush = false;

    while (isNamedActionPayload(currentAction.payload) && currentState) {
        const currentRoute: NavigationRoute | undefined = currentState.routes.at(currentState.index ?? -1);
        if (!currentRoute || currentRoute.name !== currentAction.payload.name) {
            break;
        }

        const payload = currentAction.payload;
        const isDifferentSplitScope = hasDifferentSplitScope(currentRoute, payload);
        if (!currentRoute.state || isDifferentSplitScope) {
            if (isDifferentSplitScope && currentAction.type !== CONST.NAVIGATION.ACTION_TYPE.REPLACE) {
                currentAction = {...currentAction, type: CONST.NAVIGATION.ACTION_TYPE.PUSH};
                isCrossScopeSplitPush = true;
            }
            break;
        }

        currentState = currentRoute.state;
        currentTargetKey = currentState?.key;

        // Creating new smaller action
        currentAction = {
            type: currentAction.type,
            payload: {
                name: payload?.params?.screen,
                params: payload?.params?.params,
                path: payload?.params?.path,
            },
            target: currentTargetKey,
        };
    }
    return {action: currentAction, targetState: currentState, isCrossScopeSplitPush};
}

export {hasMatchingSplitScope};
export default getMinimalAction;
