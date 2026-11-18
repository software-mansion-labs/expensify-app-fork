import DynamicFormFlow from '@components/DynamicForm';

import useDynamicBackPath from '@hooks/useDynamicBackPath';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import {getLatestErrorMessage} from '@libs/ErrorUtils';
import mapCurrencyToCountry from '@libs/mapCurrencyToCountry';
import createDynamicRoute from '@libs/Navigation/helpers/dynamicRoutesUtils/createDynamicRoute';

import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {ReimbursementAccountEnterSignerInfoNavigatorParamList} from '@navigation/types';

import getSignerDetailsForm, {getSignerDetailsParams} from '@pages/ReimbursementAccount/utils/getSignerDetailsForm';

import {clearEnterSignerInformationFormSave, saveCorpayOnboardingDirectorInformation} from '@userActions/BankAccounts';
import {clearErrors} from '@userActions/FormActions';

import ONYXKEYS from '@src/ONYXKEYS';
import {DYNAMIC_ROUTES} from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

import {emailSelector} from '@selectors/Session';
import React, {useEffect} from 'react';

type EnterSignerInfoProps = PlatformStackScreenProps<ReimbursementAccountEnterSignerInfoNavigatorParamList, typeof SCREENS.DYNAMIC_REIMBURSEMENT_ACCOUNT_ENTER_SIGNER_INFO>;

const FORM_ID = ONYXKEYS.FORMS.ENTER_SINGER_INFO_FORM;

function EnterSignerInfo({route}: EnterSignerInfoProps) {
    const {translate} = useLocalize();
    const {policyID, bankAccountID} = route.params;
    const [signerEmail = ''] = useOnyx(ONYXKEYS.SESSION, {selector: emailSelector});
    const [enterSignerInfoForm] = useOnyx(FORM_ID);
    const [reimbursementAccountDraft] = useOnyx(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM_DRAFT);
    const [policy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`);

    const currency = policy?.outputCurrency ?? reimbursementAccountDraft?.currency ?? '';
    const schema = getSignerDetailsForm({currency, country: mapCurrencyToCountry(currency) ?? reimbursementAccountDraft?.country ?? '', isUserOwner: false});

    const basePath = useDynamicBackPath(DYNAMIC_ROUTES.BANK_ACCOUNT_ENTER_SIGNER_INFO.path);
    const buildRoute = (subPage: string, action?: 'edit') =>
        createDynamicRoute(DYNAMIC_ROUTES.BANK_ACCOUNT_ENTER_SIGNER_INFO.getRoute(policyID, bankAccountID, route.params.isCompleted === 'true', subPage, action), basePath);

    useEffect(() => {
        if (enterSignerInfoForm?.errors || enterSignerInfoForm?.isSavingSignerInformation || !enterSignerInfoForm?.isSuccess) {
            return;
        }
        clearEnterSignerInformationFormSave();
        Navigation.closeRHPFlow();
    }, [enterSignerInfoForm?.errors, enterSignerInfoForm?.isSavingSignerInformation, enterSignerInfoForm?.isSuccess]);

    useEffect(() => {
        clearErrors(FORM_ID);
    }, []);

    return (
        <DynamicFormFlow
            schema={schema}
            formID={FORM_ID}
            testID="EnterSignerInfo"
            headerTitle={translate('signerInfoStep.signerInfo')}
            confirmationTitle={translate('signerInfoStep.letsDoubleCheck')}
            buildRoute={buildRoute}
            onBack={() => {
                clearErrors(FORM_ID);
                Navigation.goBack(basePath);
            }}
            onSubmit={(answers) => {
                const {signerDetails, signerFiles} = getSignerDetailsParams(answers, signerEmail);
                saveCorpayOnboardingDirectorInformation({inputs: JSON.stringify(signerDetails), ...signerFiles, bankAccountID: Number(bankAccountID)});
            }}
            isSubmitting={!!enterSignerInfoForm?.isSavingSignerInformation}
            submitError={getLatestErrorMessage(enterSignerInfoForm)}
        />
    );
}

export default EnterSignerInfo;
