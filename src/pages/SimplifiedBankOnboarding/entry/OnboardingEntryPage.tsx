/**
 * The page that opens the bank onboarding of a workspace. It reads the account once it opens, and `getEntryStatus`
 * decides on every render which screen the user sees: a blocker, the connected account, the redirect to the pending
 * validation, or the entry point. The flow pages load their own data, so this page holds nothing for them.
 * It mirrors `ReimbursementAccountPage`.
 */
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import HeaderWithBackButtonAndTitle from '@components/Header/composed/HeaderWithBackButtonAndTitle';
import ReimbursementAccountLoadingIndicator from '@components/ReimbursementAccountLoadingIndicator';
import RenderHTML from '@components/RenderHTML';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';

import useEnvironment from '@hooks/useEnvironment';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import usePrevious from '@hooks/usePrevious';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import {clearOnboardingDraft} from '@pages/SimplifiedBankOnboarding/actions/OnboardingAccount';
import {openOnboardingPage} from '@pages/SimplifiedBankOnboarding/actions/OnboardingPage';
import NotFoundPage from '@pages/SimplifiedBankOnboarding/components/NotFoundPage';
import OfflineBlockedPage from '@pages/SimplifiedBankOnboarding/components/OfflineBlockedPage';
import {getResumePosition} from '@pages/SimplifiedBankOnboarding/flow/flowNavigation';
import NON_USD_FLOW from '@pages/SimplifiedBankOnboarding/flow/nonUSDFlow';
import USD_FLOW from '@pages/SimplifiedBankOnboarding/flow/usdFlow';
import useFlowContext from '@pages/SimplifiedBankOnboarding/flow/useFlowContext';
import useStepRequest from '@pages/SimplifiedBankOnboarding/requests/useStepRequest';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {Workspaces} from '@pages/SimplifiedBankOnboarding/types/onyx';
import {isAccountForRoute} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

import type {OnyxEntry} from 'react-native-onyx';

import {useIsFocused} from '@react-navigation/native';
import React, {useEffect, useEffectEvent} from 'react';
import {View} from 'react-native';

import ConnectedBankAccount from './ConnectedBankAccount';
import getEntryStatus, {isNonUSDCurrency} from './getEntryStatus';
import OnboardingFlowEntryPoint from './OnboardingFlowEntryPoint';

type OnboardingEntryPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.ENTRY>;

const {STEP, PAGE_NAMES} = SBO_CONST.USD;

const areWorkspacesLoadedSelector = (workspaces: OnyxEntry<Workspaces>) => !!workspaces;

