import {createNavigationContainerRef, StackActions} from '@react-navigation/core';
import type {MultifactorAuthenticationParamList} from '@libs/Navigation/types';

const mfaNavigationRef = createNavigationContainerRef<MultifactorAuthenticationParamList>();

let pendingNavigation: {screen: string; params?: Record<string, unknown>} | undefined;

function navigate(screen: string, params?: Record<string, unknown>) {
    if (mfaNavigationRef.isReady()) {
        const currentRoute = mfaNavigationRef.getCurrentRoute();
        if (currentRoute?.name !== screen) {
            mfaNavigationRef.dispatch(StackActions.replace(screen, params));
        }
    } else {
        pendingNavigation = {screen, params};
    }
}

function applyPendingNavigation() {
    if (!pendingNavigation || !mfaNavigationRef.isReady()) {
        return;
    }

    mfaNavigationRef.dispatch(StackActions.replace(pendingNavigation.screen, pendingNavigation.params));
    pendingNavigation = undefined;
}

function clearPendingNavigation() {
    pendingNavigation = undefined;
}

function getPendingNavigation() {
    return pendingNavigation;
}

export {mfaNavigationRef, navigate, applyPendingNavigation, clearPendingNavigation, getPendingNavigation};
