/**
 * Opens the modal that confirms starting over or disconnecting the bank account. A screen asks for the modal by setting
 * `shouldShowResetModal` on the shared account object, and the hook answers by updating the state that the screens mirror.
 * It mirrors `useResetBankAccountModal`.
 */
import {ModalActions} from '@components/Modal/Global/ModalContext';
import RenderHTML from '@components/RenderHTML';

import useConfirmModal from '@hooks/useConfirmModal';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';

import {cancelResetBankAccount} from '@pages/SimplifiedBankOnboarding/actions/OnboardingAccount';
import {resetNonUSDBankAccount, resetUSDBankAccount} from '@pages/SimplifiedBankOnboarding/actions/ResetBankAccount';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {OnboardingAccount, Workspaces} from '@pages/SimplifiedBankOnboarding/types/onyx';
import {getBankAccountParams} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Route} from '@src/ROUTES';
import ROUTES from '@src/ROUTES';

import type {OnyxEntry} from 'react-native-onyx';

import React, {useEffect, useEffectEvent, useRef} from 'react';
import {View} from 'react-native';

type ResetOnboardingModalOptions = {
    account: OnyxEntry<OnboardingAccount>;
    isNonUSDWorkspace: boolean;
    setShouldShowConnectedBankAccount?: (shouldShowConnectedBankAccount: boolean) => void;
    setShouldShowContinueSetupButton?: (shouldShowContinueSetupButton: boolean) => void;

    /** Passed along to the NonUSD flow, which opens right after the reset */
    backTo?: Route;
};

const VISIBLE_ACCOUNT_NUMBER_DIGITS = 4;

function useResetOnboardingModal({account, isNonUSDWorkspace, setShouldShowConnectedBankAccount, setShouldShowContinueSetupButton, backTo}: ResetOnboardingModalOptions) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {showConfirmModal} = useConfirmModal();
    const achData = account?.achData;
    const policyID = achData?.policyID;
    const selectWorkspaceBankAccountID = (workspaces: OnyxEntry<Workspaces>) => (policyID ? workspaces?.[policyID]?.achAccount?.bankAccountID : undefined);
    const [workspaceBankAccountID] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, {selector: selectWorkspaceBankAccountID});
    const shouldShowResetModal = account?.shouldShowResetModal ?? false;
    const isInOpenState = achData?.state === SBO_CONST.STATE.OPEN;
    const bankShortName = `${achData?.bankName ?? ''} ${(achData?.accountNumber ?? '').slice(-VISIBLE_ACCOUNT_NUMBER_DIGITS)}`;

    const resetBankAccount = () => {
        // The account data may already be cleared when the user confirms, so the ID also comes from the summary on the workspace.
        const bankAccountParams = getBankAccountParams(policyID, achData, workspaceBankAccountID);

        if (isNonUSDWorkspace) {
            resetNonUSDBankAccount(bankAccountParams);
            setShouldShowConnectedBankAccount?.(false);
            setShouldShowContinueSetupButton?.(false);
            Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_NON_USD_SETUP.getRoute({policyID, page: SBO_CONST.NON_USD.PAGE_NAMES.COUNTRY, backTo}));
            return;
        }

        resetUSDBankAccount(bankAccountParams);
        setShouldShowContinueSetupButton?.(false);
        setShouldShowConnectedBankAccount?.(false);
    };

    // Several effects may ask for the modal while it is open, so this keeps it from opening twice.
    const isModalOpenRef = useRef(false);

    // The modal outlives the screen that opened it, so its answer is dropped when that screen is gone.
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const showResetModal = useEffectEvent(() => {
        if (isModalOpenRef.current) {
            return;
        }
        isModalOpenRef.current = true;
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
            isModalOpenRef.current = false;
            if (!isMountedRef.current) {
                return;
            }
            if (action !== ModalActions.CONFIRM) {
                cancelResetBankAccount();
                return;
            }
            resetBankAccount();
        });
    });

    useEffect(() => {
        if (!shouldShowResetModal) {
            isModalOpenRef.current = false;
            return;
        }
        showResetModal();
    }, [shouldShowResetModal]);
}

export default useResetOnboardingModal;
