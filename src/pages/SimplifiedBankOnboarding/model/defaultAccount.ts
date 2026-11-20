import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/types/onyx';

/** The account of a setup that has not reached the server yet */
const DEFAULT_ACCOUNT: OnboardingAccount = {
    achData: {
        state: SBO_CONST.STATE.SETUP,
        currentStep: SBO_CONST.USD.STEP.BANK_ACCOUNT,
        subStep: '',
    },
    isLoading: false,
    errors: null,
    errorFields: null,
    maxAttemptsReached: false,
    shouldShowResetModal: false,
};

export default DEFAULT_ACCOUNT;
