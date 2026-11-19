/**
 * Makes a flow page work without the entry page under it, for example after a reload. The page checks that the account
 * data names the workspace of its URL and reads it when it does not. After its own read it also checks that the URL may
 * be opened, and otherwise replaces the URL with the resume position.
 */
import useNetwork from '@hooks/useNetwork';
import usePrevious from '@hooks/usePrevious';

import Navigation from '@libs/Navigation/Navigation';

import {openOnboardingPage} from '@pages/SimplifiedBankOnboarding/actions/OnboardingPage';
import useStepRequest from '@pages/SimplifiedBankOnboarding/requests/useStepRequest';
import {isAccountForRoute} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

import type {Route} from '@src/ROUTES';

import {useIsFocused} from '@react-navigation/native';
import {useEffect, useEffectEvent} from 'react';

import type {FlowContext, FlowDefinition, FlowPosition} from './types';

import {canOpen, getResumePosition} from './flowNavigation';

type FlowAccountStatus = 'ready' | 'loading' | 'offline' | 'notFound';

type UseFlowAccountParams<TPageName extends string> = {
    flow: FlowDefinition<TPageName>;
    context: FlowContext;

    /** The step that the page shows, which is the first step when the URL names no known page */
    pageName: TPageName;
    policyID: string | undefined;

    /** Builds the route of a position in this flow */
    getRoute: (position: FlowPosition<TPageName>) => Route;
};

function useFlowAccount<TPageName extends string>({flow, context, pageName, policyID, getRoute}: UseFlowAccountParams<TPageName>): FlowAccountStatus {
    const {isOffline} = useNetwork();
    const isFocused = useIsFocused();
    const isDataForRoute = isAccountForRoute(context.server, {policyID});
    const isOpenable = canOpen(flow, context, pageName);

    // A failed read is sent again only when the page regains the focus or the connection, so it cannot loop.
    const hasRegainedFocus = usePrevious(isFocused) === false && isFocused;
    const hasReconnected = usePrevious(isOffline) && !isOffline;

    // The guard runs only after a read of this page, so at most once per page. By then the draft that the previous
    // step wrote right before it navigated has reached the context, so a step completed by the draft is not missed.
    const redirectToResumePositionIfNeeded = () => {
        if (canOpen(flow, context, pageName)) {
            return;
        }
        Navigation.navigate(getRoute(getResumePosition(flow, context)), {forceReplace: true});
    };

    const accountRead = useStepRequest({onSuccess: redirectToResumePositionIfNeeded});

    const readAccountIfNeeded = useEffectEvent(() => {
        if (!policyID || !isFocused || isOffline || accountRead.isPending) {
            return;
        }
        if (accountRead.hasFailed && !hasRegainedFocus && !hasReconnected) {
            return;
        }
        // A page that may be opened needs no read. One that may not is read once before the guard moves the user.
        if (isDataForRoute && (accountRead.wasSent || isOpenable)) {
            return;
        }
        accountRead.send((requestID) => openOnboardingPage(requestID, {policyID}));
    });

    useEffect(() => {
        readAccountIfNeeded();
    }, [isFocused, isOffline, isDataForRoute]);

    if (!policyID) {
        return 'notFound';
    }
    if (!isDataForRoute) {
        if (isOffline) {
            return 'offline';
        }
        return accountRead.hasFailed ? 'notFound' : 'loading';
    }
    if (accountRead.isPending) {
        return 'loading';
    }
    // A page that may not be opened is never painted: it waits for the read and the redirect that follows it.
    if (!isOpenable) {
        if (accountRead.hasFailed) {
            return 'notFound';
        }
        return isOffline ? 'offline' : 'loading';
    }
    return 'ready';
}

export default useFlowAccount;
export type {FlowAccountStatus};
