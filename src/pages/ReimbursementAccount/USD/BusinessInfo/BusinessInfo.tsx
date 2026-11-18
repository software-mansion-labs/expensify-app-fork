import CheckboxWithLabel from '@components/CheckboxWithLabel';
import DynamicFormFlow from '@components/DynamicForm';
import useDraftPrefill from '@components/DynamicForm/hooks/useDraftPrefill';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import toDynamicFormValues from '@components/DynamicForm/utils/toDynamicFormValues';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import Text from '@components/Text';
import TextLink from '@components/TextLink';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useReimbursementAccountSubmitCallback from '@hooks/useReimbursementAccountSubmitCallback';

import {getLatestErrorMessage} from '@libs/ErrorUtils';
import {getBankAccountIDAsNumber} from '@libs/ReimbursementAccountUtils';

import type USDPageProps from '@pages/ReimbursementAccount/USD/types';

import {updateCompanyInformationForBankAccount} from '@userActions/BankAccounts';
import {saveDraftAnswers} from '@userActions/DynamicForm';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';

import React, {useState} from 'react';

import getBusinessInfoForm, {getBusinessInfoParams, getBusinessInfoPrefill, getLockedBusinessInfoKeys} from './businessInfoForm';

const FORM_ID = ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM;
const HAS_NO_CONNECTION_TO_CANNABIS_KEY = INPUT_IDS.BUSINESS_INFO_STEP.HAS_NO_CONNECTION_TO_CANNABIS;

/** Where this step sits among `CONST.BANK_ACCOUNT.STEP_NAMES` */
const STEP_INDEX = 4;

/** Label of the checkbox where the user confirms the company is not on the list of restricted businesses, which it links to */
function ConfirmCompanyLabel() {
    const {translate} = useLocalize();

    return (
        <Text>
            {`${translate('businessInfoStep.confirmCompanyIsNot')} `}
            <TextLink
                sentryLabel={CONST.SENTRY_LABEL.REIMBURSEMENT_ACCOUNT.BUSINESS_INFO_RESTRICTED_BUSINESSES_LINK}
                href={CONST.LIST_OF_RESTRICTED_BUSINESSES}
            >{`${translate('businessInfoStep.listOfRestrictedBusinesses')}.`}</TextLink>
        </Text>
    );
}

/** The "Business info" step of the USD bank account setup. Each page is saved to the bank account as the user leaves it, and Confirm saves the whole step. */
function BusinessInfo({onBackButtonPress, onSubmit, backTo}: USDPageProps) {
    const {translate} = useLocalize();

    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM_DRAFT);
    const [shouldShowRestrictedBusinessError, setShouldShowRestrictedBusinessError] = useState(false);

    const achData = reimbursementAccount?.achData;
    const policyID = achData?.policyID;
    const draftValues = toDynamicFormValues(draft);
    const lockedKeys = getLockedBusinessInfoKeys(achData);
    const markSubmitting = useReimbursementAccountSubmitCallback(onSubmit);
    const isPrefillPending = useDraftPrefill(FORM_ID, getBusinessInfoPrefill(achData), lockedKeys);
    const hasNoConnectionToCannabis = !!draft?.[HAS_NO_CONNECTION_TO_CANNABIS_KEY];

    const save = (answers: DynamicFormValues, isConfirmPage: boolean) => {
        const params = {...getBusinessInfoParams(answers, achData, draft), [HAS_NO_CONNECTION_TO_CANNABIS_KEY]: hasNoConnectionToCannabis};
        updateCompanyInformationForBankAccount(getBankAccountIDAsNumber(achData), params, policyID, isConfirmPage);
    };

    // The tick is drafted like the answers, so it is kept when the user leaves the step and comes back
    const toggleRestrictedBusinessConfirmation = (isChecked?: boolean) => {
        saveDraftAnswers(FORM_ID, {[HAS_NO_CONNECTION_TO_CANNABIS_KEY]: !!isChecked});
        setShouldShowRestrictedBusinessError(false);
    };

    if (isPrefillPending) {
        return <FullScreenLoadingIndicator shouldUseGoBackButton />;
    }

    return (
        <DynamicFormFlow
            schema={getBusinessInfoForm(lockedKeys)}
            formID={FORM_ID}
            testID="BusinessInfo"
            headerTitle={translate('businessInfoStep.businessInfo')}
            confirmationTitle={translate('businessInfoStep.letsDoubleCheck')}
            parentSteps={{names: CONST.BANK_ACCOUNT.STEP_NAMES, index: STEP_INDEX}}
            buildRoute={(pageName, action) => ROUTES.BANK_ACCOUNT_USD_SETUP.getRoute({policyID, page: CONST.BANK_ACCOUNT.PAGE_NAMES.COMPANY, subPage: pageName, action, backTo})}
            onBack={onBackButtonPress}
            // The draft a page was opened with lacks that page's new answers, so they go on top
            onPageSubmit={(page, answers) => save({...draftValues, ...answers}, false)}
            // The flow keeps the answers when nothing is sent, so the user can tick the box and confirm again
            onSubmit={(answers) => {
                if (!hasNoConnectionToCannabis) {
                    setShouldShowRestrictedBusinessError(true);
                    return;
                }
                save(answers, true);
                markSubmitting();
            }}
            isSubmitting={!!reimbursementAccount?.isLoading}
            submitError={getLatestErrorMessage(reimbursementAccount ?? {})}
        >
            <CheckboxWithLabel
                value={hasNoConnectionToCannabis}
                onInputChange={toggleRestrictedBusinessConfirmation}
                accessibilityLabel={`${translate('businessInfoStep.confirmCompanyIsNot')} ${translate('businessInfoStep.listOfRestrictedBusinesses')}`}
                LabelComponent={ConfirmCompanyLabel}
                errorText={shouldShowRestrictedBusinessError ? translate('bankAccount.error.restrictedBusiness') : undefined}
            />
        </DynamicFormFlow>
    );
}

export default BusinessInfo;
