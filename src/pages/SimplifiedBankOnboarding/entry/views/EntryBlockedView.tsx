/** The entry screens that let the user do nothing but go back: offline, not found or not authorized, throttled, unsupported currency */
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
import RenderHTML from '@components/RenderHTML';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';

import useEnvironment from '@hooks/useEnvironment';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';

import type {EntryState} from '@pages/SimplifiedBankOnboarding/entry/getEntryState';

import type {Route} from '@src/ROUTES';
import ROUTES from '@src/ROUTES';

import React from 'react';
import {View} from 'react-native';

import EntryScreenFrame from './EntryScreenFrame';

type BlockedEntryState = Extract<EntryState, {kind: 'offline' | 'notFound' | 'throttled' | 'unsupportedCurrency'}>;

type EntryBlockedViewProps = {
    state: BlockedEntryState;
    workspaceName: string | undefined;
    backTo: Route | undefined;
};

const ENTRY_PAGE_TEST_ID = 'SimplifiedBankOnboardingEntryPage';

function EntryBlockedView({state, workspaceName, backTo}: EntryBlockedViewProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {environmentURL} = useEnvironment();

    const goBack = () => Navigation.goBack(backTo);

    switch (state.kind) {
        case 'offline':
            return (
                <EntryScreenFrame
                    testID={ENTRY_PAGE_TEST_ID}
                    onBackButtonPress={goBack}
                >
                    <FullPageOfflineBlockingView>{null}</FullPageOfflineBlockingView>
                </EntryScreenFrame>
            );
        case 'notFound':
            return (
                <ScreenWrapper testID={ENTRY_PAGE_TEST_ID}>
                    <FullPageNotFoundView
                        shouldShow
                        onBackButtonPress={goBack}
                        onLinkPress={goBack}
                        subtitleKey={state.isWorkspaceFound ? 'workspace.common.notAuthorized' : undefined}
                    />
                </ScreenWrapper>
            );
        default:
            return (
                <EntryScreenFrame
                    testID={ENTRY_PAGE_TEST_ID}
                    subtitle={workspaceName}
                    onBackButtonPress={goBack}
                >
                    <View style={[styles.m5, styles.mv3, styles.flex1]}>
                        {state.kind === 'throttled' ? (
                            <Text>{translate('bankAccount.hasBeenThrottledError')}</Text>
                        ) : (
                            <RenderHTML html={translate('bankAccount.hasCurrencyError', `${environmentURL}/${ROUTES.SETTINGS_BANK_ONBOARDING_LAB}`)} />
                        )}
                    </View>
                </EntryScreenFrame>
            );
    }
}

export default EntryBlockedView;
export type {BlockedEntryState, EntryBlockedViewProps};
