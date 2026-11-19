/**
 * The landing page of the lab. It stands in for the workspace pages that lead to the real bank onboarding, and it also
 * hosts the control panel of the mock server.
 */
import Header from '@components/Header';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';

import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';

import {openLandingPage} from '@pages/SimplifiedBankOnboarding/actions/OnboardingPage';
import MockServerPanel from '@pages/SimplifiedBankOnboarding/mockBackend/ui/MockServerPanel';

import React, {useEffect} from 'react';

import WorkspaceList from './WorkspaceList';

function BankOnboardingLabPage() {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    useEffect(() => {
        openLandingPage();
    }, []);

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnablePickerAvoiding={false}
            shouldShowOfflineIndicatorInWideScreen
            testID="BankOnboardingLabPage"
        >
            <Header>
                {shouldUseNarrowLayout && <Header.BackButton onPress={Navigation.goBack} />}
                <Header.Title title={translate('common.bankOnboardingLab')} />
            </Header>
            <ScrollView
                contentContainerStyle={styles.pt3}
                addBottomSafeAreaPadding
            >
                <WorkspaceList />
                <MockServerPanel />
            </ScrollView>
        </ScreenWrapper>
    );
}

export default BankOnboardingLabPage;
