import ConfirmationPage from '@components/ConfirmationPage';
import FixedFooter from '@components/FixedFooter';
import Header from '@components/Header';
import ScreenWrapper from '@components/ScreenWrapper';

import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@navigation/Navigation';

import ROUTES from '@src/ROUTES';

import React from 'react';

/** Where Wise sends the user back once its KYC form ends: the last step of the flow */
function WiseAccountApprovedPage() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const illustrations = useMemoizedLazyIllustrations(['Fireworks']);

    const goBackToWallet = () => Navigation.goBack(ROUTES.SETTINGS_WALLET);

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
                        onPress={goBackToWallet}
                    />
                </FixedFooter>
            </ConfirmationPage>
        </ScreenWrapper>
    );
}

export default WiseAccountApprovedPage;
