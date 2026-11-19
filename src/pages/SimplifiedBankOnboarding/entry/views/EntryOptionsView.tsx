/**
 * The setup options. A fresh setup picks between Plaid and the manual setup, and a setup that was started before picks
 * between continuing, replacing the bank account and starting over. Every option saves the setup type to the draft
 * before it opens the flow, so the plan of the flow already knows it. It mirrors `VerifiedBankAccountFlowEntryPoint`.
 */
import HeaderWithBackButtonAndTitle from '@components/Header/composed/HeaderWithBackButtonAndTitle';
import MenuItemNavigation from '@components/MenuItem/presets/MenuItemNavigation';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Section from '@components/Section';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLatestError, getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';

import type {FlowData, FlowDataSource} from '@pages/SimplifiedBankOnboarding/controller/types';
import useStartOverModal from '@pages/SimplifiedBankOnboarding/entry/reset/useStartOverModal';
import openFlowAtResume from '@pages/SimplifiedBankOnboarding/flows/openFlowAtResume';
import {goToChangeBankAccount, goToVerifyAccount, isOpenedFromPaymentsPage, leaveEntry, leaveEntryAfterReset} from '@pages/SimplifiedBankOnboarding/navigation/entryNavigation';
import {openFlow} from '@pages/SimplifiedBankOnboarding/navigation/flowNavigation';
import clearAccountErrors from '@pages/SimplifiedBankOnboarding/requests/clearAccountErrors';
import {prepareNewBankAccountSetup, saveDraft} from '@pages/SimplifiedBankOnboarding/requests/draft';
import {clearPlaid} from '@pages/SimplifiedBankOnboarding/requests/plaid';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {OnboardingUser, SetupType} from '@pages/SimplifiedBankOnboarding/types/onyx';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Route} from '@src/ROUTES';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

import type {OnyxEntry} from 'react-native-onyx';

import React from 'react';
import {View} from 'react-native';

type EntryOptionsViewProps = {
    dataSource: FlowDataSource<FlowData>;
    policyID: string | undefined;
    workspaceName: string | undefined;
    currency: string;
    isNonUSD: boolean;

    /** A setup was started before, so the options are continue, change and start over */
    isSetupInProgress: boolean;

    /** The page collects a new bank account while the connected one stays */
    isChangingBankAccount: boolean;
    backTo: Route | undefined;
};

const isUserValidatedSelector = (user: OnyxEntry<OnboardingUser>) => !!user?.validated;

function EntryOptionsView({dataSource, policyID, workspaceName, currency, isNonUSD, isSetupInProgress, isChangingBankAccount, backTo}: EntryOptionsViewProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Bank', 'Connect', 'RotateLeft']);
    const [isUserValidated = false] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER, {selector: isUserValidatedSelector});
    const account = dataSource.data.account;
    const {openStartOverModal} = useStartOverModal({account, policyID, isNonUSD});

    const errors = account?.errors ?? {};
    const hasReachedMaxAttempts = !!account?.maxAttemptsReached;
    const isContinueDisabled = !!account?.pendingAction || (!isEmptyObject(errors) && !hasReachedMaxAttempts);

    // As in the real entry point, the return route doubles as data: only the Payments page offers to replace the bank account
    const shouldShowChangeBankAccount = isOpenedFromPaymentsPage(policyID, backTo);

    /** A user who is not validated passes the verify account page first, which opens the flow once the code is accepted */
    const openSetup = async () => {
        if (!isUserValidated) {
            goToVerifyAccount(policyID, backTo);
            return;
        }
        openFlowAtResume({data: await dataSource.readData(), context: {translate, policyID}, backTo});
    };

    /** A fresh setup must not be prefilled with the bank details of an earlier one, or of the account it replaces */
    const startSetup = async (setupType: SetupType) => {
        if (isChangingBankAccount) {
            await prepareNewBankAccountSetup(policyID, currency);
        }
        await Promise.all([
            saveDraft({setupType, [INPUT_IDS.ROUTING_NUMBER]: '', [INPUT_IDS.ACCOUNT_NUMBER]: '', [INPUT_IDS.BANK_NAME]: '', [INPUT_IDS.PLAID_ACCOUNT_ID]: ''}),
            setupType === SBO_CONST.SETUP_TYPE.PLAID ? clearPlaid() : Promise.resolve(),
        ]);
        await openSetup();
    };

    /** A resumed setup never goes through Plaid again. It shows the manual variant with the numbers locked. */
    const continueSetup = async () => {
        await saveDraft({setupType: SBO_CONST.SETUP_TYPE.MANUAL});
        await openSetup();
    };

    // A start over removes the NonUSD account, whose flow opens again right away, and the row of the lab list
    const openAfterStartOver = () => {
        if (isNonUSD) {
            openFlow({kind: 'nonUSD', policyID, backTo});
        }
        leaveEntryAfterReset(backTo);
    };

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
                    title={translate(isSetupInProgress ? 'workspace.bankAccount.almostDone' : 'workspace.bankAccount.streamlinePayments')}
                    subtitle={translate(isSetupInProgress ? 'workspace.bankAccount.youAreAlmostDone' : 'bankAccount.toGetStarted')}
                    subtitleMuted
                    isCentralPane
                >
                    <View style={styles.mt4}>
                        {isSetupInProgress ? (
                            <OfflineWithFeedback
                                errors={hasReachedMaxAttempts ? getMicroSecondOnyxErrorWithTranslationKey('connectBankAccountStep.maxAttemptsReached') : getLatestError(errors)}
                                errorRowStyles={styles.mt2}
                                shouldShowErrorMessages
                                contentContainerStyle={styles.mhn5}
                                onClose={hasReachedMaxAttempts ? undefined : clearAccountErrors}
                            >
                                <MenuItemNavigation
                                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.CONTINUE_SETUP}
                                    title={translate('workspace.bankAccount.continueWithSetup')}
                                    icon={icons.Connect}
                                    onPress={continueSetup}
                                    isDisabled={isContinueDisabled}
                                />
                                {shouldShowChangeBankAccount && (
                                    <MenuItemNavigation
                                        sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SELECT_SETUP_OPTION}
                                        title={translate('workspace.bankAccount.changeBankAccount')}
                                        icon={icons.Bank}
                                        onPress={() => goToChangeBankAccount(policyID, backTo)}
                                        isDisabled={isContinueDisabled}
                                    />
                                )}
                                <MenuItemNavigation
                                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.START_OVER}
                                    title={translate('workspace.bankAccount.startOver')}
                                    icon={icons.RotateLeft}
                                    onPress={() => openStartOverModal({onReset: openAfterStartOver})}
                                    isDisabled={isContinueDisabled}
                                />
                            </OfflineWithFeedback>
                        ) : (
                            <View style={styles.mhn5}>
                                {!isNonUSD && (
                                    <MenuItemNavigation
                                        sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SELECT_SETUP_OPTION}
                                        title={translate('bankAccount.connectOnlineWithPlaid')}
                                        icon={icons.Bank}
                                        onPress={() => startSetup(SBO_CONST.SETUP_TYPE.PLAID)}
                                    />
                                )}
                                <MenuItemNavigation
                                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SELECT_SETUP_OPTION}
                                    title={translate('bankAccount.connectManually')}
                                    icon={icons.Connect}
                                    onPress={() => startSetup(SBO_CONST.SETUP_TYPE.MANUAL)}
                                />
                            </View>
                        )}
                    </View>
                </Section>
            </ScrollView>
        </ScreenWrapper>
    );
}

export default EntryOptionsView;
