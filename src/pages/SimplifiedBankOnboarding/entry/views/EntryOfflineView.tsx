import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
import HeaderWithBackButtonAndTitle from '@components/Header/composed/HeaderWithBackButtonAndTitle';
import ScreenWrapper from '@components/ScreenWrapper';

import useLocalize from '@hooks/useLocalize';

import {leaveEntry} from '@pages/SimplifiedBankOnboarding/navigation/entryNavigation';

import type {Route} from '@src/ROUTES';

import React from 'react';

type EntryOfflineViewProps = {
    backTo: Route | undefined;
};

/** Offline before the account of the page was read, so there is nothing to show */
function EntryOfflineView({backTo}: EntryOfflineViewProps) {
    const {translate} = useLocalize();
    return (
        <ScreenWrapper testID="SimplifiedBankOnboardingEntryPage">
            <HeaderWithBackButtonAndTitle
                title={translate('bankAccount.addBankAccount')}
                onBackButtonPress={() => leaveEntry(backTo)}
            />
            <FullPageOfflineBlockingView>{null}</FullPageOfflineBlockingView>
        </ScreenWrapper>
    );
}

export default EntryOfflineView;
