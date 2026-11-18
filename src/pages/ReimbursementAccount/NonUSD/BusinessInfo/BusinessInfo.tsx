import DynamicFormFlow from '@components/DynamicForm';
import useDraftPrefill from '@components/DynamicForm/hooks/useDraftPrefill';

import useEnvironment from '@hooks/useEnvironment';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import useReimbursementAccountSubmitCallback from '@hooks/useReimbursementAccountSubmitCallback';

import {getDefaultCompanyWebsite} from '@libs/BankAccountUtils';
import {getLatestErrorMessage} from '@libs/ErrorUtils';

import type NonUSDPageProps from '@pages/ReimbursementAccount/NonUSD/types';
import getCurrencyForNonUSDBankAccount from '@pages/ReimbursementAccount/NonUSD/utils/getCurrencyForNonUSDBankAccount';

import {clearReimbursementAccountSaveCorpayOnboardingCompanyDetails, getCorpayOnboardingFields, saveCorpayOnboardingCompanyDetails} from '@userActions/BankAccounts';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import {primaryLoginSelector} from '@src/selectors/Account';
import {emailSelector} from '@src/selectors/Session';

import React, {useEffect} from 'react';

import getBusinessInfoForm, {getBusinessInfoParams, getBusinessInfoPrefill, getBusinessInfoRuleErrors} from './getBusinessInfoForm';

const FORM_ID = ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM;

/** Where this step sits among the steps of the non-USD bank account setup */
const STEP_INDEX = 2;

/** The "Business info" step of the non-USD bank account setup. Its option lists come from Corpay and depend on the bank's country. */
function BusinessInfo({onBackButtonPress, onSubmit, policyID: policyIDProp, stepNames, backTo}: NonUSDPageProps) {
    const {translate} = useLocalize();
    const {isProduction} = useEnvironment();

    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);
    const [reimbursementAccountDraft] = useOnyx(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM_DRAFT);
    const [corpayOnboardingFields] = useOnyx(ONYXKEYS.CORPAY_ONBOARDING_FIELDS);
    const [email] = useOnyx(ONYXKEYS.SESSION, {selector: emailSelector});
    const [primaryLogin] = useOnyx(ONYXKEYS.ACCOUNT, {selector: primaryLoginSelector});
    const policyID = policyIDProp ?? reimbursementAccount?.achData?.policyID;
    const [policy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`);
    const {country, currency} = getCurrencyForNonUSDBankAccount(policy, reimbursementAccountDraft, reimbursementAccount);
    const picklists = corpayOnboardingFields?.picklists;
    // Built before the first hook that reads the country, so React Compiler keeps caching getCurrencyForNonUSDBankAccount
    const schema = getBusinessInfoForm({country, currency, picklists, translate});

    const defaultWebsite = email ? getDefaultCompanyWebsite({email}, undefined, true) : '';
    const isPrefillPending = useDraftPrefill(FORM_ID, getBusinessInfoPrefill(reimbursementAccount?.achData, country, defaultWebsite, primaryLogin));

    // A failed request does not always come back with an error, so the step only moves on once the details are saved
    const markSubmitting = useReimbursementAccountSubmitCallback(() => {
        if (!reimbursementAccount?.isSuccess) {
            return;
        }
        onSubmit();
        clearReimbursementAccountSaveCorpayOnboardingCompanyDetails();
    }, 'isSavingCorpayOnboardingCompanyFields');

    useNetwork({
        onReconnect: () => {
            getCorpayOnboardingFields(country);
        },
    });

    useEffect(() => {
        getCorpayOnboardingFields(country);
    }, [country]);

    return (
        <DynamicFormFlow
            schema={schema}
            formID={FORM_ID}
            testID="BusinessInfo"
            headerTitle={translate('businessInfoStep.businessInfoTitle')}
            confirmationTitle={translate('businessInfoStep.letsDoubleCheck')}
            parentSteps={{names: stepNames ?? CONST.NON_USD_BANK_ACCOUNT.STEP_NAMES, index: STEP_INDEX}}
            buildRoute={(pageName, action) =>
                ROUTES.BANK_ACCOUNT_NON_USD_SETUP.getRoute({policyID, page: CONST.NON_USD_BANK_ACCOUNT.PAGE_NAME.BUSINESS_INFO, subPage: pageName, action, backTo})
            }
            onBack={onBackButtonPress}
            onSubmit={(answers) => {
                saveCorpayOnboardingCompanyDetails(getBusinessInfoParams(answers, country, currency, isProduction), reimbursementAccount?.achData?.bankAccountID ?? CONST.DEFAULT_NUMBER_ID);
                markSubmitting();
            }}
            validatePage={(page, values) => getBusinessInfoRuleErrors(page, values, country, translate)}
            // A saved select answer is invalid until its Corpay option list loads, so the flow waits for the lists before it picks the first unanswered page
            isLoading={!picklists || isPrefillPending}
            isSubmitting={!!reimbursementAccount?.isSavingCorpayOnboardingCompanyFields}
            submitError={getLatestErrorMessage(reimbursementAccount ?? {})}
        />
    );
}

export default BusinessInfo;