function OnboardingEntryPage({route}: OnboardingEntryPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const {environmentURL} = useEnvironment();
    const isFocused = useIsFocused();

    const policyID = route.params?.policyID;
    const bankAccountIDParam = route.params?.bankAccountID;
    const backTo = route.params?.backTo;
    const isChangingBankAccount = !!route.params?.isChangingBankAccount;
    const routeIdentity = {policyID, bankAccountID: bankAccountIDParam ? Number(bankAccountIDParam) : undefined};

    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [areWorkspacesLoaded = false] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, {selector: areWorkspacesLoadedSelector});
    const selectWorkspace = (workspaces: OnyxEntry<Workspaces>) => (policyID ? workspaces?.[policyID] : undefined);
    const [workspace] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, {selector: selectWorkspace});
    const context = useFlowContext(policyID);
    const accountRead = useStepRequest();

    const achData = context.server;
    const currency = context.currency;
    const isNonUSDWorkspace = isNonUSDCurrency(currency);
    const isDataForRoute = isAccountForRoute(achData, routeIdentity);

    // A page opened by the bank account ID learns its workspace from the data, and the flow pages need it in their URL.
    const flowPolicyID = policyID ?? achData?.policyID;

    const status = getEntryStatus({
        achData,
        throttledDate: account?.throttledDate,
        workspace,
        areWorkspacesLoaded,
        route: routeIdentity,
        currency,
        isChangingBankAccount,
        isOffline,
        accountRead,
    });

    // The data of a page that was covered, or of a connection that was lost, may be old, so the page reads it again then.
    const hasRegainedFocus = usePrevious(isFocused) === false && isFocused;
    const hasReconnected = usePrevious(isOffline) && !isOffline;
    const isDeletingAccount = account?.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE;

    const readAccountIfNeeded = useEffectEvent(() => {
        if (!isFocused || isOffline || isDeletingAccount || accountRead.isPending) {
            return;
        }
        if (accountRead.hasFailed && !hasRegainedFocus && !hasReconnected) {
            return;
        }
        // The replacement starts from the data of the connected account, so a read would bring back what it replaces.
        if (isDataForRoute && (isChangingBankAccount || (accountRead.wasSent && !hasRegainedFocus && !hasReconnected))) {
            return;
        }
        if (!routeIdentity.policyID && !routeIdentity.bankAccountID) {
            return;
        }
        // The draft of another account must not prefill this one, because the draft wins over the server data. Missing
        // data, for example after a failed reset, names no other account, so the draft stays.
        if (achData && !isDataForRoute && !isChangingBankAccount) {
            clearOnboardingDraft();
        }
        accountRead.send((requestID) => openOnboardingPage(requestID, routeIdentity));
    });

    // Also reads again when a reset fails: the reset removed the data, and the server still holds the account.
    useEffect(() => {
        readAccountIfNeeded();
    }, [isFocused, isOffline, isDeletingAccount, isDataForRoute]);

    useEffect(
        () => () => {
            // The instance that replaces a bank account shares the draft with the instance under it, which still needs it.
            if (isChangingBankAccount) {
                return;
            }
            clearOnboardingDraft();
        },
        [isChangingBankAccount],
    );

    const redirectToPendingValidation = useEffectEvent(() => {
        if (!isFocused) {
            return;
        }
        // A replace, so the back button of the validation step leaves the flow instead of landing on this page again.
        Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({policyID, page: PAGE_NAMES.VALIDATION, backTo}), {forceReplace: true});
    });

    useEffect(() => {
        if (status !== 'pendingValidation') {
            return;
        }
        redirectToPendingValidation();
    }, [status, isFocused]);

    const continueSetup = () => {
        if (isNonUSDWorkspace) {
            const {page, subPage} = getResumePosition(NON_USD_FLOW, context);
            Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_NON_USD_SETUP.getRoute({policyID: flowPolicyID, page, subPage, backTo}));
            return;
        }
        const {page, subPage} = getResumePosition(USD_FLOW, context);
        Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({policyID: flowPolicyID, page, subPage, backTo}));
    };

    const goBackFromCurrentStep = () => {
        // The country step only exists on the client, so the server step counts once the user got past it.
        const hasConfirmedUSDCurrency = !!context.draft?.country || !!achData?.accountNumber;
        const currentStep = hasConfirmedUSDCurrency ? (achData?.currentStep ?? STEP.COUNTRY) : STEP.COUNTRY;
        if (currentStep === STEP.COUNTRY || (currentStep === STEP.VALIDATION && achData?.state !== SBO_CONST.STATE.PENDING)) {
            Navigation.goBack(backTo);
            return;
        }
        Navigation.dismissModal();
    };

    switch (status) {
        case 'offlineBlocked':
            return <OfflineBlockedPage onBackButtonPress={() => Navigation.goBack(backTo)} />;
        case 'loadingWorkspaces':
            return <FullScreenLoadingIndicator onGoBack={() => Navigation.goBack(backTo)} />;
        case 'loading':
            return <ReimbursementAccountLoadingIndicator onBackButtonPress={goBackFromCurrentStep} />;
        case 'notFound':
        case 'notAuthorized':
            return (
                <NotFoundPage
                    onBackButtonPress={() => Navigation.goBack(backTo)}
                    isNotAuthorized={status === 'notAuthorized'}
                />
            );
        case 'throttled':
        case 'unsupportedCurrency':
            return (
                <ScreenWrapper testID="SimplifiedBankOnboardingEntryPage">
                    <HeaderWithBackButtonAndTitle
                        title={translate('bankAccount.addBankAccount')}
                        subtitle={workspace?.name}
                        onBackButtonPress={() => Navigation.goBack(backTo)}
                    />
                    <View style={[styles.m5, styles.mv3, styles.flex1]}>
                        {status === 'throttled' ? (
                            <Text>{translate('bankAccount.hasBeenThrottledError')}</Text>
                        ) : (
                            <RenderHTML html={translate('bankAccount.hasCurrencyError', `${environmentURL}/${ROUTES.SETTINGS_BANK_ONBOARDING_LAB}`)} />
                        )}
                    </View>
                </ScreenWrapper>
            );
        case 'connected':
            return (
                <ConnectedBankAccount
                    account={account}
                    onBackButtonPress={goBackFromCurrentStep}
                    isNonUSDWorkspace={isNonUSDWorkspace}
                />
            );
        // The loader stays up while the page replaces itself with the validation step, so the entry point is never painted.
        case 'pendingValidation':
            return <ReimbursementAccountLoadingIndicator onBackButtonPress={() => Navigation.goBack(backTo)} />;
        case 'continueSetup':
        case 'chooseSetup':
            return (
                <OnboardingFlowEntryPoint
                    account={account}
                    onContinuePress={continueSetup}
                    policyName={workspace?.name}
                    policyID={flowPolicyID}
                    currency={currency}
                    backTo={backTo}
                    shouldShowContinueSetupButton={status === 'continueSetup'}
                    isNonUSDWorkspace={isNonUSDWorkspace}
                    isChangingBankAccount={isChangingBankAccount}
                />
            );
        default:
            return null;
    }
}

export default OnboardingEntryPage;
