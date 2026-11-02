import ConfirmationPage from '@components/ConfirmationPage';
import FixedFooter from '@components/FixedFooter';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import Header from '@components/Header';
import ScreenWrapper from '@components/ScreenWrapper';

import useAndroidBackButtonHandler from '@hooks/useAndroidBackButtonHandler';
import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import usePermissions from '@hooks/usePermissions';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@navigation/Navigation';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

import React, {useEffect} from 'react';

/** Where Wise sends the user back once its KYC form ends. The outcome reaches Onyx through Wise's webhook, so the page reads nothing from the redirect. */
function WiseAccountApprovedPage() {
    const {translate} = useLocalize();
    const {isBetaEnabledOrUnknown} = usePermissions();
    const isWiseReimbursementsBetaEnabled = isBetaEnabledOrUnknown(CONST.BETAS.WISE_REIMBURSEMENTS);
    const styles = useThemeStyles();
    const illustrations = useMemoizedLazyIllustrations(['Fireworks']);

    const goBackToWallet = () => Navigation.goBack(ROUTES.SETTINGS_WALLET);

    // The flow is finished, so Android's back leaves it like the header does instead of returning to a page of the flow underneath
    useAndroidBackButtonHandler(() => {
        goBackToWallet();
        return true;
    });

    useEffect(() => {
        if (isWiseReimbursementsBetaEnabled !== false) {
            return;
        }
        // Wise's redirect loads the app fresh, so the betas can arrive before navigation is ready to leave
        Navigation.isNavigationReady().then(goBackToWallet);
    }, [isWiseReimbursementsBetaEnabled, goBackToWallet]);

    if (!isWiseReimbursementsBetaEnabled) {
        return <FullScreenLoadingIndicator shouldUseGoBackButton />;
    }

    return (
        <ScreenWrapper
            testID="WiseAccountApprovedPage"
            shouldShowOfflineIndicatorInWideScreen
        >
            <Header>
                <Header.BackButton onPress={goBackToWallet} />
                <Header.Title title={translate('walletPage.wiseOnboarding.accountApproved.headerTitle')} />
            </Header>
            <ConfirmationPage>
                <ConfirmationPage.Content>
                    <ConfirmationPage.Illustration illustration={illustrations.Fireworks} />
                    <ConfirmationPage.Heading>{translate('walletPage.wiseOnboarding.accountApproved.title')}</ConfirmationPage.Heading>
                    <ConfirmationPage.Description style={styles.textSupporting}>{translate('walletPage.wiseOnboarding.accountApproved.subtitle')}</ConfirmationPage.Description>
                </ConfirmationPage.Content>
                <FixedFooter>
                    <ConfirmationPage.PrimaryButton
                        text={translate('common.done')}
                        sentryLabel={CONST.SENTRY_LABEL.WISE_ACCOUNT_APPROVED.DONE}
                        onPress={goBackToWallet}
                    />
                </FixedFooter>
            </ConfirmationPage>
        </ScreenWrapper>
    );
}

export default WiseAccountApprovedPage;
