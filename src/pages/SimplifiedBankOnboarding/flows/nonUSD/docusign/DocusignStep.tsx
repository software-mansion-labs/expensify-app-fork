/**
 * The docusign step of the NonUSD flow, only for a currency that needs the signed authorization form. It ends the
 * setup with the agreement answers, the bank statement of the agreements step and this form.
 */
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {FormSubPage, OnboardingStep, useFlowData} from '@pages/SimplifiedBankOnboarding/core';
import finishOnboardingRequest from '@pages/SimplifiedBankOnboarding/flows/nonUSD/agreements/finishOnboardingRequest';
import getAgreementsAnswers from '@pages/SimplifiedBankOnboarding/flows/nonUSD/agreements/getAgreementsAnswers';
import DraftFileInput from '@pages/SimplifiedBankOnboarding/flows/shared/files/DraftFileInput';

import CONST from '@src/CONST';

import React from 'react';

function DocusignStep() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {achAuthorizationForm} = getAgreementsAnswers(useFlowData());

    return (
        <OnboardingStep
            title={translate('docusignStep.subheader')}
            wrapperID="SimplifiedBankOnboardingDocusign"
        >
            <FormSubPage
                title={translate('docusignStep.pleaseCompleteTheBusinessAccount')}
                inputIDs={[INPUT_IDS.ACH_AUTHORIZATION_FORM]}
                request={finishOnboardingRequest}
                submitButtonText={translate('common.submit')}
                submitButtonStyles={styles.mb0}
            >
                <Text style={[styles.mt3, styles.mb5]}>{translate('docusignStep.pleaseUploadTheDirect')}</Text>
                <DraftFileInput
                    inputID={INPUT_IDS.ACH_AUTHORIZATION_FORM}
                    defaultFiles={achAuthorizationForm}
                    fileLimit={SBO_CONST.NON_USD.DOCUMENT_FILE_LIMIT}
                    maxFileSize={CONST.CORPAY_DOCUMENT.MAX_FILE_SIZE}
                />
            </FormSubPage>
        </OnboardingStep>
    );
}

export default DocusignStep;
