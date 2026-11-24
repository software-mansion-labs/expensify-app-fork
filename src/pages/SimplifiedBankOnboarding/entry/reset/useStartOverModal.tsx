/**
 * The modal that confirms starting over or disconnecting the bank account, opened by the row that asks for it (BC-17).
 * It mirrors `useResetBankAccountModal`.
 *
 * What it hides: the content of the modal for a connected and for an unfinished account, the guard against a second
 * modal, the params of the reset (the workspace of the account, with the workspace summary as the fallback bank account
 * ID), the reset request, and where the user lands after the reset: the NonUSD country page, then the lab when the
 * setup was opened from it. The answer is applied also when the screen that opened the modal is gone.
 */
import {ModalActions} from '@components/Modal/Global/ModalContext';
import RenderHTML from '@components/RenderHTML';

import useConfirmModal from '@hooks/useConfirmModal';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import type {Workspaces} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {getBankAccountParams, openFlow} from '@pages/SimplifiedBankOnboarding/core';
import {ACCOUNT_ENDING_LENGTH} from '@pages/SimplifiedBankOnboarding/entry/accountEnding';
import {leaveEntryAfterReset} from '@pages/SimplifiedBankOnboarding/entry/entryNavigation';
import {resetBankAccount} from '@pages/SimplifiedBankOnboarding/entry/requests/resetBankAccount';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Route} from '@src/ROUTES';

import type {OnyxEntry} from 'react-native-onyx';

import React, {useRef} from 'react';
import {View} from 'react-native';

type StartOverModalOptions = {
    /** Picks the reset command, and a NonUSD reset opens the NonUSD country page right away */
    isNonUSD: boolean;

    /** Passed along to the NonUSD flow, and decides whether the user returns to the lab after the reset */
    backTo: Route | undefined;
};

function useStartOverModal({isNonUSD, backTo}: StartOverModalOptions): {
    openStartOverModal: () => void;
} {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {showConfirmModal} = useConfirmModal();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const achData = account?.achData;
    const policyID = achData?.policyID;
    const selectWorkspaceACHAccount = (workspaces: OnyxEntry<Workspaces>) => (policyID ? workspaces?.[policyID]?.achAccount : undefined);
    const [workspaceACHAccount] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, {selector: selectWorkspaceACHAccount});

    // A double press must not stack a second modal on the first one.
    const isModalOpenRef = useRef(false);

    function startOver() {
        // The account data may already be cleared when the user confirms, so the ID also comes from the summary on the workspace.
        resetBankAccount({
            isNonUSD,
            bankAccount: getBankAccountParams(policyID, achData, workspaceACHAccount?.bankAccountID),
            workspaceACHAccount,
        });
        if (isNonUSD) {
            openFlow({kind: 'nonUSD', policyID, backTo}, {step: SBO_CONST.NON_USD.PAGE_NAMES.COUNTRY});
        }
        leaveEntryAfterReset(backTo);
    }

    function openStartOverModal() {
        if (isModalOpenRef.current) {
            return;
        }
        isModalOpenRef.current = true;

        const isConnectedAccount = achData?.state === SBO_CONST.STATE.OPEN;
        const bankShortName = `${achData?.bankName ?? ''} ${(achData?.accountNumber ?? '').slice(-ACCOUNT_ENDING_LENGTH)}`;
        showConfirmModal({
            title: translate('workspace.bankAccount.areYouSure'),
            confirmText: isConnectedAccount ? translate('workspace.bankAccount.yesDisconnectMyBankAccount') : translate('workspace.bankAccount.yesStartOver'),
            cancelText: translate('common.cancel'),
            prompt: isConnectedAccount ? (
                <View style={[styles.renderHTML, styles.flexRow]}>
                    <RenderHTML html={translate('workspace.bankAccount.disconnectYourBankAccount', bankShortName)} />
                </View>
            ) : (
                translate('workspace.bankAccount.clearProgress')
            ),
            buttonVariant: CONST.BUTTON_VARIANT.DANGER,
            shouldShowCancelButton: true,
        }).then(({action}) => {
            isModalOpenRef.current = false;
            if (action !== ModalActions.CONFIRM) {
                return;
            }
            startOver();
        });
    }

    return {openStartOverModal};
}

export default useStartOverModal;
export type {StartOverModalOptions};
