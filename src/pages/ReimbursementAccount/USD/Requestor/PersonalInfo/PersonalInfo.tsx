import DynamicFormFlow from '@components/DynamicForm';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import toDynamicFormValues from '@components/DynamicForm/utils/toDynamicFormValues';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import RenderHTML from '@components/RenderHTML';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useReimbursementAccountSubmitCallback from '@hooks/useReimbursementAccountSubmitCallback';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLatestErrorMessage} from '@libs/ErrorUtils';
import {getBankAccountIDAsNumber} from '@libs/ReimbursementAccountUtils';

import {updatePersonalInformationForBankAccount} from '@userActions/BankAccounts';
import {saveDraftAnswers} from '@userActions/DynamicForm';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

import React, {useEffect} from 'react';
import {View} from 'react-native';

import personalInfoForm, {getMissingPersonalInfoPrefill, getPersonalInfoParams} from './personalInfoForm';

type PersonalInfoProps = {
    /** Goes to the previous step */
    onBackButtonPress: () => void;

    /** Goes to the next step, once the bank account has saved this one */
    onSubmit?: () => void;

    /** Back to URL for preserving navigation context */
    backTo?: string;
};

const FORM_ID = ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM;

/** Where this step sits among `CONST.BANK_ACCOUNT.STEP_NAMES` */
const STEP_INDEX = 2;

/** The "Personal info" step of the USD bank account setup. Each page is saved to the bank account as the user leaves it, and Confirm saves the whole step. */
function PersonalInfo({onBackButtonPress, onSubmit, backTo}: PersonalInfoProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM_DRAFT);

    const achData = reimbursementAccount?.achData;
    const policyID = achData?.policyID;
    const draftValues = toDynamicFormValues(draft);
    const markSubmitting = useReimbursementAccountSubmitCallback(onSubmit);

    // The form reads its answers from the draft and picks its first page from them, so the ones the bank account already holds are copied there before the form mounts
    const missingPrefill = getMissingPersonalInfoPrefill(achData, draftValues);
    const isPrefillPending = !isEmptyObject(missingPrefill);
    useEffect(() => {
        if (!isPrefillPending) {
            return;
        }
        saveDraftAnswers(FORM_ID, missingPrefill);
    }, [isPrefillPending, missingPrefill]);

    const save = (answers: DynamicFormValues, isConfirmPage: boolean) => {
        updatePersonalInformationForBankAccount(getBankAccountIDAsNumber(achData), getPersonalInfoParams(answers, !!achData?.isOnfidoSetupComplete), policyID, isConfirmPage);
    };

    if (isPrefillPending) {
        return <FullScreenLoadingIndicator shouldUseGoBackButton />;
    }

    return (
        <DynamicFormFlow
            schema={personalInfoForm}
            formID={FORM_ID}
            testID="PersonalInfo"
            headerTitle={translate('personalInfoStep.personalInfo')}
            confirmationTitle={translate('personalInfoStep.letsDoubleCheck')}
            parentSteps={{names: CONST.BANK_ACCOUNT.STEP_NAMES, index: STEP_INDEX}}
            buildRoute={(pageName, action) => ROUTES.BANK_ACCOUNT_USD_SETUP.getRoute({policyID, page: CONST.BANK_ACCOUNT.PAGE_NAMES.REQUESTOR, subPage: pageName, action, backTo})}
            onBack={onBackButtonPress}
            // The draft a page was opened with lacks that page's new answers, so they go on top
            onPageSubmit={(page, answers) => save({...draftValues, ...answers}, false)}
            onSubmit={(answers) => {
                save(answers, true);
                markSubmitting();
            }}
            isSubmitting={!!reimbursementAccount?.isLoading}
            submitError={getLatestErrorMessage(reimbursementAccount ?? {})}
        >
            <View style={styles.renderHTML}>
                <RenderHTML html={translate('onfidoStep.onfidoLinks', `${translate('personalInfoStep.byAddingThisBankAccount')} `)} />
            </View>
        </DynamicFormFlow>
    );
}

export default PersonalInfo;
