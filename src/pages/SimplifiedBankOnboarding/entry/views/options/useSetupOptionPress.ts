/**
 * What the rows of the options screen do. A fresh setup picks Plaid or the manual setup, and a started setup continues.
 *
 * What it hides: the validation gate (an unvalidated user's option is remembered and the verify page opens, and the
 * remembered option is prepared once the user is validated), the data that each option prepares (setupOption.ts), the
 * flow and step that each option opens, and the guard of the continue navigation, which runs after an Onyx write only
 * while the screen is still shown (BC-18, the screen guard of the core).
 */
import useOnyx from '@hooks/useOnyx';

import type {OnboardingUser, SetupType} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {openFlow, saveDraft, useScreenGuard} from '@pages/SimplifiedBankOnboarding/core';
import type {FlowTarget} from '@pages/SimplifiedBankOnboarding/core';
import {goToVerifyAccount, openFirstFlowStep} from '@pages/SimplifiedBankOnboarding/entry/entryNavigation';
import {prepareSetupOption, setSetupOptionPressed} from '@pages/SimplifiedBankOnboarding/entry/requests/setupOption';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Route} from '@src/ROUTES';

import type {OnyxEntry} from 'react-native-onyx';

import {useEffect, useEffectEvent} from 'react';

type SetupOptionPressInput = {
    policyID: string | undefined;
    backTo: Route | undefined;
    isNonUSD: boolean;
    currency: string | undefined;

    /** The instance that collects a new bank account while the old one stays connected */
    isChangingBankAccount: boolean;
};

type SetupOptionPress = {
    connectWithPlaid: () => void;
    connectManually: () => void;
    continueSetup: () => void;
};

/** The options screen has one position, so only focus and mount decide whether the continue navigation runs */
const ENTRY_SCREEN_POSITION = 'entry-options';

const isUserValidatedSelector = (user: OnyxEntry<OnboardingUser>) => !!user?.validated;

function useSetupOptionPress({policyID, backTo, isNonUSD, currency, isChangingBankAccount}: SetupOptionPressInput): SetupOptionPress {
    const [isUserValidated = false] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER, {selector: isUserValidatedSelector});
    const [optionPressed] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_OPTION_PRESSED);
    const navigateWhileShown = useScreenGuard(ENTRY_SCREEN_POSITION);

    const flowTarget: FlowTarget = {
        kind: isNonUSD ? 'nonUSD' : 'usd',
        policyID,
        backTo,
    };

    function prepareOption(setupType: SetupType) {
        prepareSetupOption({
            setupType,
            policyID,
            isNonUSD,
            currency,
            isChangingBankAccount,
        });
    }

    function connect(setupType: SetupType) {
        if (!isUserValidated) {
            setSetupOptionPressed(setupType);
            goToVerifyAccount(policyID, backTo);
            return;
        }
        prepareOption(setupType);
        openFirstFlowStep({policyID, backTo, isNonUSD});
    }

    // The user picked an option, was sent to validate the account and came back validated. This prepares the data for
    // that option, and the verify page opens the flow.
    const prepareRememberedOption = useEffectEvent(() => {
        if (!isUserValidated || !optionPressed) {
            return;
        }
        prepareOption(optionPressed);
        setSetupOptionPressed(null);
    });

    useEffect(() => {
        prepareRememberedOption();
    }, [isUserValidated, optionPressed]);

    // A resumed USD setup never goes through Plaid again. It shows the manual variant with the numbers locked.
    // The flow opens without a step and resumes on its own (BC-10).
    const continueSetup = () => {
        if (isNonUSD) {
            openFlow(flowTarget);
            return;
        }
        navigateWhileShown(saveDraft({setupType: SBO_CONST.SETUP_TYPE.MANUAL}), () => openFlow(flowTarget));
    };

    return {
        connectWithPlaid: () => connect(SBO_CONST.SETUP_TYPE.PLAID),
        connectManually: () => connect(SBO_CONST.SETUP_TYPE.MANUAL),
        continueSetup,
    };
}

export default useSetupOptionPress;
export type {SetupOptionPress, SetupOptionPressInput};
