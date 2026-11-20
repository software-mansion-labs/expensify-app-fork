/**
 * The buttons that play the reviewer on the mock server. The real flow has nothing like them: there the review ends on the
 * backend and the client learns about it from a push.
 */
import Button from '@components/Button';
import Text from '@components/Text';

import useThemeStyles from '@hooks/useThemeStyles';

import {finishReview} from '@pages/SimplifiedBankOnboarding/mockBackend/serverEvents';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

type MockReviewButtonsProps = {
    /** The workspace whose review ends. The buttons are hidden while it is unknown. */
    policyID: string | undefined;

    /** Only the USD flow can end a review by asking for the test deposits */
    canRequestMicroDeposits?: boolean;
};

const {REVIEW_OUTCOME} = SBO_CONST.MOCK;

function MockReviewButtons({policyID, canRequestMicroDeposits = false}: MockReviewButtonsProps) {
    const styles = useThemeStyles();

    if (!policyID) {
        return null;
    }

    return (
        <View style={[styles.mt5, styles.gap3]}>
            <Text style={styles.textLabelSupporting}>[mock] Play the reviewer on the server:</Text>
            <Button
                onPress={() => finishReview(policyID, REVIEW_OUTCOME.OPEN)}
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.CHANGE_MOCK_SERVER}
            >
                <Button.Text>[mock] Approve the bank account</Button.Text>
            </Button>
            {canRequestMicroDeposits && (
                <Button
                    onPress={() => finishReview(policyID, REVIEW_OUTCOME.MICRO_DEPOSITS)}
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.CHANGE_MOCK_SERVER}
                >
                    <Button.Text>[mock] Ask for the test deposits</Button.Text>
                </Button>
            )}
        </View>
    );
}

export default MockReviewButtons;
