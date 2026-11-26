/**
 * The page that waits for the invited directors. It sends reminders, and the step continues once the server holds the
 * names of every director that the currency needs. The real flow learns from a push that a director filled in the form,
 * so here a mock button opens that form.
 */
import Button from '@components/Button';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {areSignersKnown} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';
import {NEXT_STEP, openFlow, RequestErrorMessage, useOnboardingFlow, useOnboardingRequest, usePageNavigation} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';

import {signerReminderRequest} from './signerRequests';

type HangTightPageProps = {
    currency: string;
};

function HangTightPage({currency}: HangTightPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {target, bankAccount} = useOnboardingFlow();
    const {goNext} = usePageNavigation();
    const [corpay] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {selector: (account) => account?.achData?.corpay});
    const reminder = useOnboardingRequest(signerReminderRequest);

    const canContinue = areSignersKnown(corpay, currency);

    const openDirectorForm = () => {
        openFlow({kind: 'enterSignerInfo', policyID: target.policyID, bankAccountID: bankAccount.bankAccountID});
    };

    const sendReminder = () => {
        reminder.send();
    };

    const continueToNextStep = () => {
        goNext(NEXT_STEP);
    };

    return (
        <ScrollView contentContainerStyle={[styles.flexGrow1, styles.pb5]}>
            <View style={[styles.flexGrow1, styles.justifyContentCenter, styles.alignItemsCenter]}>
                <Text style={[styles.textHeadlineLineHeightXXL, styles.mh5, styles.mb3, styles.mt5]}>{translate('signerInfoStep.hangTight')}</Text>
                <Text style={[styles.textAlignCenter, styles.mutedTextLabel, styles.mh5]}>{translate('signerInfoStep.weAreWaiting')}</Text>
            </View>
            <View style={[styles.ph5, styles.gap3]}>
                <RequestErrorMessage message={reminder.errorMessage} />
                <Button
                    onPress={openDirectorForm}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.CHANGE_MOCK_SERVER}
                >
                    <Button.Text>[mock] Open the form that the director received</Button.Text>
                </Button>
                <Button
                    onPress={sendReminder}
                    isLoading={reminder.isPending}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SEND_REMINDER}
                >
                    <Button.Text>{translate('signerInfoStep.sendReminder')}</Button.Text>
                </Button>
                <Button
                    variant={CONST.BUTTON_VARIANT.SUCCESS}
                    size={CONST.BUTTON_SIZE.LARGE}
                    onPress={continueToNextStep}
                    isDisabled={!canContinue}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
                >
                    <Button.Text>{translate('common.continue')}</Button.Text>
                </Button>
            </View>
        </ScrollView>
    );
}

export default HangTightPage;
export type {HangTightPageProps};
