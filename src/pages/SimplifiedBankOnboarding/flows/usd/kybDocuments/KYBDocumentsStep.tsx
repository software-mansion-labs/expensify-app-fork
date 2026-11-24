/**
 * The document step of the USD flow. The flow shows it only while the server asks for company documents, and it has no
 * step counter. It renders one file input per document that the server asked for, and each input saves its files to the
 * draft. Once the server accepts the documents it stops asking for them, so the flow skips the step and opens the
 * validation in its place.
 */
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {FormSubPage, OnboardingStep} from '@pages/SimplifiedBankOnboarding/core';
import DraftFileInput from '@pages/SimplifiedBankOnboarding/flows/shared/files/DraftFileInput';
import {useUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/usd/usdAnswers';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

import getRequiredKYBDocuments from './getRequiredKYBDocuments';
import kybDocumentsRequest from './kybDocumentsRequest';

function DocumentsPage() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const answers = useUSDAnswers();

    const requiredDocuments = getRequiredKYBDocuments(answers.requiredKYBDocuments);

    return (
        <FormSubPage
            title={translate('documentsStep.beforeYouGo')}
            description={translate('documentsStep.verificationFailed')}
            inputIDs={requiredDocuments.map((document) => document.inputID)}
            request={kybDocumentsRequest}
            submitButtonText={translate('common.verify')}
        >
            {requiredDocuments.map((document, index) => (
                <View key={document.inputID}>
                    <Text style={[styles.textNormalThemeText, styles.textLineHeightNormal, styles.textStrong, styles.mb3]}>{translate(document.title)}</Text>
                    <DraftFileInput
                        inputID={document.inputID}
                        defaultFiles={answers.kybFiles[document.inputID]}
                        fileLimit={CONST.CORPAY_DOCUMENT.FILE_LIMIT}
                    />
                    <Text style={[styles.mutedTextLabel, styles.mt3]}>{translate(document.description)}</Text>
                    {requiredDocuments.length > index + 1 && <View style={[styles.sectionDividerLine, styles.mv6]} />}
                </View>
            ))}
        </FormSubPage>
    );
}

function KYBDocumentsStep() {
    const {translate} = useLocalize();

    return (
        <OnboardingStep
            title={translate('documentsStep.subheader')}
            wrapperID="SimplifiedBankOnboardingKYBDocuments"
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
        >
            <DocumentsPage />
        </OnboardingStep>
    );
}

export default KYBDocumentsStep;
