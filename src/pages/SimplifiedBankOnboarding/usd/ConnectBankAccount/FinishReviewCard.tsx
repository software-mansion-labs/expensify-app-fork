/**
 * The card of an account in review. The real card offers a chat with Concierge, a way back to the details and a reset.
 * The lab keeps the way back to the details, which only navigates because the URL owns the position in the flow. In place
 * of the chat it shows the buttons that play the reviewer on the mock server.
 */
import Button from '@components/Button';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';

import MockReviewButtons from '@pages/SimplifiedBankOnboarding/components/MockReviewButtons';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type USDPageProps from '@pages/SimplifiedBankOnboarding/usd/types';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

import React from 'react';

type FinishReviewCardProps = Pick<USDPageProps, 'policyID' | 'backTo'>;

function FinishReviewCard({policyID, backTo}: FinishReviewCardProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const updateDetails = () => {
        Navigation.navigate(
            ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({
                policyID,
                page: SBO_CONST.USD.PAGE_NAMES.REQUESTOR,
                subPage: SBO_CONST.USD.PERSONAL_INFO_SUB_PAGES.FULL_NAME,
                backTo,
            }),
        );
    };

    return (
        <ScrollView
            style={styles.flex1}
            contentContainerStyle={styles.mh5}
        >
            <Text style={[styles.textHeadlineLineHeightXXL, styles.mb3]}>{translate('workspace.bankAccount.letsFinishInChat')}</Text>
            <Text style={styles.mb6}>{translate('connectBankAccountStep.letsChatText')}</Text>
            <Button
                onPress={updateDetails}
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
