/**
 * The page that waits for the invited directors. It can send them a reminder. The real flow learns from a push that a
 * director filled in the form, so here a mock button opens that form, and the page continues once the server data holds
 * the names of the directors.
 */
import Button from '@components/Button';
import FormHelpMessage from '@components/FormHelpMessage';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLatestErrorMessage} from '@libs/ErrorUtils';

import type {CustomStepProps} from '@pages/SimplifiedBankOnboarding/controller/types';
import getBankAccountParams from '@pages/SimplifiedBankOnboarding/requests/getBankAccountParams';
import {sendSignerReminder} from '@pages/SimplifiedBankOnboarding/requests/nonUSD/signerInfo';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import useRequestState from '@pages/SimplifiedBankOnboarding/requests/useRequestState';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';

type HangTightStepProps = Pick<CustomStepProps, 'policyID' | 'onComplete'> & {
    /** The directors filled in their details, so the flow can go on */
    canContinue: boolean;

    /** Opens the page that an invited director receives */
    openSignerForm: (policyID: string | undefined, bankAccountID: number | undefined) => void;
};

function HangTightStep({policyID, canContinue, openSignerForm, onComplete}: HangTightStepProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const reminderState = useRequestState(REQUEST_NAMES.SEND_SIGNER_REMINDER);

    const achData = account?.achData;

    const sendReminder = () => {
        sendSignerReminder(getBankAccountParams(policyID, achData));
    };

    return (
        <ScrollView contentContainerStyle={[styles.flexGrow1, styles.pb5]}>
            <View style={[styles.flexGrow1, styles.justifyContentCenter, styles.alignItemsCenter]}>
                <Text style={[styles.textHeadlineLineHeightXXL, styles.mh5, styles.mb3, styles.mt5]}>{translate('signerInfoStep.hangTight')}</Text>
                <Text style={[styles.textAlignCenter, styles.mutedTextLabel, styles.mh5]}>{translate('signerInfoStep.weAreWaiting')}</Text>
            </View>
            <View style={[styles.ph5, styles.gap3]}>
                <FormHelpMessage message={getLatestErrorMessage({errors: reminderState.errors})} />
                <Button
                    onPress={() => openSignerForm(policyID, achData?.bankAccountID)}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.CHANGE_MOCK_SERVER}
                >
                    <Button.Text>[mock] Open the form that the director received</Button.Text>
                </Button>
                <Button
                    onPress={sendReminder}
                    isLoading={reminderState.isPending}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SEND_REMINDER}
                >
                    <Button.Text>{translate('signerInfoStep.sendReminder')}</Button.Text>
                </Button>
                <Button
                    variant={CONST.BUTTON_VARIANT.SUCCESS}
                    size={CONST.BUTTON_SIZE.LARGE}
                    onPress={() => onComplete()}
                    isDisabled={!canContinue}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
                >
                    <Button.Text>{translate('common.continue')}</Button.Text>
                </Button>
            </View>
        </ScrollView>
    );
}

export default HangTightStep;
