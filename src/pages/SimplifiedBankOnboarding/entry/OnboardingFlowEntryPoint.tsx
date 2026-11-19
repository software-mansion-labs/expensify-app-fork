/**
 * The first screen of the onboarding. A fresh setup picks between Plaid and the manual setup here, and a setup that was
 * started before picks between continuing, replacing the bank account and starting over.
 * It mirrors `VerifiedBankAccountFlowEntryPoint`.
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
import Navigation from '@libs/Navigation/Navigation';

import {
    clearOnboardingAccountErrors,
    goToSetupStep,
    prepareNewBankAccountSetup,
    requestResetBankAccount,
    setBankAccountSubStep,
    setSetupOptionPressed,
    updateOnboardingAccount,
    updateOnboardingDraft,
} from '@pages/SimplifiedBankOnboarding/actions/OnboardingAccount';
import {clearPlaid} from '@pages/SimplifiedBankOnboarding/actions/Plaid';
import useResetOnboardingModal from '@pages/SimplifiedBankOnboarding/hooks/useResetOnboardingModal';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {OnboardingAccount, OnboardingUser, SetupType} from '@pages/SimplifiedBankOnboarding/types/onyx';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Route} from '@src/ROUTES';
import ROUTES from '@src/ROUTES';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

import type {OnyxEntry} from 'react-native-onyx';

import React, {useEffect} from 'react';
import {View} from 'react-native';

import navigateToChangeBankAccount from './navigateToChangeBankAccount';

type OnboardingFlowEntryPointProps = {
    /** The shared account object. The entry page reads it and passes it down, like the real flow does. */
    account: OnyxEntry<OnboardingAccount>;

    /** Resumes the setup at the step that the account reached */
    onContinuePress: () => void;

    /** Shown under the header title. It is empty while the workspace loads. */
    policyName?: string;
    policyID?: string;

    /** The currency of the workspace. Only the replacement of a connected bank account needs it. */
    currency?: string;

    /** The route that the flow returns to when the user leaves it */
    backTo?: Route;

    /** Whether a setup is in progress, which swaps the setup options for continue, change and start over */
    shouldShowContinueSetupButton: boolean;
    isNonUSDWorkspace: boolean;

    /** Lets the reset modal bring the setup options back once the setup is cleared */
    setShouldShowContinueSetupButton: (shouldShowContinueSetupButton: boolean) => void;

    /** True on the instance that collects a new bank account while the old one is still connected */
    isChangingBankAccount: boolean;
};

const NO_BANK_ACCOUNT_ID = 0;

const isUserValidatedSelector = (user: OnyxEntry<OnboardingUser>) => !!user?.validated;

/** Stores the picked option and the first step, which the USD flow page reads when it opens */
function prepareUSDSetup(setupType: SetupType) {
    setBankAccountSubStep(setupType);
    goToSetupStep(SBO_CONST.USD.STEP.COUNTRY);
}

