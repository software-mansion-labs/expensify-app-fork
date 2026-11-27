/**
 * The entry page cannot offer a setup when the server throttled the account or the workspace pays in a currency that the
 * flows do not support. This view explains the blocker instead of the setup options.
 */
import HeaderWithBackButtonAndTitle from '@components/Header/composed/HeaderWithBackButtonAndTitle';
import RenderHTML from '@components/RenderHTML';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';

import useEnvironment from '@hooks/useEnvironment';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {CURRENCY_SETTINGS_ROUTE, leaveEntry} from '@pages/SimplifiedBankOnboarding/entry/entryNavigation';

import type {Route} from '@src/ROUTES';

import React from 'react';
import {View} from 'react-native';

type EntryErrorViewProps = {
    /** The server throttled the account, or the workspace pays in a currency that the flows do not support */
    reason: 'throttled' | 'unsupportedCurrency';
    workspaceName: string | undefined;
    backTo: Route | undefined;
};

/** A blocking error instead of the setup options */
function EntryErrorView({reason, workspaceName, backTo}: EntryErrorViewProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {environmentURL} = useEnvironment();

    return (
        <ScreenWrapper testID="SimplifiedBankOnboardingEntryPage">
            <HeaderWithBackButtonAndTitle
                title={translate('bankAccount.addBankAccount')}
                subtitle={workspaceName}
                onBackButtonPress={() => leaveEntry(backTo)}
            />
            <ScrollView style={styles.flex1}>
                <View style={[styles.m5, styles.mv3]}>
                    {reason === 'throttled' ? (
                        <Text>{translate('bankAccount.hasBeenThrottledError')}</Text>
                    ) : (
                        <RenderHTML html={translate('bankAccount.hasCurrencyError', `${environmentURL}/${CURRENCY_SETTINGS_ROUTE}`)} />
                    )}
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

export default EntryErrorView;
