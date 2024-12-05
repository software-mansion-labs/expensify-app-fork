import Onyx from 'react-native-onyx';
import type {ValueOf} from 'type-fest';
import * as Session from '@userActions/Session';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {HybridApp} from '@src/types/onyx';
import type HybridAppSettings from './types';

/*
 * Parses initial settings passed from OldDot app
 */
function parseHybridAppSettings(hybridAppSettings: string): HybridAppSettings {
    return JSON.parse(hybridAppSettings) as HybridAppSettings;
}

/*
 * Changes value of `readyToShowAuthScreens`
 */
function setReadyToShowAuthScreens(readyToShowAuthScreens: boolean) {
    Onyx.merge(ONYXKEYS.HYBRID_APP, {readyToShowAuthScreens});
}

/*
 * Changes NewDot sign-in state
 */
function setNewDotSignInState(newDotSignInState: ValueOf<typeof CONST.HYBRID_APP_SIGN_IN_STATE>) {
    Onyx.merge(ONYXKEYS.HYBRID_APP, {newDotSignInState});
}

/*
 * Starts HybridApp sign-in flow from the beginning.
 * In certain cases, it can perform sign-out if necessary
 */
function resetSignInFlow() {
    Onyx.merge(ONYXKEYS.HYBRID_APP, {
        readyToShowAuthScreens: false,
        newDotSignInState: CONST.HYBRID_APP_SIGN_IN_STATE.NOT_STARTED,
    });
}

/*
 * Sets proper sign-in state after sign-out on NewDot side
 */
function resetStateAfterSignOut() {
    Onyx.merge(ONYXKEYS.HYBRID_APP, {
        useNewDotSignInPage: true,
        readyToShowAuthScreens: false,
        newDotSignInState: CONST.HYBRID_APP_SIGN_IN_STATE.NOT_STARTED,
    });
}

/*
 * Updates Onyx state after start of React Native runtime based on initial `useNewDotSignInPage` value
 */
function prepareHybridAppAfterTransitionToNewDot(hybridApp: HybridApp) {
    if (hybridApp?.useNewDotSignInPage) {
        return Onyx.merge(ONYXKEYS.HYBRID_APP, {
            ...hybridApp,
            readyToShowAuthScreens: false,
            newDotSignInState: CONST.HYBRID_APP_SIGN_IN_STATE.NOT_STARTED,
        });
    }

    // When we transition with useNewDotSignInPage === false, it means that we're already authenticated on NewDot side.
    return Onyx.merge(ONYXKEYS.HYBRID_APP, {
        ...hybridApp,
        readyToShowAuthScreens: true,
    });
}

export {parseHybridAppSettings, setReadyToShowAuthScreens, setNewDotSignInState, resetSignInFlow, prepareHybridAppAfterTransitionToNewDot, resetStateAfterSignOut};
