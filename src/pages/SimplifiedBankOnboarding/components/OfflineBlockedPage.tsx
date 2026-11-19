/**
 * The page that a screen of the onboarding shows offline when it has no data of its own route to show.
 */
import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
import HeaderWithBackButtonAndTitle from '@components/Header/composed/HeaderWithBackButtonAndTitle';
import ScreenWrapper from '@components/ScreenWrapper';

import useLocalize from '@hooks/useLocalize';

import React from 'react';

type OfflineBlockedPageProps = {
    onBackButtonPress: () => void;
};

function OfflineBlockedPage({onBackButtonPress}: OfflineBlockedPageProps) {
    const {translate} = useLocalize();
    return (
        <ScreenWrapper testID="SimplifiedBankOnboardingOfflineBlockedPage">
            <HeaderWithBackButtonAndTitle
                title={translate('bankAccount.addBankAccount')}
                onBackButtonPress={onBackButtonPress}
            />
            <FullPageOfflineBlockingView>{null}</FullPageOfflineBlockingView>
        </ScreenWrapper>
    );
}

export default OfflineBlockedPage;
