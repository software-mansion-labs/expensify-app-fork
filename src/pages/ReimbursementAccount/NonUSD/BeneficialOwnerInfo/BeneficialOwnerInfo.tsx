import DynamicFormFlow from '@components/DynamicForm';
import useDraftPrefill from '@components/DynamicForm/hooks/useDraftPrefill';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useReimbursementAccountSubmitCallback from '@hooks/useReimbursementAccountSubmitCallback';

import {getLatestErrorMessage} from '@libs/ErrorUtils';

import type NonUSDPageProps from '@pages/ReimbursementAccount/NonUSD/types';
import getCurrencyForNonUSDBankAccount from '@pages/ReimbursementAccount/NonUSD/utils/getCurrencyForNonUSDBankAccount';

import {clearReimbursementAccountSaveCorpayOnboardingBeneficialOwners, saveCorpayOnboardingBeneficialOwners} from '@userActions/BankAccounts';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';

import React from 'react';

import getBeneficialOwnerInfoForm, {getBeneficialOwnerInfoParams, getBeneficialOwnerInfoPrefill, getOwnershipTotalErrors} from './getBeneficialOwnerInfoForm';

const FORM_ID = ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM;
const {COMPANY_NAME, OWNS_MORE_THAN_25_PERCENT} = INPUT_IDS.ADDITIONAL_DATA.CORPAY;

/** Where this step sits among the steps of the non-USD bank account setup */
const STEP_INDEX = 3;

/** The "Beneficial owners" step of the non-USD bank account setup. The documents Corpay asks of each owner depend on the bank account's currency and country. */
function BeneficialOwnerInfo({onBackButtonPress, onSubmit, policyID: policyIDProp, stepNames, backTo}: NonUSDPageProps) {
    const {translate} = useLocalize();

    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);
    const [reimbursementAccountDraft] = useOnyx(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM_DRAFT);
    const policyID = policyIDProp ?? reimbursementAccount?.achData?.policyID;
    const [policy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`);
    const {country, currency} = getCurrencyForNonUSDBankAccount(policy, reimbursementAccountDraft, reimbursementAccount);
    const companyName = reimbursementAccount?.achData?.corpay?.[COMPANY_NAME] ?? reimbursementAccountDraft?.[COMPANY_NAME] ?? '';
    const isUserOwner = !!reimbursementAccountDraft?.[OWNS_MORE_THAN_25_PERCENT];
    const bankAccountID = reimbursementAccount?.achData?.bankAccountID ?? CONST.DEFAULT_NUMBER_ID;

    const isPrefillPending = useDraftPrefill(FORM_ID, getBeneficialOwnerInfoPrefill(reimbursementAccount?.achData?.corpay));

    // A failed request does not always come back with an error, so the step only moves on once the owners are saved
    const markSubmitting = useReimbursementAccountSubmitCallback(() => {
        if (!reimbursementAccount?.isSuccess) {
            return;
        }
        onSubmit();
        clearReimbursementAccountSaveCorpayOnboardingBeneficialOwners();
    }, 'isSavingCorpayOnboardingBeneficialOwnersFields');

    return (
        <DynamicFormFlow
            schema={getBeneficialOwnerInfoForm(translate, companyName, isUserOwner, currency, country)}
            formID={FORM_ID}
            testID="BeneficialOwnerInfo"
            headerTitle={translate('ownershipInfoStep.ownerInfo')}
            confirmationTitle={translate('beneficialOwnerInfoStep.letsDoubleCheck')}
            confirmationSubtitle={translate('beneficialOwnerInfoStep.regulationRequiresUsToVerifyTheIdentity')}
            parentSteps={{names: stepNames ?? CONST.NON_USD_BANK_ACCOUNT.STEP_NAMES, index: STEP_INDEX}}
            maxFileSize={CONST.CORPAY_DOCUMENT.MAX_FILE_SIZE}
            buildRoute={(pageName, action) =>
                ROUTES.BANK_ACCOUNT_NON_USD_SETUP.getRoute({policyID, page: CONST.NON_USD_BANK_ACCOUNT.PAGE_NAME.BENEFICIAL_OWNER_INFO, subPage: pageName, action, backTo})
            }
            onBack={onBackButtonPress}
            onSubmit={(answers) => {
                saveCorpayOnboardingBeneficialOwners(getBeneficialOwnerInfoParams(answers, bankAccountID));
                markSubmitting();
            }}
            validatePage={(page, values) => getOwnershipTotalErrors(page, values, translate)}
            // The flow picks the first unanswered page when it mounts, so it waits for the saved owners to reach the draft
            isLoading={isPrefillPending}
            isSubmitting={!!reimbursementAccount?.isSavingCorpayOnboardingBeneficialOwnersFields}
            submitError={getLatestErrorMessage(reimbursementAccount ?? {})}
        />
    );
}

export default BeneficialOwnerInfo;
