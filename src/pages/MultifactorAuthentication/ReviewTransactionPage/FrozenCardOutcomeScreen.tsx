import cardScarf from '@assets/images/card-scarf.svg';

import Button from '@components/Button';
import CardPreview from '@components/CardPreview';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

import FraudReviewOutcomeScreen from './FraudReviewOutcomeScreen';

type FrozenCardOutcomeScreenProps = {
    onUnfreezePress: () => void;
    onClose: () => void;
};

/** Result of reporting fraud when the card gets frozen, with a way to unfreeze it */
function FrozenCardOutcomeScreen({onUnfreezePress, onClose}: FrozenCardOutcomeScreenProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    return (
        <FraudReviewOutcomeScreen
            headerTitle={translate('multifactorAuthentication.fraudReview.frozenCard')}
            illustration={
                <View style={styles.mb5}>
                    <CardPreview
                        overlayImage={cardScarf}
                        overlayContainerStyle={styles.cardScarfOverlay}
                        shouldShowCardHolder={false}
                    />
                </View>
            }
            title={translate('multifactorAuthentication.fraudReview.yourCardHasBeenFrozen')}
            subtitle={translate('multifactorAuthentication.fraudReview.weFrozeYourCard')}
            onClose={onClose}
        >
            <Button
                size={CONST.BUTTON_SIZE.LARGE}
                onPress={onUnfreezePress}
                sentryLabel={CONST.SENTRY_LABEL.MULTIFACTOR_AUTHENTICATION.REVIEW_TRANSACTION_UNFREEZE_CARD}
            >
                <Button.Text>{translate('cardPage.unfreezeCard')}</Button.Text>
            </Button>
        </FraudReviewOutcomeScreen>
    );
}

FrozenCardOutcomeScreen.displayName = 'FrozenCardOutcomeScreen';

export default FrozenCardOutcomeScreen;
