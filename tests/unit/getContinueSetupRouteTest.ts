import getContinueSetupRoute from '@pages/ReimbursementAccount/utils/getContinueSetupRoute';

import CONST from '@src/CONST';
import type {ReimbursementAccountForm} from '@src/types/form/ReimbursementAccountForm';

import createMock from '../utils/createMock';

const POLICY_ID = '1';

const USD_ACCOUNT = {isNonUSDSetup: false, achData: undefined, reimbursementAccountDraft: undefined, policyCurrency: CONST.CURRENCY.USD, policyID: POLICY_ID, backTo: undefined};

describe('getContinueSetupRoute', () => {
    it('resumes a USD account on the page of its step', () => {
        // Given USD accounts that stopped at the company step, and at the enable step, which has no page of its own
        // When the user continues the setup
        // Then the first resumes on the company page, and the second falls back to the start of the flow
        expect(getContinueSetupRoute({...USD_ACCOUNT, currentStep: CONST.BANK_ACCOUNT.STEP.COMPANY})).toBe(
            `bank-account/new/us/${CONST.BANK_ACCOUNT.PAGE_NAMES.COMPANY}?policyID=${POLICY_ID}`,
        );
        expect(getContinueSetupRoute({...USD_ACCOUNT, currentStep: CONST.BANK_ACCOUNT.STEP.ENABLE})).toBe(
            `bank-account/new/us/${CONST.BANK_ACCOUNT.PAGE_NAMES.COUNTRY}?policyID=${POLICY_ID}`,
        );
    });

    it('resumes a non-USD account where its progress stopped', () => {
        // Given a non-USD account whose country is picked but which the backend has not created yet
        const params = {
            ...USD_ACCOUNT,
            isNonUSDSetup: true,
            currentStep: CONST.BANK_ACCOUNT.STEP.COUNTRY,
            policyCurrency: CONST.CURRENCY.EUR,
            reimbursementAccountDraft: createMock<ReimbursementAccountForm>({country: 'DE'}),
        };

        // When the user continues the setup
        const route = getContinueSetupRoute(params);

        // Then the non-USD flow opens on the bank details, the next thing the account needs
        const {PAGE_NAME, BANK_INFO_STEP} = CONST.NON_USD_BANK_ACCOUNT;
        expect(route).toBe(`bank-account/new/global/${PAGE_NAME.BANK_INFO}/${BANK_INFO_STEP.SUB_PAGE_NAMES.BANK_ACCOUNT_DETAILS}?policyID=${POLICY_ID}`);
    });
});
