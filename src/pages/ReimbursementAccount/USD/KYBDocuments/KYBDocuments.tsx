/**
 * The "KYB documents" step of the USD bank account setup, where the user uploads the documents the verification could not confirm, or finishes in a chat with Concierge.
 */
import Button from '@components/Button';
import DynamicFormFlow from '@components/DynamicForm';

import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import {usePersonalDetailsByIDs} from '@hooks/usePersonalDetails';
import useReimbursementAccountSubmitCallback from '@hooks/useReimbursementAccountSubmitCallback';
import useThemeStyles from '@hooks/useThemeStyles';

import {getRequiredKYBDocuments} from '@libs/BankAccountUtils';
import {getLatestErrorMessage} from '@libs/ErrorUtils';

import type USDPageProps from '@pages/ReimbursementAccount/USD/types';

import {uploadUserKYBDocs} from '@userActions/BankAccounts';
import {navigateToConciergeChat} from '@userActions/Report';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import {guidedSetupAndTourStatusSelector} from '@selectors/Onboarding';
import React from 'react';

import getKYBDocumentsForm, {getKYBDocumentsParams} from './getKYBDocumentsForm';

function KYBDocuments({onBackButtonPress, onSubmit, backTo}: USDPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const [introSelected] = useOnyx(ONYXKEYS.NVP_INTRO_SELECTED);
    const [conciergePersonalDetails] = usePersonalDetailsByIDs([CONST.ACCOUNT_ID.CONCIERGE]);
    const [guidedSetupAndTourStatus] = useOnyx(ONYXKEYS.NVP_ONBOARDING, {selector: guidedSetupAndTourStatusSelector});
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();

    const achData = reimbursementAccount?.achData;
    const policyID = achData?.policyID;
    const isLoading = !!reimbursementAccount?.isLoading;
    const markSubmitting = useReimbursementAccountSubmitCallback(onSubmit);

    const finishViaChat = () =>
        navigateToConciergeChat({
            conciergeReportID,
            introSelected,
            currentUserAccountID,
            isSelfTourViewed: guidedSetupAndTourStatus?.isSelfTourViewed,
            hasCompletedGuidedSetupFlow: guidedSetupAndTourStatus?.hasCompletedGuidedSetupFlow,
            conciergePersonalDetails,
            shouldDismissModal: true,
            reportActionID: achData?.ACHRequestReportActionID,
        });

    return (
        <DynamicFormFlow
            schema={getKYBDocumentsForm(getRequiredKYBDocuments(achData?.verifications?.externalApiResponses))}
            formID={ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM}
            testID="KYBDocuments"
            headerTitle={translate('documentsStep.subheader')}
            // The step has no confirmation page, so this title only shows if the schema ever loses its page
            confirmationTitle={translate('documentsStep.subheader')}
            hasConfirmation={false}
            buildRoute={(pageName, action) => ROUTES.BANK_ACCOUNT_USD_SETUP.getRoute({policyID, page: CONST.BANK_ACCOUNT.PAGE_NAMES.KYB_DOCS, subPage: pageName, action, backTo})}
            onBack={onBackButtonPress}
            onSubmit={(answers) => {
                uploadUserKYBDocs({...getKYBDocumentsParams(answers), bankAccountID: achData?.bankAccountID ?? CONST.DEFAULT_NUMBER_ID});
                markSubmitting();
            }}
            isSubmitting={isLoading}
            submitError={getLatestErrorMessage(reimbursementAccount ?? {})}
        >
            <Button
                sentryLabel={CONST.SENTRY_LABEL.REIMBURSEMENT_ACCOUNT.KYB_DOCUMENTS_FINISH_VIA_CHAT}
                size={CONST.BUTTON_SIZE.LARGE}
                style={styles.mv3}
                onPress={finishViaChat}
                isDisabled={isLoading}
            >
                <Button.Text>{translate('documentsStep.finishViaChat')}</Button.Text>
            </Button>
        </DynamicFormFlow>
    );
}

export default KYBDocuments;
