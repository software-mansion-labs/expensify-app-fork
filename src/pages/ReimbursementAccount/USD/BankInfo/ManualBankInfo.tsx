/**
 * The manual variant of the "Bank info" step of the USD bank account setup, where the user types the routing and account numbers from a check.
 */
import DynamicFormFlow from '@components/DynamicForm';
import useDraftPrefill from '@components/DynamicForm/hooks/useDraftPrefill';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useReimbursementAccountSubmitCallback from '@hooks/useReimbursementAccountSubmitCallback';

import {getLatestErrorMessage} from '@libs/ErrorUtils';
import {getBankAccountIDAsNumber} from '@libs/ReimbursementAccountUtils';

import type USDPageProps from '@pages/ReimbursementAccount/USD/types';
import getSubStepValues from '@pages/ReimbursementAccount/utils/getSubStepValues';

import {connectBankAccountManually} from '@userActions/BankAccounts';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';

import React from 'react';

import ExampleCheckImage from './ExampleCheck';
import getManualBankInfoForm, {getManualBankInfoErrors, getManualBankInfoParams, getManualBankInfoPrefill} from './getManualBankInfoForm';

const FORM_ID = ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM;

/** Where this step sits among `CONST.BANK_ACCOUNT.STEP_NAMES` */
const STEP_INDEX = 1;

function ManualBankInfo({onBackButtonPress, onSubmit, policyID, backTo}: USDPageProps) {
    const {translate} = useLocalize();

    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);
    const [reimbursementAccountDraft] = useOnyx(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM_DRAFT);

    const achData = reimbursementAccount?.achData;
    const markSubmitting = useReimbursementAccountSubmitCallback(onSubmit);
    const isPrefillPending = useDraftPrefill(FORM_ID, getManualBankInfoPrefill(achData));
    const title = translate('bankAccount.bankInfo');

    if (isPrefillPending) {
        return <FullScreenLoadingIndicator shouldUseGoBackButton />;
    }

    return (
        <DynamicFormFlow
            schema={getManualBankInfoForm(!!achData?.bankAccountID)}
            formID={FORM_ID}
            testID="ManualBankInfo"
            headerTitle={title}
            // The step has no confirmation page, so this title only shows if the schema ever loses its page
            confirmationTitle={title}
            parentSteps={{names: CONST.BANK_ACCOUNT.STEP_NAMES, index: STEP_INDEX}}
            hasConfirmation={false}
            buildRoute={(pageName, action) => ROUTES.BANK_ACCOUNT_USD_SETUP.getRoute({policyID, page: CONST.BANK_ACCOUNT.PAGE_NAMES.BANK_ACCOUNT, subPage: pageName, action, backTo})}
            onBack={onBackButtonPress}
            validatePage={(page, values) => getManualBankInfoErrors(values, translate)}
            onSubmit={(answers) => {
                const savedBankDetails = getSubStepValues(INPUT_IDS.BANK_INFO_STEP, reimbursementAccountDraft, reimbursementAccount);
                connectBankAccountManually(getBankAccountIDAsNumber(achData), getManualBankInfoParams(answers, savedBankDetails), policyID);
                markSubmitting();
            }}
            isSubmitting={!!reimbursementAccount?.isLoading}
            submitError={getLatestErrorMessage(reimbursementAccount ?? {})}
        >
            <ExampleCheckImage />
        </DynamicFormFlow>
    );
}

export default ManualBankInfo;
