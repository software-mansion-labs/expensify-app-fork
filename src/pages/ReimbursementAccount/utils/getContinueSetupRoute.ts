/**
 * Where "Continue setup" on the bank account entry page takes the user: the page of the setup that matches the account's progress.
 */
import getStartPageForContinueSetup from '@pages/ReimbursementAccount/NonUSD/utils/getStartPageForContinueSetup';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {ReimbursementAccountForm} from '@src/types/form/ReimbursementAccountForm';
import type {ACHDataReimbursementAccount, ReimbursementAccountStep} from '@src/types/onyx/ReimbursementAccount';

import type {OnyxEntry} from 'react-native-onyx';

const USD_STEP_TO_PAGE: Partial<Record<ReimbursementAccountStep, string>> = {
    [CONST.BANK_ACCOUNT.STEP.COUNTRY]: CONST.BANK_ACCOUNT.PAGE_NAMES.COUNTRY,
    [CONST.BANK_ACCOUNT.STEP.BANK_ACCOUNT]: CONST.BANK_ACCOUNT.PAGE_NAMES.BANK_ACCOUNT,
    [CONST.BANK_ACCOUNT.STEP.REQUESTOR]: CONST.BANK_ACCOUNT.PAGE_NAMES.REQUESTOR,
    [CONST.BANK_ACCOUNT.STEP.COMPANY]: CONST.BANK_ACCOUNT.PAGE_NAMES.COMPANY,
    [CONST.BANK_ACCOUNT.STEP.BENEFICIAL_OWNERS]: CONST.BANK_ACCOUNT.PAGE_NAMES.BENEFICIAL_OWNERS,
    [CONST.BANK_ACCOUNT.STEP.ACH_CONTRACT]: CONST.BANK_ACCOUNT.PAGE_NAMES.ACH_CONTRACT,
    [CONST.BANK_ACCOUNT.STEP.KYB_DOCS]: CONST.BANK_ACCOUNT.PAGE_NAMES.KYB_DOCS,
    [CONST.BANK_ACCOUNT.STEP.VALIDATION]: CONST.BANK_ACCOUNT.PAGE_NAMES.VALIDATION,
};

type ContinueSetupRouteParams = {
    /** Whether the account is set up in the non-USD flow */
    isNonUSDSetup: boolean;

    /** The USD step the account has reached */
    currentStep: ReimbursementAccountStep;

    /** The account being set up */
    achData: ACHDataReimbursementAccount | undefined;

    /** The values the user entered and has not submitted yet */
    reimbursementAccountDraft: OnyxEntry<ReimbursementAccountForm>;

    /** The currency of the workspace, or of the account when there is no workspace */
    policyCurrency: string | undefined;

    policyID: string | undefined;

    backTo: string | undefined;
};

function getContinueSetupRoute({isNonUSDSetup, currentStep, achData, reimbursementAccountDraft, policyCurrency, policyID, backTo}: ContinueSetupRouteParams) {
    if (isNonUSDSetup) {
        const {page, subPage} = getStartPageForContinueSetup(achData, reimbursementAccountDraft?.country ?? '', policyCurrency, reimbursementAccountDraft);
        return ROUTES.BANK_ACCOUNT_NON_USD_SETUP.getRoute({policyID, page, subPage, backTo});
    }

    return ROUTES.BANK_ACCOUNT_USD_SETUP.getRoute({policyID, page: USD_STEP_TO_PAGE[currentStep] ?? CONST.BANK_ACCOUNT.PAGE_NAMES.COUNTRY, backTo});
}

export default getContinueSetupRoute;
