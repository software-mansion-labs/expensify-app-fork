/**
 * The frame of the setup options: the header with the workspace name and the section that holds the option rows. The
 * fresh setup and the resumed setup share it and differ only in their copy and their rows.
 */
import HeaderWithBackButtonAndTitle from '@components/Header/composed/HeaderWithBackButtonAndTitle';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Section from '@components/Section';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {leaveEntry} from '@pages/SimplifiedBankOnboarding/entry/entryNavigation';

import type {Route} from '@src/ROUTES';

import type {ReactNode} from 'react';

import React from 'react';
import {View} from 'react-native';

type EntryOptionsLayoutProps = {
    workspaceName: string | undefined;
    title: string;
    subtitle: string;
    backTo: Route | undefined;

    /** The option rows */
    children: ReactNode;
};

function EntryOptionsLayout({workspaceName, title, subtitle, backTo, children}: EntryOptionsLayoutProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            testID="SimplifiedBankOnboardingEntryPoint"
            shouldShowOfflineIndicatorInWideScreen
        >
            <HeaderWithBackButtonAndTitle
                title={translate('bankAccount.addBankAccount')}
                subtitle={workspaceName ?? ''}
                onBackButtonPress={() => leaveEntry(backTo)}
            />
            <ScrollView style={styles.flex1}>
                <Section
                    title={title}
                    subtitle={subtitle}
                    subtitleMuted
                    isCentralPane
                >
                    <View style={styles.mt4}>{children}</View>
                </Section>
            </ScrollView>
        </ScreenWrapper>
    );
}

export default EntryOptionsLayout;
