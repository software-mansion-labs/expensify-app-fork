/**
 * The view of a bank account that finished the onboarding. From here the user can replace the account or disconnect it.
 * It mirrors `ConnectedVerifiedBankAccount`.
 */
import MenuItemAction from '@components/MenuItem/presets/MenuItemAction';
import MenuItemField from '@components/MenuItem/presets/MenuItemField';
import MenuItemNavigation from '@components/MenuItem/presets/MenuItemNavigation';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import ScrollView from '@components/ScrollView';
import Section from '@components/Section';
import Text from '@components/Text';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import getAccountEnding from '@pages/SimplifiedBankOnboarding/entry/accountEnding';
import {goToChangeBankAccount} from '@pages/SimplifiedBankOnboarding/entry/entryNavigation';
import {areAccountActionsDisabled} from '@pages/SimplifiedBankOnboarding/entry/getEntryState';
import {clearOnboardingAccountErrors} from '@pages/SimplifiedBankOnboarding/entry/requests/resetBankAccount';
import useStartOverModal from '@pages/SimplifiedBankOnboarding/entry/reset/useStartOverModal';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Route} from '@src/ROUTES';

import React from 'react';
import {View} from 'react-native';

import EntryScreenFrame from './EntryScreenFrame';

type ConnectedBankAccountViewProps = {
    isNonUSD: boolean;
    backTo: Route | undefined;

    /** The Back of the entry, which depends on the step that the account reached */
    onBackButtonPress: () => void;
};

function ConnectedBankAccountView({isNonUSD, backTo, onBackButtonPress}: ConnectedBankAccountViewProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Bank', 'Close']);
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const {openStartOverModal} = useStartOverModal({isNonUSD, backTo});

    const achData = account?.achData;
    const accountEnding = getAccountEnding(achData);
    const isDisabled = areAccountActionsDisabled(account);

    const changeBankAccount = () => goToChangeBankAccount(achData?.policyID, backTo);

    return (
        <EntryScreenFrame
            testID="SimplifiedBankOnboardingConnectedBankAccount"
            onBackButtonPress={onBackButtonPress}
            includeSafeAreaPaddingBottom={false}
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
        >
            <ScrollView style={styles.flex1}>
                <Section title={translate('workspace.bankAccount.allSet')}>
                    <OfflineWithFeedback
                        pendingAction={account?.pendingAction}
                        errors={account?.errors ?? {}}
                        shouldShowErrorMessages
                        onClose={clearOnboardingAccountErrors}
                    >
                        <View style={[styles.mt3, styles.mhn5]}>
                            <MenuItemField
                                name={accountEnding ? `${translate('bankAccount.accountEnding')} ${accountEnding}` : ''}
                                value={achData?.bankName ?? achData?.corpay?.bankName}
                            />
                        </View>
                        <Text style={styles.mv3}>{translate('workspace.bankAccount.accountDescriptionWithCards')}</Text>
                        <View style={styles.mhn5}>
                            <MenuItemNavigation
                                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SELECT_SETUP_OPTION}
                                title={translate('workspace.bankAccount.changeBankAccount')}
                                icon={icons.Bank}
                                onPress={changeBankAccount}
                                isDisabled={isDisabled}
                            />
                            <MenuItemAction
                                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.START_OVER}
                                title={translate('workspace.bankAccount.disconnectBankAccount')}
                                icon={icons.Close}
                                onPress={openStartOverModal}
                                isDisabled={isDisabled}
                            />
                        </View>
                    </OfflineWithFeedback>
                </Section>
            </ScrollView>
        </EntryScreenFrame>
    );
}

export default ConnectedBankAccountView;
export type {ConnectedBankAccountViewProps};
