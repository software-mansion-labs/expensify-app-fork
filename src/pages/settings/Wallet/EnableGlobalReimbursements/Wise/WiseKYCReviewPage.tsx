import ConfirmationPage from '@components/ConfirmationPage';
import FixedFooter from '@components/FixedFooter';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import Header from '@components/Header';
import ScreenWrapper from '@components/ScreenWrapper';

import useDynamicBackPath from '@hooks/useDynamicBackPath';
import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import usePermissions from '@hooks/usePermissions';
import useThemeStyles from '@hooks/useThemeStyles';

import createDynamicRoute from '@libs/Navigation/helpers/dynamicRoutesUtils/createDynamicRoute';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import Navigation from '@navigation/Navigation';
import type {SettingsNavigatorParamList} from '@navigation/types';

import {clearWiseKYCReviewEmbeddedLink, getWiseKYCReviewEmbeddedLink} from '@userActions/Wise';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import {DYNAMIC_ROUTES} from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

import React, {useEffect, useState} from 'react';

type WiseKYCReviewPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.SETTINGS.WALLET.DYNAMIC_WISE_KYC_REVIEW>;

/** Sends the user to Wise's own page for the details only Wise can collect */
function WiseKYCReviewPage({route}: WiseKYCReviewPageProps) {
    const bankAccountID = Number(route.params.bankAccountID);
    const termsPath = useDynamicBackPath(DYNAMIC_ROUTES.WISE_KYC_REVIEW.path);
    const [embeddedLink] = useOnyx(ONYXKEYS.RAM_ONLY_WISE_KYC_REVIEW_EMBEDDED_LINK);

    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const {isBetaEnabledOrUnknown} = usePermissions();
    const isWiseReimbursementsBetaEnabled = isBetaEnabledOrUnknown(CONST.BETAS.WISE_REIMBURSEMENTS);
    const styles = useThemeStyles();
    const illustrations = useMemoizedLazyIllustrations(['UserShield']);

    const goBackToTerms = () => Navigation.goBack(termsPath);

    useEffect(() => {
        if (isWiseReimbursementsBetaEnabled !== false) {
            return;
        }
        goBackToTerms();
    }, [isWiseReimbursementsBetaEnabled, goBackToTerms]);

    // Only a link asked for on this visit opens Wise's page. The embedded page drops the link when it closes, so going back does not open it again.
    const [hasRequestedLink, setHasRequestedLink] = useState(false);
    const url = embeddedLink?.url;
    useEffect(() => {
        if (!hasRequestedLink || !url) {
            return;
        }
        Navigation.navigate(createDynamicRoute(DYNAMIC_ROUTES.WISE_EMBEDDED_KYC_REVIEW.path));
    }, [hasRequestedLink, url]);

    // The link carries a token, so it does not outlive the page
    useEffect(() => () => clearWiseKYCReviewEmbeddedLink(), []);

    if (!isWiseReimbursementsBetaEnabled) {
        return <FullScreenLoadingIndicator shouldUseGoBackButton />;
    }

    return (
        <ScreenWrapper testID="WiseKYCReviewPage">
            <Header>
                <Header.BackButton onPress={goBackToTerms} />
                <Header.Title title={translate('walletPage.wiseOnboarding.kycReview.headerTitle')} />
            </Header>
            <ConfirmationPage>
                <ConfirmationPage.Content>
                    <ConfirmationPage.Illustration illustration={illustrations.UserShield} />
                    <ConfirmationPage.Heading>{translate('walletPage.wiseOnboarding.kycReview.title')}</ConfirmationPage.Heading>
                    <ConfirmationPage.Description style={styles.textSupporting}>{translate('walletPage.wiseOnboarding.kycReview.subtitle')}</ConfirmationPage.Description>
                </ConfirmationPage.Content>
                <FixedFooter>
                    {/* A read is not queued offline, so the link can only be fetched online */}
                    <ConfirmationPage.PrimaryButton
                        text={translate('common.continue')}
                        isDisabled={isOffline}
                        isLoading={!!embeddedLink?.isLoading}
                        onPress={() => {
                            setHasRequestedLink(true);
                            getWiseKYCReviewEmbeddedLink(bankAccountID);
                        }}
                    />
                </FixedFooter>
            </ConfirmationPage>
        </ScreenWrapper>
    );
}

export default WiseKYCReviewPage;
