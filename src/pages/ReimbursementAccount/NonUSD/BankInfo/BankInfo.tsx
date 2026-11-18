import DynamicFormFlow from '@components/DynamicForm';
import useDraftPrefill from '@components/DynamicForm/hooks/useDraftPrefill';

import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import useReimbursementAccountSubmitCallback from '@hooks/useReimbursementAccountSubmitCallback';

import {getLatestErrorMessage} from '@libs/ErrorUtils';

import NotFoundPage from '@pages/ErrorPage/NotFoundPage';
import type NonUSDPageProps from '@pages/ReimbursementAccount/NonUSD/types';
import getCurrencyForNonUSDBankAccount from '@pages/ReimbursementAccount/NonUSD/utils/getCurrencyForNonUSDBankAccount';

import {clearReimbursementAccountBankCreation, createCorpayBankAccount, getCorpayBankAccountFields} from '@userActions/BankAccounts';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React, {useEffect} from 'react';

import getBankInfoForm, {getBankInfoParams, getBankInfoPrefill, getBankInfoRuleErrors} from './getBankInfoForm';

const FORM_ID = ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM;

/** Where this step sits among the steps of the non-USD bank account setup */
const STEP_INDEX = 1;

/** The "Bank info" step of the non-USD bank account setup. Its fields come from Corpay and depend on the bank's country and currency. */
function BankInfo({onBackButtonPress, onSubmit, policyID, stepNames, backTo}: NonUSDPageProps) {
    const {translate} = useLocalize();

    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);
    const [reimbursementAccountDraft] = useOnyx(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM_DRAFT);
    const [corpayFields] = useOnyx(ONYXKEYS.CORPAY_FIELDS);
    const [policy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`);
    const {country, currency} = getCurrencyForNonUSDBankAccount(policy, reimbursementAccountDraft, reimbursementAccount);
    const formFields = corpayFields?.formFields;

    const isPrefillPending = useDraftPrefill(FORM_ID, getBankInfoPrefill(formFields, reimbursementAccount?.achData, country));

    // A failed request does not always come back with an error, so the step only moves on once the bank account is created
    const markSubmitting = useReimbursementAccountSubmitCallback(() => {
        if (!reimbursementAccount?.isSuccess) {
            return;
        }
        onSubmit();
        clearReimbursementAccountBankCreation();
    });

    useNetwork({
        onReconnect: () => {
            getCorpayBankAccountFields(country, currency);
        },
    });

    useEffect(() => {
        // No fetching when there is no country
        if (country === '') {
            return;
        }

        // When workspace currency is set to EUR we need to refetch if country from Step 1 doesn't match country inside fetched Corpay data
        if (currency === CONST.CURRENCY.EUR && country !== corpayFields?.bankCountry) {
            getCorpayBankAccountFields(country, currency);
            return;
        }

        // No fetching when workspace currency matches the currency inside fetched Corpay
        if (currency === corpayFields?.bankCurrency) {
            return;
        }

        getCorpayBankAccountFields(country, currency);
    }, [corpayFields?.bankCurrency, corpayFields?.bankCountry, country, currency]);

    if (corpayFields?.isLoading === false && corpayFields.isSuccess === false) {
        return <NotFoundPage />;
    }

    return (
        <DynamicFormFlow
            schema={getBankInfoForm(formFields)}
            formID={FORM_ID}
            testID="BankInfo"
            headerTitle={translate('bankAccount.bankInfo')}
            confirmationTitle={translate('bankInfoStep.letsDoubleCheck')}
            confirmationSubtitle={translate('bankInfoStep.thisBankAccount')}
            parentSteps={{names: stepNames ?? CONST.NON_USD_BANK_ACCOUNT.STEP_NAMES, index: STEP_INDEX}}
            buildRoute={(pageName, action) => ROUTES.BANK_ACCOUNT_NON_USD_SETUP.getRoute({policyID, page: CONST.NON_USD_BANK_ACCOUNT.PAGE_NAME.BANK_INFO, subPage: pageName, action, backTo})}
            onBack={onBackButtonPress}
            onSubmit={(answers) => {
                createCorpayBankAccount(getBankInfoParams(answers, corpayFields), policyID);
                markSubmitting();
            }}
            validatePage={(page, values) => getBankInfoRuleErrors(formFields, page, values)}
            // The pages read their answers from the draft when they mount, so they wait for the fields and for the saved answers to reach the draft
            isLoading={!formFields || !!corpayFields?.isLoading || isPrefillPending}
            isSubmitting={!!reimbursementAccount?.isLoading}
            submitError={getLatestErrorMessage(reimbursementAccount ?? {})}
        />
    );
}

export default BankInfo;
