/**
 * The options of a fresh setup: Plaid or the manual setup for USD, the manual setup only for the other currencies.
 * Each option clears the bank details of an earlier setup and saves the setup type before it opens the flow, so the
 * plan of the flow already knows it. It mirrors the fresh state of `VerifiedBankAccountFlowEntryPoint`.
 */
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {SetupType} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {clearPlaid, prepareNewBankAccountSetup, saveDraft} from '@pages/SimplifiedBankOnboarding/flows';

import CONST from '@src/CONST';
import type {Route} from '@src/ROUTES';

import React from 'react';
import {View} from 'react-native';

import EntryOptionRow from './EntryOptionRow';
import EntryOptionsLayout from './EntryOptionsLayout';
import useExclusiveAction from './useExclusiveAction';
import useOpenSetup from './useOpenSetup';

type NewSetupOptionsProps = {
    policyID: string | undefined;
    workspaceName: string | undefined;
    currency: string;
    isNonUSD: boolean;

    /** The page collects a new bank account while the connected one stays */
    isChangingBankAccount: boolean;
    backTo: Route | undefined;
};

function NewSetupOptions({policyID, workspaceName, currency, isNonUSD, isChangingBankAccount, backTo}: NewSetupOptionsProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Bank', 'Connect']);
    const openSetup = useOpenSetup(policyID, backTo);
    const {runningActionID, runAction} = useExclusiveAction<SetupType>();

    // A fresh setup must not be prefilled with the bank details of an earlier one, or of the account it replaces
    const startSetup = (setupType: SetupType) =>
        runAction(setupType, async () => {
            if (isChangingBankAccount) {
                await prepareNewBankAccountSetup(policyID, currency);
            }
            await Promise.all([
                saveDraft({setupType, [INPUT_IDS.ROUTING_NUMBER]: '', [INPUT_IDS.ACCOUNT_NUMBER]: '', [INPUT_IDS.BANK_NAME]: '', [INPUT_IDS.PLAID_ACCOUNT_ID]: ''}),
                setupType === SBO_CONST.SETUP_TYPE.PLAID ? clearPlaid() : Promise.resolve(),
            ]);
            await openSetup();
        });

    return (
        <EntryOptionsLayout
            workspaceName={workspaceName}
            title={translate('workspace.bankAccount.streamlinePayments')}
            subtitle={translate('bankAccount.toGetStarted')}
            backTo={backTo}
        >
            <View style={styles.mhn5}>
                {!isNonUSD && (
                    <EntryOptionRow
                        sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SELECT_SETUP_OPTION}
                        title={translate('bankAccount.connectOnlineWithPlaid')}
                        icon={icons.Bank}
                        onPress={() => startSetup(SBO_CONST.SETUP_TYPE.PLAID)}
                        isRunning={runningActionID === SBO_CONST.SETUP_TYPE.PLAID}
                        isDisabled={!!runningActionID}
                    />
                )}
                <EntryOptionRow
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SELECT_SETUP_OPTION}
                    title={translate('bankAccount.connectManually')}
                    icon={icons.Connect}
                    onPress={() => startSetup(SBO_CONST.SETUP_TYPE.MANUAL)}
                    isRunning={runningActionID === SBO_CONST.SETUP_TYPE.MANUAL}
                    isDisabled={!!runningActionID}
                />
            </View>
        </EntryOptionsLayout>
    );
}

export default NewSetupOptions;