function OnboardingFlowEntryPoint({
    account,
    onContinuePress,
    policyName = '',
    policyID = '',
    currency,
    backTo,
    shouldShowContinueSetupButton,
    isNonUSDWorkspace,
    setShouldShowContinueSetupButton,
    isChangingBankAccount,
}: OnboardingFlowEntryPointProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Bank', 'Connect', 'RotateLeft']);

    const [isUserValidated = false] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER, {selector: isUserValidatedSelector});
    const [optionPressed] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_OPTION_PRESSED);

    const errors = account?.errors ?? {};
    const pendingAction = account?.pendingAction ?? null;
    const hasReachedMaxAttempts = !!account?.maxAttemptsReached;
    const isContinueMenuDisabled = !!pendingAction || (!isEmptyObject(errors) && !hasReachedMaxAttempts);

    const removeExistingBankAccountDetails = () => {
        // A replacement must not be prefilled with the data of the bank account that it replaces.
        if (isChangingBankAccount && currency) {
            prepareNewBankAccountSetup(policyID, currency);
            return;
        }
        updateOnboardingDraft({
            [INPUT_IDS.ROUTING_NUMBER]: '',
            [INPUT_IDS.ACCOUNT_NUMBER]: '',
            [INPUT_IDS.BANK_NAME]: '',
            [INPUT_IDS.PLAID_ACCOUNT_ID]: '',
        });
        updateOnboardingAccount({bankAccountID: NO_BANK_ACCOUNT_ID});
    };

    const prepareNextStep = (setupType: SetupType) => {
        prepareUSDSetup(setupType);
        Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({policyID, page: SBO_CONST.USD.PAGE_NAMES.COUNTRY, backTo}));
    };

    // The user picked an option, was sent to validate the account and came back validated. This prepares the data for that
    // option, and the verify-account page does the navigation. The NonUSD flow only has the manual option.
    useEffect(() => {
        if (!isUserValidated) {
            return;
        }

        if (optionPressed === SBO_CONST.SETUP_TYPE.MANUAL) {
            removeExistingBankAccountDetails();
            if (isNonUSDWorkspace) {
                setSetupOptionPressed(null);
                return;
            }
            prepareUSDSetup(SBO_CONST.SETUP_TYPE.MANUAL);
            setSetupOptionPressed(null);
        } else if (optionPressed === SBO_CONST.SETUP_TYPE.PLAID) {
            removeExistingBankAccountDetails();
            clearPlaid();
            prepareUSDSetup(SBO_CONST.SETUP_TYPE.PLAID);
            setSetupOptionPressed(null);
        }
    }, [isUserValidated, isNonUSDWorkspace, optionPressed, removeExistingBankAccountDetails]);

    const connectManually = () => {
        if (!isUserValidated) {
            setSetupOptionPressed(SBO_CONST.SETUP_TYPE.MANUAL);
            Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_VERIFY_ACCOUNT.getRoute(policyID));
            return;
        }

        removeExistingBankAccountDetails();

        if (isNonUSDWorkspace) {
            Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_NON_USD_SETUP.getRoute({policyID, page: SBO_CONST.NON_USD.PAGE_NAMES.COUNTRY, backTo}));
            return;
        }

        prepareNextStep(SBO_CONST.SETUP_TYPE.MANUAL);
    };

    const connectWithPlaid = () => {
        if (!isUserValidated) {
            setSetupOptionPressed(SBO_CONST.SETUP_TYPE.PLAID);
            Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_VERIFY_ACCOUNT.getRoute(policyID));
            return;
        }

        removeExistingBankAccountDetails();
        clearPlaid();
        prepareNextStep(SBO_CONST.SETUP_TYPE.PLAID);
    };

    useResetOnboardingModal({account, isNonUSDWorkspace, setShouldShowContinueSetupButton, backTo});

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            testID="SimplifiedBankOnboardingEntryPoint"
            shouldShowOfflineIndicatorInWideScreen
        >
            <HeaderWithBackButtonAndTitle
                title={translate('bankAccount.addBankAccount')}
                subtitle={policyName}
                onBackButtonPress={() => Navigation.goBack(backTo)}
            />
            <ScrollView style={styles.flex1}>
                <Section
                    title={translate(shouldShowContinueSetupButton ? 'workspace.bankAccount.almostDone' : 'workspace.bankAccount.streamlinePayments')}
                    subtitle={translate(shouldShowContinueSetupButton ? 'workspace.bankAccount.youAreAlmostDone' : 'bankAccount.toGetStarted')}
                    subtitleMuted
                    isCentralPane
                >
                    <View style={styles.mt4}>
                        {shouldShowContinueSetupButton ? (
                            <OfflineWithFeedback
                                errors={hasReachedMaxAttempts ? getMicroSecondOnyxErrorWithTranslationKey('connectBankAccountStep.maxAttemptsReached') : getLatestError(errors)}
                                errorRowStyles={styles.mt2}
                                shouldShowErrorMessages
                                contentContainerStyle={styles.mhn5}
                                onClose={hasReachedMaxAttempts ? undefined : clearOnboardingAccountErrors}
                            >
                                <MenuItemNavigation
                                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.CONTINUE_SETUP}
                                    title={translate('workspace.bankAccount.continueWithSetup')}
                                    icon={icons.Connect}
                                    onPress={onContinuePress}
                                    isDisabled={isContinueMenuDisabled}
                                />
                                <MenuItemNavigation
                                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SELECT_SETUP_OPTION}
                                    title={translate('workspace.bankAccount.changeBankAccount')}
                                    icon={icons.Bank}
                                    onPress={() => navigateToChangeBankAccount(policyID)}
                                    isDisabled={isContinueMenuDisabled}
                                />
                                <MenuItemNavigation
                                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.START_OVER}
                                    title={translate('workspace.bankAccount.startOver')}
                                    icon={icons.RotateLeft}
                                    onPress={requestResetBankAccount}
                                    isDisabled={isContinueMenuDisabled}
                                />
                            </OfflineWithFeedback>
                        ) : (
                            <View style={styles.mhn5}>
                                {!isNonUSDWorkspace && (
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
        </ScreenWrapper>
    );
}

export default OnboardingFlowEntryPoint;
