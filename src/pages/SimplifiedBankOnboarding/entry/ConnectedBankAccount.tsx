/**
 * The view of a bank account that finished the onboarding. From here the user can replace the account or disconnect it.
 * It mirrors `ConnectedVerifiedBankAccount`.
 */
import HeaderWithBackButtonAndTitle from '@components/Header/composed/HeaderWithBackButtonAndTitle';
import MenuItemAction from '@components/MenuItem/presets/MenuItemAction';
import MenuItemField from '@components/MenuItem/presets/MenuItemField';
import MenuItemNavigation from '@components/MenuItem/presets/MenuItemNavigation';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Section from '@components/Section';
import Text from '@components/Text';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {clearOnboardingAccountErrors, requestResetBankAccount} from '@pages/SimplifiedBankOnboarding/actions/OnboardingAccount';
import useResetOnboardingModal from '@pages/SimplifiedBankOnboarding/hooks/useResetOnboardingModal';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/types/onyx';

import CONST from '@src/CONST';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

import type {OnyxEntry} from 'react-native-onyx';

import React from 'react';
import {View} from 'react-native';

import navigateToChangeBankAccount from './navigateToChangeBankAccount';

type ConnectedBankAccountProps = {
    /** The shared account object. The entry page reads it and passes it down, like the real flow does. */
    account: OnyxEntry<OnboardingAccount>;
    onBackButtonPress: () => void;

    /** Lets the reset modal leave this view once the bank account is disconnected */
    setShouldShowConnectedBankAccount: (shouldShowConnectedBankAccount: boolean) => void;
    isNonUSDWorkspace: boolean;
};

const VISIBLE_ACCOUNT_NUMBER_DIGITS = 4;

function ConnectedBankAccount({account, onBackButtonPress, setShouldShowConnectedBankAccount, isNonUSDWorkspace}: ConnectedBankAccountProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Bank', 'Close']);

    const achData = account?.achData;
    const errors = account?.errors ?? {};
    const pendingAction = account?.pendingAction;
    const isDisabled = !!pendingAction || !isEmptyObject(errors);

    // The two flows keep the account number in different places of the same object.
    const accountNumber = achData?.accountNumber ?? achData?.corpay?.iban ?? achData?.corpay?.accountNumber ?? '';
    const formattedAccountNumber = accountNumber ? `${translate('bankAccount.accountEnding')} ${accountNumber.slice(-VISIBLE_ACCOUNT_NUMBER_DIGITS)}` : '';

    useResetOnboardingModal({account, isNonUSDWorkspace, setShouldShowConnectedBankAccount});

    return (
        <ScreenWrapper
            testID="SimplifiedBankOnboardingConnectedBankAccount"
            includeSafeAreaPaddingBottom={false}
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
        >
            <HeaderWithBackButtonAndTitle
                title={translate('bankAccount.addBankAccount')}
                onBackButtonPress={onBackButtonPress}
            />
            <ScrollView style={styles.flex1}>
                <Section title={translate('workspace.bankAccount.allSet')}>
                    <OfflineWithFeedback
                        pendingAction={pendingAction}
                        errors={errors}
                        shouldShowErrorMessages
                        onClose={clearOnboardingAccountErrors}
                    >
                        <View style={[styles.mt3, styles.mhn5]}>
                            <MenuItemField
                                name={formattedAccountNumber}
                                value={achData?.bankName ?? achData?.corpay?.bankName}
                            />
                        </View>
                        <Text style={styles.mv3}>{translate('workspace.bankAccount.accountDescriptionWithCards')}</Text>
                        <View style={styles.mhn5}>
                            <MenuItemNavigation
                                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SELECT_SETUP_OPTION}
                                title={translate('workspace.bankAccount.changeBankAccount')}
                                icon={icons.Bank}
                                onPress={() => navigateToChangeBankAccount(achData?.policyID)}
                                isDisabled={isDisabled}
                            />
                            <MenuItemAction
                                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.START_OVER}
                                title={translate('workspace.bankAccount.disconnectBankAccount')}
                                icon={icons.Close}
                                onPress={requestResetBankAccount}
                                isDisabled={isDisabled}
                            />
                        </View>
                    </OfflineWithFeedback>
                </Section>
            </ScrollView>
        </ScreenWrapper>
    );
}

export default ConnectedBankAccount;
