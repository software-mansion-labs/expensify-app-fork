/**
 * The sub page that waits for the invited directors. Like the real one it can send a reminder, which it follows by its own
 * request ID. The real flow learns from a push that a director filled in the form, so here a mock button
 * opens that form, and the step continues once the server data holds the names of the directors.
 */
import Button from '@components/Button';
import DotIndicatorMessage from '@components/DotIndicatorMessage';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';

import {sendReminderForSignerInformation} from '@pages/SimplifiedBankOnboarding/actions/GlobalBankAccount';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import useStepRequest from '@pages/SimplifiedBankOnboarding/requests/useStepRequest';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

import React from 'react';
import {View} from 'react-native';

type HangTightProps = {
    policyID: string | undefined;

    /** The bank account that the reminder is about */
    bankAccountParams: BankAccountParams;

    /** Whether the server holds the data of every director that the currency needs */
    haveDirectorsFilledInData: boolean;

    /** Goes to the next step once the directors filled in their data */
    onContinue: () => void;
};

function HangTight({policyID, bankAccountParams, haveDirectorsFilledInData, onContinue}: HangTightProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {send, isPending: isSendingReminder, errorMessage: error} = useStepRequest();

    const sendReminder = () => {
        send((requestID) => sendReminderForSignerInformation(requestID, bankAccountParams));
    };

    const openDirectorForm = () => {
        Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_ENTER_SIGNER_INFO.getRoute({policyID, bankAccountID: bankAccountParams.bankAccountID}));
    };

    return (
        <ScrollView contentContainerStyle={[styles.flexGrow1, styles.pb5]}>
            <View style={[styles.flexGrow1, styles.justifyContentCenter, styles.alignItemsCenter]}>
                <Text style={[styles.textHeadlineLineHeightXXL, styles.mh5, styles.mb3, styles.mt5]}>{translate('signerInfoStep.hangTight')}</Text>
                <Text style={[styles.textAlignCenter, styles.mutedTextLabel, styles.mh5]}>{translate('signerInfoStep.weAreWaiting')}</Text>
            </View>
            <View style={[styles.ph5, styles.gap3]}>
                {!!error && (
                    <DotIndicatorMessage
                        textStyles={[styles.formError]}
                        type="error"
                        messages={{error}}
                    />
                )}
                <Button
                    onPress={openDirectorForm}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.CHANGE_MOCK_SERVER}
                >
                    <Button.Text>[mock] Open the form that the director received</Button.Text>
                </Button>
                <Button
                    onPress={sendReminder}
                    isLoading={isSendingReminder}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SEND_REMINDER}
                >
                    <Button.Text>{translate('signerInfoStep.sendReminder')}</Button.Text>
                </Button>
                <Button
                    variant={CONST.BUTTON_VARIANT.SUCCESS}
                    size={CONST.BUTTON_SIZE.LARGE}
                    onPress={onContinue}
                    isDisabled={!haveDirectorsFilledInData}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
                >
                    <Button.Text>{translate('common.continue')}</Button.Text>
                </Button>
            </View>
        </ScrollView>
    );
}

export default HangTight;
