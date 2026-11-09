import Button from '@components/Button';
import Header from '@components/Header';
import {HTMLSubtitle} from '@components/MultifactorAuthentication/components/OutcomeScreen/OutcomeScreenBase';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import type {ReactNode} from 'react';

import React from 'react';
import {View} from 'react-native';

type FraudReviewOutcomeScreenProps = {
    headerTitle: string;
    illustration: ReactNode;
    title: string;

    /** HTML, so it can link to Concierge or the card page */
    subtitle: string;

    /** Extra action shown above the confirm button, e.g. a way to unfreeze the card */
    children: ReactNode;

    onClose: () => void;
};

/** Result of answering a fraud review that the cardholder can act on, e.g. by unfreezing the card */
function FraudReviewOutcomeScreen({headerTitle, illustration, title, subtitle, children, onClose}: FraudReviewOutcomeScreenProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    return (
        <ScreenWrapper testID={FraudReviewOutcomeScreen.displayName}>
            <Header>
                <Header.BackButton onPress={onClose} />
                <Header.Title title={headerTitle} />
            </Header>
            <ScrollView
                style={styles.flex1}
                contentContainerStyle={[styles.flexGrow1, styles.justifyContentCenter, styles.alignItemsCenter, styles.ph5]}
            >
                {illustration}
                <Text style={[styles.notFoundTextHeader, styles.mb2]}>{title}</Text>
                <HTMLSubtitle htmlString={subtitle} />
            </ScrollView>
            <View style={[styles.m5, styles.mt0, styles.gap3]}>
                {children}
                <Button
                    size={CONST.BUTTON_SIZE.LARGE}
                    variant={CONST.BUTTON_VARIANT.SUCCESS}
                    onPress={onClose}
                    sentryLabel={CONST.SENTRY_LABEL.MULTIFACTOR_AUTHENTICATION.REVIEW_TRANSACTION_OUTCOME_CONFIRM}
                >
                    <Button.Text>{translate('common.buttonConfirm')}</Button.Text>
                </Button>
            </View>
        </ScreenWrapper>
    );
}

FraudReviewOutcomeScreen.displayName = 'FraudReviewOutcomeScreen';

export default FraudReviewOutcomeScreen;
