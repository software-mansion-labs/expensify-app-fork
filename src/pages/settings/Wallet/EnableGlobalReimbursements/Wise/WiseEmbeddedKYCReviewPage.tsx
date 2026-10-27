import Button from '@components/Button';
import FixedFooter from '@components/FixedFooter';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import Header from '@components/Header';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';

import useDynamicBackPath from '@hooks/useDynamicBackPath';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@navigation/Navigation';

import {clearWiseKYCReviewEmbeddedLink} from '@userActions/Wise';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import {DYNAMIC_ROUTES} from '@src/ROUTES';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';

import React, {useEffect} from 'react';
import {View} from 'react-native';

/** Wise's embedded KYC page. Until the embedded page lands (https://github.com/Expensify/Expensify/issues/683080), it shows the link in place of the page. */
function WiseEmbeddedKYCReviewPage() {
    const kycReviewPath = useDynamicBackPath(DYNAMIC_ROUTES.WISE_EMBEDDED_KYC_REVIEW.path);
    const [embeddedLink, embeddedLinkMetadata] = useOnyx(ONYXKEYS.RAM_ONLY_WISE_KYC_REVIEW_EMBEDDED_LINK);
    const url = embeddedLink?.url;
    const isMissingLink = !isLoadingOnyxValue(embeddedLinkMetadata) && !url;

    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const goBackToKYCReview = () => Navigation.goBack(kycReviewPath);

    // The link lives in memory only, so a reload or a direct link has none. The KYC review page fetches a new one.
    useEffect(() => {
        if (!isMissingLink) {
            return;
        }
        goBackToKYCReview();
    }, [isMissingLink, goBackToKYCReview]);

    // The link carries a token, so it does not outlive the page
    useEffect(() => () => clearWiseKYCReviewEmbeddedLink(), []);

    if (!url) {
        return <FullScreenLoadingIndicator shouldUseGoBackButton />;
    }

    return (
        <ScreenWrapper
            testID="WiseEmbeddedKYCReviewPage"
            includeSafeAreaPaddingBottom
        >
            <Header>
                <Header.BackButton onPress={goBackToKYCReview} />
                <Header.Title title={translate('walletPage.wiseOnboarding.kycReview.headerTitle')} />
            </Header>
            <View style={[styles.flex1, styles.ph5, styles.justifyContentCenter]}>
                <Text
                    selectable
                    style={styles.textAlignCenter}
                >
                    {url}
                </Text>
            </View>
            <FixedFooter>
                <Button
                    variant={CONST.BUTTON_VARIANT.SUCCESS}
                    size={CONST.BUTTON_SIZE.LARGE}
                    testID="WiseEmbeddedKYCReviewDoneButton"
                    onPress={() => Navigation.dismissModal()}
                >
                    <Button.Text>{translate('common.done')}</Button.Text>
                </Button>
            </FixedFooter>
        </ScreenWrapper>
    );
}

export default WiseEmbeddedKYCReviewPage;
