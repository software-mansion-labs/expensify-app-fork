/**
 * The modal that confirms a start over or the disconnect of a connected bank account. The button handler opens it
 * directly and passes what happens after the reset, so no flag on the account object asks for the modal.
 * It mirrors `useResetBankAccountModal`.
 */
import {ModalActions} from '@components/Modal/Global/ModalContext';
import RenderHTML from '@components/RenderHTML';

import useConfirmModal from '@hooks/useConfirmModal';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLastFourDigits} from '@libs/BankAccountUtils';

import type {OnboardingAccount, Workspaces} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import resetBankAccount from '@pages/SimplifiedBankOnboarding/entry/requests/resetBankAccount';
import {getBankAccountParams, openOnboardingPage} from '@pages/SimplifiedBankOnboarding/flows';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type {OnyxEntry} from 'react-native-onyx';

import React from 'react';
import {View} from 'react-native';

type StartOverModalInput = {
    account: OnyxEntry<OnboardingAccount>;
    policyID: string | undefined;
    isNonUSD: boolean;
};

type StartOverOptions = {
    /** Runs once the user confirmed and the reset was sent, for the screen to open what follows the reset */
    onReset: () => void;
};

function useStartOverModal({account, policyID, isNonUSD}: StartOverModalInput) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {showConfirmModal} = useConfirmModal();
    const selectWorkspaceACHAccount = (workspaces: OnyxEntry<Workspaces>) => (policyID ? workspaces?.[policyID]?.achAccount : undefined);
    const [workspaceACHAccount] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, {selector: selectWorkspaceACHAccount});
    const achData = account?.achData;
    const isInOpenState = achData?.state === SBO_CONST.STATE.OPEN;
    const bankShortName = `${achData?.bankName ?? ''} ${getLastFourDigits(achData?.accountNumber ?? '')}`;

    const startOver = (onReset: () => void) => {
        // The account data may already be cleared, so the ID also comes from the summary on the workspace
        const bankAccountParams = getBankAccountParams(policyID, achData, workspaceACHAccount?.bankAccountID);
        resetBankAccount(bankAccountParams, workspaceACHAccount, isNonUSD).then((outcome) => {
            // A failed reset does not restore the account data, so the page reads it again
            if (outcome.status !== 'failed') {
                return;
            }
            openOnboardingPage({policyID});
        });
        onReset();
    };

    const openStartOverModal = ({onReset}: StartOverOptions) => {
        showConfirmModal({
            title: translate('workspace.bankAccount.areYouSure'),
            confirmText: isInOpenState ? translate('workspace.bankAccount.yesDisconnectMyBankAccount') : translate('workspace.bankAccount.yesStartOver'),
            cancelText: translate('common.cancel'),
            prompt: isInOpenState ? (
                <View style={[styles.renderHTML, styles.flexRow]}>
                    <RenderHTML html={translate('workspace.bankAccount.disconnectYourBankAccount', bankShortName)} />
                </View>
            ) : (
                translate('workspace.bankAccount.clearProgress')
            ),
            buttonVariant: CONST.BUTTON_VARIANT.DANGER,
            shouldShowCancelButton: true,
        }).then(({action}) => {
            if (action !== ModalActions.CONFIRM) {
                return;
            }
            startOver(onReset);
        });
    };

    return {openStartOverModal};
}

export default useStartOverModal;
