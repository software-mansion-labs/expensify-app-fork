/**
 * The page that a screen of the onboarding shows when its route names a workspace or a bank account that does not exist,
 * or a workspace where the user is not an admin.
 */
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import ScreenWrapper from '@components/ScreenWrapper';

import React from 'react';

type NotFoundPageProps = {
    onBackButtonPress: () => void;
    isNotAuthorized?: boolean;
};

function NotFoundPage({onBackButtonPress, isNotAuthorized = false}: NotFoundPageProps) {
    return (
        <ScreenWrapper testID="SimplifiedBankOnboardingNotFoundPage">
            <FullPageNotFoundView
                shouldShow
                onBackButtonPress={onBackButtonPress}
                onLinkPress={onBackButtonPress}
                subtitleKey={isNotAuthorized ? 'workspace.common.notAuthorized' : undefined}
            />
        </ScreenWrapper>
    );
}

export default NotFoundPage;
