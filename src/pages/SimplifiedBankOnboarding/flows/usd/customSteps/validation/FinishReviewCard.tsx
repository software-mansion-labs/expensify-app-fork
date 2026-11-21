/**
 * The card of an account in review. The real card offers a chat with Concierge, a way back to the details and a reset.
 * The lab keeps the way back to the details, which only opens the personal info step: the plan already holds its pages,
 * so no write is needed first. In place of the chat it shows the buttons that play the reviewer on the mock server.
 */
import Button from '@components/Button';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {CustomStepProps} from '@pages/SimplifiedBankOnboarding/core';
import MockReviewButtons from '@pages/SimplifiedBankOnboarding/flows/shared/MockReviewButtons';

import CONST from '@src/CONST';

import React from 'react';

type FinishReviewCardProps = Pick<CustomStepProps, 'policyID' | 'goToStep'>;

function FinishReviewCard({policyID, goToStep}: FinishReviewCardProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    return (
        <ScrollView
            style={styles.flex1}
            contentContainerStyle={styles.mh5}
        >
            <Text style={[styles.textHeadlineLineHeightXXL, styles.mb3]}>{translate('workspace.bankAccount.letsFinishInChat')}</Text>
            <Text style={styles.mb6}>{translate('connectBankAccountStep.letsChatText')}</Text>
            <Button
                onPress={() => goToStep(SBO_CONST.USD.PAGE_NAMES.REQUESTOR)}
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.CONTINUE_SETUP}
            >
                <Button.Text>{translate('workspace.bankAccount.updateDetails')}</Button.Text>
            </Button>
            <MockReviewButtons
                policyID={policyID}
                canRequestMicroDeposits
            />
        </ScrollView>
    );
}

export default FinishReviewCard;
