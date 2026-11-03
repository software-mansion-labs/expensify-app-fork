import cardScarf from '@assets/images/card-scarf.svg';

import CardPreview from '@components/CardPreview';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import variables from '@styles/variables';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

import FraudReviewOutcomeScreen from './FraudReviewOutcomeScreen';

type FrozenCardOutcomeScreenProps = {
    onUnfreezePress: () => void;
    onClose: () => void;
};

const SCARF_OVERLAY_STYLE = {
    top: 0,
    left: (variables.cardPreviewWidth - variables.cardScarfOverlayWidth) / 2,
    zIndex: variables.cardScarfOverlayZIndex,
    width: variables.cardScarfOverlayWidth,
    height: variables.cardScarfOverlayHeight,
};

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
                        overlayContainerStyle={SCARF_OVERLAY_STYLE}
                    />
                </View>
            }
            title={translate('multifactorAuthentication.fraudReview.yourCardHasBeenFrozen')}
            subtitle={translate('multifactorAuthentication.fraudReview.weFrozeYourCard')}
            secondaryButtonText={translate('cardPage.unfreezeCard')}
            onSecondaryButtonPress={onUnfreezePress}
            secondaryButtonSentryLabel={CONST.SENTRY_LABEL.MULTIFACTOR_AUTHENTICATION.REVIEW_TRANSACTION_UNFREEZE_CARD}
            onClose={onClose}
        />
    );
}

FrozenCardOutcomeScreen.displayName = 'FrozenCardOutcomeScreen';

export default FrozenCardOutcomeScreen;
