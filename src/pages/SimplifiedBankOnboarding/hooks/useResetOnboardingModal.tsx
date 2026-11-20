/**
 * Returns the function that opens the modal that confirms starting over or disconnecting the bank account. The buttons
 * call it directly. The screens update nothing after a reset, because the entry page derives its screen from the
 * account data that the reset changes. It mirrors `useResetBankAccountModal`.
 */
import {ModalActions} from '@components/Modal/Global/ModalContext';
import RenderHTML from '@components/RenderHTML';

import useConfirmModal from '@hooks/useConfirmModal';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';

import {resetNonUSDBankAccount, resetUSDBankAccount} from '@pages/SimplifiedBankOnboarding/actions/ResetBankAccount';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {OnboardingAccount, Workspaces} from '@pages/SimplifiedBankOnboarding/types/onyx';
import {getBankAccountParams} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Route} from '@src/ROUTES';
import ROUTES from '@src/ROUTES';

import type {OnyxEntry} from 'react-native-onyx';

import React, {useEffect, useRef} from 'react';
import {View} from 'react-native';

type ResetOnboardingModalOptions = {
    account: OnyxEntry<OnboardingAccount>;
    isNonUSDWorkspace: boolean;

    /** Runs after the reset was sent, for a screen that has to leave the flow then */
    navigateAfterReset?: () => void;

    /** Passed along to the NonUSD flow, which opens right after the reset */
    backTo?: Route;
};

const VISIBLE_ACCOUNT_NUMBER_DIGITS = 4;

function useResetOnboardingModal({account, isNonUSDWorkspace, navigateAfterReset, backTo}: ResetOnboardingModalOptions) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {showConfirmModal} = useConfirmModal();
    const achData = account?.achData;
    const policyID = achData?.policyID;
    const selectWorkspaceACHAccount = (workspaces: OnyxEntry<Workspaces>) => (policyID ? workspaces?.[policyID]?.achAccount : undefined);
    const [workspaceACHAccount] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, {selector: selectWorkspaceACHAccount});
    const isInOpenState = achData?.state === SBO_CONST.STATE.OPEN;
    const bankShortName = `${achData?.bankName ?? ''} ${(achData?.accountNumber ?? '').slice(-VISIBLE_ACCOUNT_NUMBER_DIGITS)}`;

    const resetBankAccount = () => {
        // The account data may already be cleared when the user confirms, so the ID also comes from the summary on the workspace.
        const bankAccountParams = getBankAccountParams(policyID, achData, workspaceACHAccount?.bankAccountID);

        if (isNonUSDWorkspace) {
            resetNonUSDBankAccount(bankAccountParams, workspaceACHAccount);
            Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_NON_USD_SETUP.getRoute({policyID, page: SBO_CONST.NON_USD.PAGE_NAMES.COUNTRY, backTo}));
        } else {
            resetUSDBankAccount(bankAccountParams, workspaceACHAccount);
        }
        navigateAfterReset?.();
    };

    // The modal outlives the screen that opened it, so its answer is dropped when that screen is gone.
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const showResetModal = () => {
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
            if (!isMountedRef.current || action !== ModalActions.CONFIRM) {
                return;
            }
            resetBankAccount();
        });
    };

    return showResetModal;
}

export default useResetOnboardingModal;
