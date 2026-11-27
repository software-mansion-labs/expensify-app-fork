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

import {getLastFourDigits} from '@libs/BankAccountUtils';

import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import {goToChangeBankAccount, leaveEntry} from '@pages/SimplifiedBankOnboarding/entry/entryNavigation';
import clearAccountErrors from '@pages/SimplifiedBankOnboarding/entry/requests/clearAccountErrors';
import useStartOverModal from '@pages/SimplifiedBankOnboarding/entry/reset/useStartOverModal';
import {openFlow} from '@pages/SimplifiedBankOnboarding/flows';

import CONST from '@src/CONST';
import type {Route} from '@src/ROUTES';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

import type {OnyxEntry} from 'react-native-onyx';

import React from 'react';
import {View} from 'react-native';

type ConnectedBankAccountViewProps = {
    account: OnyxEntry<OnboardingAccount>;
    policyID: string | undefined;
    backTo: Route | undefined;
    isNonUSD: boolean;
};

function ConnectedBankAccountView({account, policyID, backTo, isNonUSD}: ConnectedBankAccountViewProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Bank', 'Close']);
    const {openStartOverModal} = useStartOverModal({account, policyID, isNonUSD});

    const achData = account?.achData;
    const errors = account?.errors ?? {};
    const pendingAction = account?.pendingAction;
    const isDisabled = !!pendingAction || !isEmptyObject(errors);

    // The two flows keep the account number in different places of the same object
    const accountNumber = achData?.accountNumber ?? achData?.corpay?.iban ?? achData?.corpay?.accountNumber ?? '';
    const formattedAccountNumber = accountNumber ? `${translate('bankAccount.accountEnding')} ${getLastFourDigits(accountNumber)}` : '';

    // A disconnected USD account shows the setup options on this page, a NonUSD one starts its flow again right away
    const openAfterDisconnect = () => {
        if (!isNonUSD) {
            return;
        }
        openFlow({kind: 'nonUSD', policyID, backTo});
    };

    return (
        <ScreenWrapper
            testID="SimplifiedBankOnboardingConnectedBankAccount"
            includeSafeAreaPaddingBottom={false}
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
        >
            <HeaderWithBackButtonAndTitle
                title={translate('bankAccount.addBankAccount')}
                onBackButtonPress={() => leaveEntry(backTo)}
            />
            <ScrollView style={styles.flex1}>
                <Section title={translate('workspace.bankAccount.allSet')}>
                    <OfflineWithFeedback
                        pendingAction={pendingAction}
                        errors={errors}
                        shouldShowErrorMessages
                        onClose={clearAccountErrors}
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
                                onPress={() => goToChangeBankAccount(policyID, backTo)}
                                isDisabled={isDisabled}
                            />
                            <MenuItemAction
                                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.START_OVER}
                                title={translate('workspace.bankAccount.disconnectBankAccount')}
                                icon={icons.Close}
                                onPress={() => openStartOverModal({onReset: openAfterDisconnect})}
                                isDisabled={isDisabled}
                            />
                        </View>
                    </OfflineWithFeedback>
                </Section>
            </ScrollView>
        </ScreenWrapper>
    );
}

export default ConnectedBankAccountView;
