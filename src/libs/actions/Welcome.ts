import Onyx from 'react-native-onyx';
import ONYXKEYS from '@src/ONYXKEYS';

type DetermineOnboardingStatusProps = {
    onAble?: () => void,
    onNotAble?: () => void
}

type HasCompletedOnboardingFlowProps = {
    onCompleted?: () => void,
    onNotCompleted?: () => void
}

let hasSelectedPurpose: boolean | undefined;
let hasProvidedPersonalDetails: boolean | undefined;
let currentUserAccountID: number | undefined;

let resolveOnboardingFlowStatus: (value?: Promise<void>) => void | undefined;
const onIsOnboardingFlowStatusKnown = new Promise<void>((resolve) => {
    resolveOnboardingFlowStatus = resolve;
});

/**
 * Checks if Onyx keys required to determine the
 * onboarding flow status have been loaded (namely,
 * are not undefined).
 */
function isAbleToDetermineOnboardingStatus({ onAble, onNotAble }: DetermineOnboardingStatusProps) {
    const hasRequiredOnyxKeysBeenLoaded = [hasProvidedPersonalDetails, hasSelectedPurpose].every((value) => value !== undefined)

    if (hasRequiredOnyxKeysBeenLoaded) {
        onAble?.()
    } else {
        onNotAble?.()
    }
}

/**
* A promise returning the onboarding flow status.
* Returns true if user has completed the onboarding
* flow, false otherwise.
*/
function hasCompletedOnboardingFlow({ onCompleted, onNotCompleted }: HasCompletedOnboardingFlowProps) {
    onIsOnboardingFlowStatusKnown.then(() => {
        const onboardingFlowCompleted = hasProvidedPersonalDetails && hasSelectedPurpose

        if (onboardingFlowCompleted) {
            onCompleted?.()
        } else {
            onNotCompleted?.()
        }
    })
}

Onyx.connect({
    key: ONYXKEYS.NVP_INTRO_SELECTED,
    initWithStoredValues: true,
    callback: (value) => {
        hasSelectedPurpose = !!value;
        isAbleToDetermineOnboardingStatus({ onAble: resolveOnboardingFlowStatus })
    },
});

Onyx.connect({
    key: ONYXKEYS.SESSION,
    callback: (val, key) => {
        if (!val || !key) {
            return;
        }

        currentUserAccountID = val.accountID;

        Onyx.connect({
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            initWithStoredValues: true,
            callback: (value) => {
                if (!value || !currentUserAccountID) {
                    return;
                }

                hasProvidedPersonalDetails = !!value[currentUserAccountID]?.firstName && !!value[currentUserAccountID]?.lastName;
                isAbleToDetermineOnboardingStatus({ onAble: resolveOnboardingFlowStatus })
            },
        });
        
    },
});

export default hasCompletedOnboardingFlow;
