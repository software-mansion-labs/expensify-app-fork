import DynamicFormFlow from '@components/DynamicForm';
import useDraftPrefill from '@components/DynamicForm/hooks/useDraftPrefill';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useReimbursementAccountSubmitCallback from '@hooks/useReimbursementAccountSubmitCallback';

import {getLatestErrorMessage} from '@libs/ErrorUtils';

import type NonUSDPageProps from '@pages/ReimbursementAccount/NonUSD/types';
import requiresDocusignStep from '@pages/ReimbursementAccount/NonUSD/utils/requiresDocusignStep';

import {clearReimbursementAccountFinishCorpayBankAccountOnboarding, finishCorpayBankAccountOnboarding} from '@userActions/BankAccounts';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React from 'react';

import getAgreementsForm, {getAgreementsParams, getAgreementsPrefill} from './getAgreementsForm';

const FORM_ID = ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM;

/** Where this step sits among the steps of the non-USD bank account setup */
const STEP_INDEX = 5;

/** The "Agreements" step of the non-USD bank account setup. It finishes the onboarding, unless a Docusign step comes next and sends the agreements itself. */
function Agreements({onBackButtonPress, onSubmit, policyID, currency, stepNames, backTo}: NonUSDPageProps) {
    const {translate} = useLocalize();

    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);
    const isPrefillPending = useDraftPrefill(FORM_ID, getAgreementsPrefill(reimbursementAccount?.achData?.corpay));
    const title = translate('agreementsStep.agreements');

    // A failed request does not always come back with an error, so the step only moves on once the onboarding is finished
    const markSubmitting = useReimbursementAccountSubmitCallback(() => {
        if (!reimbursementAccount?.isSuccess) {
            return;
        }
        onSubmit();
        clearReimbursementAccountFinishCorpayBankAccountOnboarding();
    }, 'isFinishingCorpayBankAccountOnboarding');

    return (
        <DynamicFormFlow
            schema={getAgreementsForm(currency)}
            formID={FORM_ID}
            testID="Agreements"
            headerTitle={title}
            // The step has no confirmation page, so this title only shows if the schema ever loses its page
            confirmationTitle={title}
            parentSteps={{names: stepNames ?? CONST.NON_USD_BANK_ACCOUNT.STEP_NAMES, index: STEP_INDEX}}
            hasConfirmation={false}
            maxFileSize={CONST.CORPAY_DOCUMENT.MAX_FILE_SIZE}
            buildRoute={(pageName, action) =>
                ROUTES.BANK_ACCOUNT_NON_USD_SETUP.getRoute({policyID, page: CONST.NON_USD_BANK_ACCOUNT.PAGE_NAME.AGREEMENTS, subPage: pageName, action, backTo})
            }
            onBack={onBackButtonPress}
            onSubmit={(answers) => {
                if (requiresDocusignStep(currency)) {
                    onSubmit();
                    return;
                }
                finishCorpayBankAccountOnboarding({inputs: getAgreementsParams(answers), bankAccountID: reimbursementAccount?.achData?.bankAccountID ?? CONST.DEFAULT_NUMBER_ID});
                markSubmitting();
            }}
            // The page reads its answers from the draft when it mounts, so it waits for the saved agreements to reach the draft
            isLoading={isPrefillPending}
            isSubmitting={!!reimbursementAccount?.isFinishingCorpayBankAccountOnboarding}
            submitError={getLatestErrorMessage(reimbursementAccount ?? {})}
        />
    );
}

export default Agreements;
