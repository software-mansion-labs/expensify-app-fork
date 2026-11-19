import type {Route as Routes} from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type FlowPageParams = {
    policyID?: string;
    page?: string;
    subPage?: string;
    action?: 'edit';
    // eslint-disable-next-line no-restricted-syntax -- The lab reproduces the backTo threading of the real bank account flow on purpose
    backTo?: Routes;
};

type BankOnboardingLabParamList = {
    [SCREENS.SETTINGS.BANK_ONBOARDING_LAB.ENTRY]: {
        policyID?: string;
        isChangingBankAccount?: 'true';
        // eslint-disable-next-line no-restricted-syntax -- The lab reproduces the backTo threading of the real bank account flow on purpose
        backTo?: Routes;
    };
    [SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP]: FlowPageParams;
    [SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP]: FlowPageParams;
    [SCREENS.SETTINGS.BANK_ONBOARDING_LAB.VERIFY_ACCOUNT]: {
        policyID?: string;
    };
    [SCREENS.SETTINGS.BANK_ONBOARDING_LAB.ENTER_SIGNER_INFO]: {
        policyID?: string;
        bankAccountID?: string;
        isCompleted?: 'true';
        subPage?: string;
        action?: 'edit';
    };
};

export default BankOnboardingLabParamList;
