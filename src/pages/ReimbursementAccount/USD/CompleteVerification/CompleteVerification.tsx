import DynamicFormFlow from '@components/DynamicForm';
import useDraftPrefill from '@components/DynamicForm/hooks/useDraftPrefill';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useReimbursementAccountSubmitCallback from '@hooks/useReimbursementAccountSubmitCallback';

import {getLatestErrorMessage} from '@libs/ErrorUtils';
import {getBankAccountIDAsNumber} from '@libs/ReimbursementAccountUtils';

import type USDPageProps from '@pages/ReimbursementAccount/USD/types';

import {acceptACHContractForBankAccount} from '@userActions/BankAccounts';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React from 'react';

import completeVerificationForm, {getCompleteVerificationParams, getCompleteVerificationPrefill} from './completeVerificationForm';

const FORM_ID = ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM;

/** Where this step sits among `CONST.BANK_ACCOUNT.STEP_NAMES` */
const STEP_INDEX = 6;

/** The "Complete verification" step of the USD bank account setup, where the user accepts the agreements and the bank account is sent for verification */
function CompleteVerification({onBackButtonPress, onSubmit, backTo}: USDPageProps) {
    const {translate} = useLocalize();

    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);
    const [lastPaymentMethod] = useOnyx(ONYXKEYS.NVP_LAST_PAYMENT_METHOD);

    const achData = reimbursementAccount?.achData;
    const policyID = achData?.policyID;
    const markSubmitting = useReimbursementAccountSubmitCallback(onSubmit);
    const isPrefillPending = useDraftPrefill(FORM_ID, getCompleteVerificationPrefill(achData));
    const title = translate('completeVerificationStep.completeVerification');

    if (isPrefillPending) {
        return <FullScreenLoadingIndicator shouldUseGoBackButton />;
    }

    return (
        <DynamicFormFlow
            schema={completeVerificationForm}
            formID={FORM_ID}
            testID="CompleteVerification"
            headerTitle={title}
            // The step has no confirmation page, so this title only shows if the schema ever loses its page
            confirmationTitle={title}
            parentSteps={{names: CONST.BANK_ACCOUNT.STEP_NAMES, index: STEP_INDEX}}
            hasConfirmation={false}
            buildRoute={(pageName, action) => ROUTES.BANK_ACCOUNT_USD_SETUP.getRoute({policyID, page: CONST.BANK_ACCOUNT.PAGE_NAMES.ACH_CONTRACT, subPage: pageName, action, backTo})}
            onBack={onBackButtonPress}
            onSubmit={(answers) => {
                acceptACHContractForBankAccount(getBankAccountIDAsNumber(achData), getCompleteVerificationParams(answers), policyID, policyID ? lastPaymentMethod?.[policyID] : undefined);
                markSubmitting();
            }}
            isSubmitting={!!reimbursementAccount?.isLoading}
            submitError={getLatestErrorMessage(reimbursementAccount ?? {})}
        />
    );
}

export default CompleteVerification;
