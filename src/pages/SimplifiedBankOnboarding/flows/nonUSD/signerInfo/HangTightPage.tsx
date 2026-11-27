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

import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/core';
import {useRequest} from '@pages/SimplifiedBankOnboarding/core';
import type {CustomPageProps} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type {OnyxEntry} from 'react-native-onyx';

import React from 'react';
import {View} from 'react-native';

type HangTightPageProps = Pick<CustomPageProps, 'policyID' | 'onComplete'> & {
    /** Reminds the invited directors to fill in their details */
    request: PlannedRequest;

    /** The directors filled in their details, so the flow can go on */
    canComplete: boolean;

    /** Opens the page that an invited director receives */
    openSignerForm: (policyID: string | undefined, bankAccountID: number | undefined) => void;
};

const bankAccountIDSelector = (account: OnyxEntry<OnboardingAccount>) => account?.achData?.bankAccountID;

function HangTightPage({request, policyID, canComplete, openSignerForm, onComplete}: HangTightPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [bankAccountID] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {selector: bankAccountIDSelector});
    const {send: sendReminder, isPending: isSendingReminder, errorMessage: reminderErrorMessage} = useRequest(request);

    return (
        <ScrollView contentContainerStyle={[styles.flexGrow1, styles.pb5]}>
            <View style={[styles.flexGrow1, styles.justifyContentCenter, styles.alignItemsCenter]}>
                <Text style={[styles.textHeadlineLineHeightXXL, styles.mh5, styles.mb3, styles.mt5]}>{translate('signerInfoStep.hangTight')}</Text>
                <Text style={[styles.textAlignCenter, styles.mutedTextLabel, styles.mh5]}>{translate('signerInfoStep.weAreWaiting')}</Text>
            </View>
            <View style={[styles.ph5, styles.gap3]}>
                <FormHelpMessage message={reminderErrorMessage} />
                <Button
                    onPress={() => openSignerForm(policyID, bankAccountID)}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.OPEN_SIGNER_FORM}
                >
                    <Button.Text>[mock] Open the form that the director received</Button.Text>
                </Button>
                <Button
                    onPress={() => {
                        sendReminder();
                    }}
                    isLoading={isSendingReminder}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SEND_REMINDER}
                >
                    <Button.Text>{translate('signerInfoStep.sendReminder')}</Button.Text>
                </Button>
                <Button
                    variant={CONST.BUTTON_VARIANT.SUCCESS}
                    size={CONST.BUTTON_SIZE.LARGE}
                    onPress={() => onComplete()}
                    isDisabled={!canComplete}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
                >
                    <Button.Text>{translate('common.continue')}</Button.Text>
                </Button>
            </View>
        </ScrollView>
    );
}

export default HangTightPage;
