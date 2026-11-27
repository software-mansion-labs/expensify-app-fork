/**
 * The options of a setup that was started before: continue it, replace its bank account or start over. A resumed setup
 * never goes through Plaid again, so continuing saves the manual setup type, which shows the numbers locked. It mirrors
 * the in-progress state of `VerifiedBankAccountFlowEntryPoint`.
 */
import MenuItemNavigation from '@components/MenuItem/presets/MenuItemNavigation';
import OfflineWithFeedback from '@components/OfflineWithFeedback';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLatestError, getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';

import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {goToChangeBankAccount, isOpenedFromPaymentsPage, leaveEntryAfterReset} from '@pages/SimplifiedBankOnboarding/entry/entryNavigation';
import clearAccountErrors from '@pages/SimplifiedBankOnboarding/entry/requests/clearAccountErrors';
import useStartOverModal from '@pages/SimplifiedBankOnboarding/entry/reset/useStartOverModal';
import {openFlow, saveDraft} from '@pages/SimplifiedBankOnboarding/flows';

import CONST from '@src/CONST';
import type {Route} from '@src/ROUTES';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

import type {OnyxEntry} from 'react-native-onyx';

import React from 'react';

import EntryOptionRow from './EntryOptionRow';
import EntryOptionsLayout from './EntryOptionsLayout';
import useExclusiveAction from './useExclusiveAction';
import useOpenSetup from './useOpenSetup';

type ResumeSetupOptionsProps = {
    account: OnyxEntry<OnboardingAccount>;
    policyID: string | undefined;
    workspaceName: string | undefined;
    isNonUSD: boolean;
    backTo: Route | undefined;
};

function ResumeSetupOptions({account, policyID, workspaceName, isNonUSD, backTo}: ResumeSetupOptionsProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Bank', 'Connect', 'RotateLeft']);
    const openSetup = useOpenSetup(policyID, backTo);
    const {runningActionID, runAction} = useExclusiveAction<'continue'>();
    const {openStartOverModal} = useStartOverModal({account, policyID, isNonUSD});

    const errors = account?.errors ?? {};
    const hasReachedMaxAttempts = !!account?.maxAttemptsReached;
    const isContinueDisabled = !!account?.pendingAction || (!isEmptyObject(errors) && !hasReachedMaxAttempts);
    const isContinuing = runningActionID === 'continue';

    // As in the real entry point, the return route doubles as data: only the Payments page offers to replace the bank account
    const shouldShowChangeBankAccount = isOpenedFromPaymentsPage(policyID, backTo);

    const continueSetup = () =>
        runAction('continue', async () => {
            await saveDraft({setupType: SBO_CONST.SETUP_TYPE.MANUAL});
            await openSetup();
        });

    // A start over removes the NonUSD account, whose flow opens again right away, and the row of the lab list
    const openAfterStartOver = () => {
        if (isNonUSD) {
            openFlow({kind: 'nonUSD', policyID, backTo});
        }
        leaveEntryAfterReset(backTo);
    };

    return (
        <EntryOptionsLayout
            workspaceName={workspaceName}
            title={translate('workspace.bankAccount.almostDone')}
            subtitle={translate('workspace.bankAccount.youAreAlmostDone')}
            backTo={backTo}
        >
            <OfflineWithFeedback
                errors={hasReachedMaxAttempts ? getMicroSecondOnyxErrorWithTranslationKey('connectBankAccountStep.maxAttemptsReached') : getLatestError(errors)}
                errorRowStyles={styles.mt2}
                shouldShowErrorMessages
                contentContainerStyle={styles.mhn5}
                onClose={hasReachedMaxAttempts ? undefined : clearAccountErrors}
            >
                <EntryOptionRow
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.CONTINUE_SETUP}
                    title={translate('workspace.bankAccount.continueWithSetup')}
                    icon={icons.Connect}
                    onPress={continueSetup}
                    isRunning={isContinuing}
                    isDisabled={isContinueDisabled}
                />
                {shouldShowChangeBankAccount && (
                    <MenuItemNavigation
                        sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SELECT_SETUP_OPTION}
                        title={translate('workspace.bankAccount.changeBankAccount')}
                        icon={icons.Bank}
                        onPress={() => goToChangeBankAccount(policyID, backTo)}
                        isDisabled={isContinueDisabled || isContinuing}
                    />
                )}
                <MenuItemNavigation
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.START_OVER}
                    title={translate('workspace.bankAccount.startOver')}
                    icon={icons.RotateLeft}
                    onPress={() => openStartOverModal({onReset: openAfterStartOver})}
                    isDisabled={isContinueDisabled || isContinuing}
                />
            </OfflineWithFeedback>
        </EntryOptionsLayout>
    );
}

export default ResumeSetupOptions;
