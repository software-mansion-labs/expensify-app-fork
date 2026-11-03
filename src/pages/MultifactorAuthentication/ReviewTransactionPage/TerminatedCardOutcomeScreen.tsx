import cardTerminated from '@assets/images/multifactorAuthentication/card-terminated.svg';

import ImageSVG from '@components/ImageSVG';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import variables from '@styles/variables';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

import FraudReviewOutcomeScreen from './FraudReviewOutcomeScreen';

type TerminatedCardOutcomeScreenProps = {
    onCardDetailsPress: () => void;
    onClose: () => void;
};

/** Result of reporting fraud when a repeated report terminates the card */
function TerminatedCardOutcomeScreen({onCardDetailsPress, onClose}: TerminatedCardOutcomeScreenProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    return (
        <FraudReviewOutcomeScreen
            headerTitle={translate('multifactorAuthentication.fraudReview.cardTerminated')}
            illustration={
                <View style={styles.mb5}>
                    <ImageSVG
                        src={cardTerminated}
                        width={variables.cardTerminatedWidth}
                        height={variables.cardTerminatedHeight}
                    />
                </View>
            }
            title={translate('multifactorAuthentication.fraudReview.yourCardHasBeenTerminated')}
            subtitle={translate('multifactorAuthentication.fraudReview.weTerminatedYourCard')}
            secondaryButtonText={translate('multifactorAuthentication.fraudReview.goToCardDetails')}
            onSecondaryButtonPress={onCardDetailsPress}
            secondaryButtonSentryLabel={CONST.SENTRY_LABEL.MULTIFACTOR_AUTHENTICATION.REVIEW_TRANSACTION_GO_TO_CARD_DETAILS}
            onClose={onClose}
        />
    );
}

TerminatedCardOutcomeScreen.displayName = 'TerminatedCardOutcomeScreen';

export default TerminatedCardOutcomeScreen;
