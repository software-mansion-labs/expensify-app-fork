import React from 'react';
import NavigationTabBar from '@components/Navigation/NavigationTabBar';
import NAVIGATION_TABS from '@components/Navigation/NavigationTabBar/NAVIGATION_TABS';
import TopBar from '@components/Navigation/TopBar';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import AddNewScreenSection from './components/AddNewScreenSection';
import NavigationLibrariesSection from './components/NavigationLibrariesSection';
import RootStateSection from './components/RootStateSection';
import RouteMapSection from './components/RouteMapSection';
import SplitNavigatorExplanationSection from './components/SplitNavigatorExplanationSection';
import StateAdaptationExplanationSection from './components/StateAdaptationExplanationSection';

function ExpertiseFullscreenPage() {
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const styles = useThemeStyles();

    return (
        <ScreenWrapper
            testID="ExpertiseFullscreenPage"
            shouldShowOfflineIndicatorInWideScreen
            enableEdgeToEdgeBottomSafeAreaPadding={false}
            bottomContent={
                shouldUseNarrowLayout && (
                    <NavigationTabBar
                        selectedTab={NAVIGATION_TABS.HOME}
                        shouldShowFloatingButtons={false}
                    />
                )
            }
        >
            <TopBar breadcrumbLabel="Centrum ekspertyzy" />
            <ScrollView contentContainerStyle={styles.p5}>
                <NavigationLibrariesSection />
                <SplitNavigatorExplanationSection />
                <StateAdaptationExplanationSection />
                <RootStateSection />
                <AddNewScreenSection />
                <RouteMapSection />
            </ScrollView>
            {!shouldUseNarrowLayout && <NavigationTabBar selectedTab={NAVIGATION_TABS.HOME} />}
        </ScreenWrapper>
    );
}

export default ExpertiseFullscreenPage;
