/**
 * The one step of a director who was invited by email: their name, job title and confirmation on the signer form. A
 * success clears that form and goes back. A link that says the form was already filled in shows the done view instead.
 */
import Button from '@components/Button';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {NEXT_STEP, OnboardingStep, useFlowData, useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core';
import renderSignerDetailsPages from '@pages/SimplifiedBankOnboarding/flows/shared/signerDetails/renderSignerDetailsPages';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

import getInvitedSignerAnswers from './invitedSignerAnswers';
import invitedSignerDetailsRequest from './invitedSignerDetailsRequest';

type InvitedSignerStepProps = {
    /** The link says that the form was already filled in */
    isCompleted: boolean;
};

function InvitedSignerStep({isCompleted}: InvitedSignerStepProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {leaveFlow} = useOnboardingFlow();
    const answers = getInvitedSignerAnswers(useFlowData());

    return (
        <OnboardingStep
            title={translate('signerInfoStep.signerInfo')}
            wrapperID="SimplifiedBankOnboardingEnterSignerInfo"
        >
            {isCompleted ? (
                <View style={[styles.mh5, styles.gap3]}>
                    <Text style={styles.textHeadlineLineHeightXXL}>{translate('workspace.bankAccount.allSet')}</Text>
                    <Button
                        onPress={leaveFlow}
                        sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
                    >
                        <Button.Text>{translate('common.close')}</Button.Text>
                    </Button>
                </View>
            ) : (
                renderSignerDetailsPages(translate, {
                    askForName: true,
                    values: answers,
                    request: invitedSignerDetailsRequest,
                    next: NEXT_STEP,
                })
            )}
        </OnboardingStep>
    );
}

export default InvitedSignerStep;
