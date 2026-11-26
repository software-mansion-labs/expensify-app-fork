/**
 * The first screen of the onboarding. A fresh setup picks between Plaid and the manual setup here, and a setup that was
 * started before picks between continuing, replacing the bank account and starting over.
 * It mirrors `VerifiedBankAccountFlowEntryPoint`.
 */
import MenuItemNavigation from '@components/MenuItem/presets/MenuItemNavigation';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import ScrollView from '@components/ScrollView';
import Section from '@components/Section';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLatestError, getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';

import {goToChangeBankAccount, isOpenedFromPaymentsPage} from '@pages/SimplifiedBankOnboarding/entry/entryNavigation';
import {areAccountActionsDisabled} from '@pages/SimplifiedBankOnboarding/entry/getEntryState';
import {clearOnboardingAccountErrors} from '@pages/SimplifiedBankOnboarding/entry/requests/resetBankAccount';
import useStartOverModal from '@pages/SimplifiedBankOnboarding/entry/reset/useStartOverModal';
import EntryScreenFrame from '@pages/SimplifiedBankOnboarding/entry/views/EntryScreenFrame';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Route} from '@src/ROUTES';

import React from 'react';
import {View} from 'react-native';

import useSetupOptionPress from './useSetupOptionPress';

type SetupOptionsProps = {
    policyID: string | undefined;
    backTo: Route | undefined;

    /** Shown under the header title */
    workspaceName: string | undefined;
    isNonUSD: boolean;
    currency: string | undefined;

    /** A setup is in progress, which swaps the setup options for continue, change and start over */
    canContinue: boolean;

    /** The instance that collects a new bank account while the old one stays connected */
    isChangingBankAccount: boolean;
};

function SetupOptions({policyID, backTo, workspaceName, isNonUSD, currency, canContinue, isChangingBankAccount}: SetupOptionsProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Bank', 'Connect', 'RotateLeft']);
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const {connectWithPlaid, connectManually, continueSetup} = useSetupOptionPress({
        policyID,
        backTo,
        isNonUSD,
        currency,
        isChangingBankAccount,
    });
    const {openStartOverModal} = useStartOverModal({isNonUSD, backTo});

    const hasReachedMaxAttempts = !!account?.maxAttemptsReached;
    const areRowsDisabled = areAccountActionsDisabled(account);

    // The instance that replaces the bank account lies on top of the entry that shows the connected account, so its Back
    // returns there. `backTo` would skip that entry.
    const goBack = () => Navigation.goBack(isChangingBankAccount ? undefined : backTo);
    const changeBankAccount = () => goToChangeBankAccount(policyID, backTo);

    return (
        <EntryScreenFrame
            testID="SimplifiedBankOnboardingEntryPoint"
            subtitle={workspaceName ?? ''}
            onBackButtonPress={goBack}
            includeSafeAreaPaddingBottom={false}
            shouldShowOfflineIndicatorInWideScreen
        >
            <ScrollView style={styles.flex1}>
                <Section
                    title={translate(canContinue ? 'workspace.bankAccount.almostDone' : 'workspace.bankAccount.streamlinePayments')}
                    subtitle={translate(canContinue ? 'workspace.bankAccount.youAreAlmostDone' : 'bankAccount.toGetStarted')}
                    subtitleMuted
                    isCentralPane
                >
                    <View style={styles.mt4}>
                        {canContinue ? (
                            <OfflineWithFeedback
                                errors={
                                    hasReachedMaxAttempts ? getMicroSecondOnyxErrorWithTranslationKey('connectBankAccountStep.maxAttemptsReached') : getLatestError(account?.errors ?? {})
                                }
                                errorRowStyles={styles.mt2}
                                shouldShowErrorMessages
                                contentContainerStyle={styles.mhn5}
                                onClose={hasReachedMaxAttempts ? undefined : clearOnboardingAccountErrors}
                            >
                                <MenuItemNavigation
                                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.CONTINUE_SETUP}
                                    title={translate('workspace.bankAccount.continueWithSetup')}
                                    icon={icons.Connect}
                                    onPress={continueSetup}
                                    isDisabled={areRowsDisabled}
                                />
                                {isOpenedFromPaymentsPage(policyID, backTo) && (
                                    <MenuItemNavigation
                                        sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SELECT_SETUP_OPTION}
                                        title={translate('workspace.bankAccount.changeBankAccount')}
                                        icon={icons.Bank}
                                        onPress={changeBankAccount}
                                        isDisabled={areRowsDisabled}
                                    />
                                )}
                                <MenuItemNavigation
                                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.START_OVER}
                                    title={translate('workspace.bankAccount.startOver')}
                                    icon={icons.RotateLeft}
                                    onPress={openStartOverModal}
                                    isDisabled={areRowsDisabled}
                                />
                            </OfflineWithFeedback>
                        ) : (
                            <View style={styles.mhn5}>
                                {!isNonUSD && (
                                    <MenuItemNavigation
                                        sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SELECT_SETUP_OPTION}
                                        title={translate('bankAccount.connectOnlineWithPlaid')}
                                        icon={icons.Bank}
                                        onPress={connectWithPlaid}
                                    />
                                )}
                                <MenuItemNavigation
                                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SELECT_SETUP_OPTION}
                                    title={translate('bankAccount.connectManually')}
                                    icon={icons.Connect}
                                    onPress={connectManually}
                                />
                            </View>
                        )}
                    </View>
                </Section>
            </ScrollView>
        </EntryScreenFrame>
    );
}

export default SetupOptions;
export type {SetupOptionsProps};
