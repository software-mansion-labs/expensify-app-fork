/**
 * The one step of a director who was invited by email: their name, job title and confirmation on the signer form. A
 * success clears that form and goes back. A link that says the form was already filled in shows the done view instead.
 */
import Button from '@components/Button';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {NEXT_STEP, OnboardingStep, useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core';
import renderSignerDetailsPages from '@pages/SimplifiedBankOnboarding/flows/shared/signerDetails/renderSignerDetailsPages';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

import {useInvitedSignerAnswers} from './invitedSignerAnswers';
import invitedSignerDetailsRequest from './invitedSignerDetailsRequest';

function InvitedSignerStep() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {target, leaveFlow} = useOnboardingFlow();
    const answers = useInvitedSignerAnswers();

    const isCompleted = target.kind === 'enterSignerInfo' && target.isCompleted;

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
