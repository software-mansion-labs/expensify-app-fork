import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import ScreenWrapper from '@components/ScreenWrapper';

import {leaveEntry} from '@pages/SimplifiedBankOnboarding/entry/entryNavigation';

import type {Route} from '@src/ROUTES';

import React from 'react';

type EntryNotFoundViewProps = {
    backTo: Route | undefined;

    /** The workspace exists but the user is not its admin */
    isWorkspaceFound: boolean;
};

function EntryNotFoundView({backTo, isWorkspaceFound}: EntryNotFoundViewProps) {
    return (
        <ScreenWrapper testID="SimplifiedBankOnboardingEntryPage">
            <FullPageNotFoundView
                shouldShow
                onBackButtonPress={() => leaveEntry(backTo)}
                onLinkPress={() => leaveEntry(backTo)}
                subtitleKey={isWorkspaceFound ? 'workspace.common.notAuthorized' : undefined}
            />
        </ScreenWrapper>
    );
}

export default EntryNotFoundView;
