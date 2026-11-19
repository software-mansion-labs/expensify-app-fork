/**
 * The page that opens the bank onboarding of a workspace. It fetches the account, decides which screen the user sees
 * (a blocker, the connected account, the redirect to the pending validation, or the entry point) and stays mounted under
 * the flow pages, where its effects keep reacting to the shared account object.
 * It mirrors `ReimbursementAccountPage`.
 */
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
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

import {clearOnboardingAccount, clearOnboardingDraft, DEFAULT_ACCOUNT, setOnboardingAccountLoading, updateOnboardingDraft} from '@pages/SimplifiedBankOnboarding/actions/OnboardingAccount';
import {openOnboardingPage} from '@pages/SimplifiedBankOnboarding/actions/OnboardingPage';
import {getResumePosition} from '@pages/SimplifiedBankOnboarding/flow/flowNavigation';
import NON_USD_FLOW from '@pages/SimplifiedBankOnboarding/flow/nonUSDFlow';
import USD_FLOW from '@pages/SimplifiedBankOnboarding/flow/usdFlow';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {USDStep} from '@pages/SimplifiedBankOnboarding/types/onyx';
import getDraftValuesForStep from '@pages/SimplifiedBankOnboarding/utils/getDraftValuesForStep';
import {hasInProgressSetup, hasInProgressUSDSetup, isSupportedCurrency} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

import {useIsFocused} from '@react-navigation/native';
import {deepEqual} from 'fast-equals';
import React, {useEffect, useEffectEvent, useRef, useState} from 'react';
import {View} from 'react-native';

import ConnectedBankAccount from './ConnectedBankAccount';
import OnboardingFlowEntryPoint from './OnboardingFlowEntryPoint';

type OnboardingEntryPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.ENTRY>;

const {STEP, PAGE_NAMES} = SBO_CONST.USD;

/** The steps whose data is on the device, so they can be shown without a connection */
const OFFLINE_ACCESSIBLE_STEPS: USDStep[] = [STEP.COUNTRY, STEP.BANK_ACCOUNT, STEP.REQUESTOR, STEP.COMPANY];

function OnboardingEntryPage({route}: OnboardingEntryPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const {environmentURL} = useEnvironment();
    const isFocused = useIsFocused();

    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [workspaces] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES);

    const policyID = route.params?.policyID;
    const bankAccountIDParam = route.params?.bankAccountID;
    const backTo = route.params?.backTo;
    const isChangingBankAccount = !!route.params?.isChangingBankAccount;

    const isChangingBankAccountRef = useRef(isChangingBankAccount);
    const hasShownConnectedBankAccountRef = useRef(false);

    // Keeps the redirect to the pending validation from firing twice while the transition is still running.
    const hasRedirectedToPendingValidationRef = useRef(false);

    // The redirect ref flips while this page is still focused, so a second ref records that the validation step really covered it.
    const hasBlurredAfterPendingRedirectRef = useRef(false);

    // Tells the unmount cleanup that the validation step is gone too, so nothing reads the account data anymore.
    const isLeavingPendingValidationFlowRef = useRef(false);

    const prevAccount = usePrevious(account);
    const prevIsOffline = usePrevious(isOffline);

    const workspace = policyID ? workspaces?.[policyID] : undefined;
    const isLoadingWorkspaces = !workspaces;
    const achData = account?.achData;
    const policyCurrency = workspace ? workspace.outputCurrency : (achData?.currency ?? draft?.currency);
    const isNonUSDWorkspace = !!policyCurrency && policyCurrency !== SBO_CONST.CURRENCY.USD;
    const hasUnsupportedCurrency = !!policyCurrency && !isSupportedCurrency(policyCurrency);
    const isAuthorized = workspace?.role === SBO_CONST.WORKSPACE_ROLE.ADMIN;

    // The account object is shared by every workspace, so it only belongs to this page when it carries the policy ID of the URL.
    const isPreviousPolicy = !!policyID && !!account && policyID === achData?.policyID;
    const hasConfirmedUSDCurrency = (draft?.country ?? '') !== '' || (achData?.accountNumber ?? '') !== '';

    // The country step only exists on the client, so the server step counts once the user got past it.
    const currentStep: USDStep = hasConfirmedUSDCurrency ? (achData?.currentStep ?? STEP.COUNTRY) : STEP.COUNTRY;

    // A page opened by the bank account ID has no workspace, so the flow type is a state that an effect corrects once the currency arrives.
    const [isNonUSDSetup, setIsNonUSDSetup] = useState(workspace ? isNonUSDWorkspace : achData?.currency !== SBO_CONST.CURRENCY.USD || draft?.currency !== SBO_CONST.CURRENCY.USD);
    const isConnectedBankAccountData = isNonUSDSetup ? achData?.state === SBO_CONST.STATE.OPEN : achData?.currentStep === STEP.ENABLE;

    const shouldShowContinueSetupButtonValue = hasInProgressSetup(achData, isNonUSDWorkspace, policyID);
    const hasLoadedData = !!achData && !deepEqual(account, DEFAULT_ACCOUNT) && !account?.isLoading;

    // A pending USD account has nothing to pick on this page, so the page only redirects to the validation step.
    // The policy ID must match because the account object is persisted and may still describe another workspace.
    const shouldRedirectToPendingValidation =
        policyCurrency === SBO_CONST.CURRENCY.USD &&
        achData?.state === SBO_CONST.STATE.PENDING &&
        hasLoadedData &&
        !isChangingBankAccount &&
        !!policyID &&
        achData?.policyID === policyID &&
        isAuthorized;

    // These three copy values that are also derived above. They exist because the data arrives after the first render,
    // and because the reset modal and the back handler change them directly.
    const [hasACHDataBeenLoaded, setHasACHDataBeenLoaded] = useState(hasLoadedData);
    const [shouldShowContinueSetupButton, setShouldShowContinueSetupButton] = useState(shouldShowContinueSetupButtonValue);
    const [shouldShowConnectedBankAccount, setShouldShowConnectedBankAccount] = useState(false);

    const leavePendingValidationFlow = () => {
        isLeavingPendingValidationFlowRef.current = true;
        if (backTo) {
            Navigation.goBack(backTo);
            return;
        }
        Navigation.dismissModal();
    };

    const fetchData = () => {
        if (!policyID && !bankAccountIDParam) {
            return;
        }
        if (bankAccountIDParam) {
            openOnboardingPage({bankAccountID: Number(bankAccountIDParam)});
            return;
        }
        openOnboardingPage({policyID});
    };

    useEffect(() => {
        const isChangingBankAccountInstance = isChangingBankAccountRef.current;
        return () => {
            // The instance that replaces a bank account shares the data with the instance under it, which still needs it.
            if (isChangingBankAccountInstance) {
                return;
            }
            clearOnboardingDraft();

            // The validation step reads the account data and fetches nothing, so the data must survive the redirect into it.
            if (!hasRedirectedToPendingValidationRef.current || isLeavingPendingValidationFlowRef.current) {
                clearOnboardingAccount();
            }
        };
    }, []);

    useEffect(() => {
        if (!policyCurrency || isNonUSDSetup === (policyCurrency !== SBO_CONST.CURRENCY.USD)) {
            return;
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect -- The lab reproduces the mirrored state of the real entry page on purpose
        setIsNonUSDSetup(policyCurrency !== SBO_CONST.CURRENCY.USD);
    }, [policyCurrency, isNonUSDSetup]);

    const openPageForWorkspace = useEffectEvent(() => {
        if (isPreviousPolicy && !!account) {
            return;
        }
        if (policyID) {
            setOnboardingAccountLoading(true);
            clearOnboardingDraft();
        }
        fetchData();
    });

    // The response of the fetch makes the account belong to this workspace, which is the only change that this effect waits for.
    useEffect(() => {
        openPageForWorkspace();
    }, [isPreviousPolicy]);

    const refetchAfterAbandonedChange = useEffectEvent(() => {
        fetchData();
    });

    // Replacing a bank account clears the shared data. When the user backs out of the replacement, the focus returns
    // here without the connected account that this page was showing, so the page fetches it again.
    useEffect(() => {
        if (isChangingBankAccount || !isFocused) {
            return;
        }
        if (isConnectedBankAccountData) {
            hasShownConnectedBankAccountRef.current = true;
            return;
        }
        if (!shouldShowContinueSetupButtonValue && hasShownConnectedBankAccountRef.current) {
            refetchAfterAbandonedChange();
        }
    }, [isFocused, isChangingBankAccount, isConnectedBankAccountData, shouldShowContinueSetupButtonValue]);

    useEffect(() => {
        if (policyID && !isPreviousPolicy) {
            return;
        }

        // A push and not a replace: replacing unmounts this page, and its cleanup clears the data that the validation step reads.
        if (shouldRedirectToPendingValidation && !hasRedirectedToPendingValidationRef.current) {
            hasRedirectedToPendingValidationRef.current = true;
            Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({policyID, page: PAGE_NAMES.VALIDATION, backTo}));
            return;
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect -- The lab reproduces the mirrored state of the real entry page on purpose
        setShouldShowConnectedBankAccount(isConnectedBankAccountData);
        setShouldShowContinueSetupButton(shouldShowContinueSetupButtonValue);
    }, [policyID, shouldShowContinueSetupButtonValue, isConnectedBankAccountData, isPreviousPolicy, shouldRedirectToPendingValidation, backTo]);

    const leaveFlowWhenFocusReturnsAfterRedirect = useEffectEvent(() => {
        if (!hasRedirectedToPendingValidationRef.current) {
            return;
        }
        if (!isFocused) {
            hasBlurredAfterPendingRedirectRef.current = true;
            return;
        }

        // The user came back onto this page, for example with the back button of the browser. The page would only show
        // its loader for a pending account, so it leaves the flow instead.
        if (!hasBlurredAfterPendingRedirectRef.current || !shouldRedirectToPendingValidation) {
            return;
        }
        leavePendingValidationFlow();
    });

    // Declared after the redirect effect, so that it sees the blur flag unset on the commit where the redirect fires.
    useEffect(() => {
        leaveFlowWhenFocusReturnsAfterRedirect();
    }, [isFocused, shouldRedirectToPendingValidation]);

    const syncWithAccountChanges = useEffectEvent(() => {
        const isBackOnline = prevIsOffline && !isOffline;
        if (isBackOnline && prevAccount && prevAccount.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE) {
            fetchData();
        }

        if (!hasACHDataBeenLoaded) {
            if (hasLoadedData) {
                setHasACHDataBeenLoaded(true);
            }
            return;
        }

        // The reset request finished, so the account on the server is gone or the request failed and it is still there.
        if (prevAccount?.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE && account?.pendingAction !== prevAccount.pendingAction) {
            setShouldShowContinueSetupButton(hasInProgressUSDSetup(achData));
        }

        if (shouldShowContinueSetupButton) {
            return;
        }

        // A USD request stored the step that it saved. The values that the server sent back for that step become the draft.
        const draftStep = account?.draftStep;
        if (draftStep) {
            updateOnboardingDraft(getDraftValuesForStep(draftStep, achData));
        }
    });

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- The lab reproduces the mirrored state of the real entry page on purpose
        syncWithAccountChanges();
    }, [isOffline, account?.draftStep, account?.pendingAction, account?.isLoading, hasACHDataBeenLoaded, shouldShowContinueSetupButton, currentStep]);

    const continueUSDSetup = () => {
        const {page, subPage} = getResumePosition(USD_FLOW, {currency: policyCurrency, server: achData, draft});
        Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({policyID, page, subPage, backTo}));
    };

    const continueNonUSDSetup = () => {
        const {page, subPage} = getResumePosition(NON_USD_FLOW, {currency: policyCurrency, server: achData, draft});
        Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_NON_USD_SETUP.getRoute({policyID, page, subPage, backTo}));
    };

    const goBackFromCurrentStep = () => {
        switch (currentStep) {
            case STEP.COUNTRY:
                if (hasInProgressUSDSetup(achData)) {
                    setShouldShowContinueSetupButton(true);
                }
                Navigation.goBack(backTo);
                break;
            case STEP.VALIDATION:
                if (achData?.state === SBO_CONST.STATE.PENDING) {
                    Navigation.dismissModal();
                    break;
                }
                Navigation.goBack(backTo);
                break;
            default:
                Navigation.dismissModal();
        }
    };

    // The requests of the steps follow their own IDs, so `isLoading` only covers the reads of this page.
    const isLoading = !!account?.isLoading;
    // Offline, only the steps that send nothing can be shown, and only with the data that was loaded before.
    const shouldShowOfflineLoader = !(hasLoadedData && isOffline && OFFLINE_ACCESSIBLE_STEPS.some((step) => step === currentStep));

    // Matched the way `fetchData` opens the account. An account without the ID of the route counts as another one.
    const isOtherAccount = bankAccountIDParam ? achData?.bankAccountID !== Number(bankAccountIDParam) : !!policyID && achData?.policyID !== policyID;

    // `hasLoadedData` only proves that the object differs from the default one. Offline, the actions of the mount effect
    // already cause that with nothing loaded, so the data must also belong to this page.
    const hasACHDataForThisPage = !isEmptyObject(achData) && !deepEqual(achData, DEFAULT_ACCOUNT.achData) && !isOtherAccount;

    if (isOffline && (!hasLoadedData || !hasACHDataForThisPage)) {
        return (
            <ScreenWrapper testID="SimplifiedBankOnboardingEntryPage">
                <HeaderWithBackButtonAndTitle
                    title={translate('bankAccount.addBankAccount')}
                    onBackButtonPress={() => Navigation.goBack(backTo)}
                />
                <FullPageOfflineBlockingView>{null}</FullPageOfflineBlockingView>
            </ScreenWrapper>
        );
    }

    if (isLoadingWorkspaces) {
        return <FullScreenLoadingIndicator onGoBack={() => Navigation.goBack(backTo)} />;
    }

    if ((!!policyID || !!bankAccountIDParam) && !isChangingBankAccount && (!hasACHDataBeenLoaded || isLoading) && shouldShowOfflineLoader) {
        return <ReimbursementAccountLoadingIndicator onBackButtonPress={goBackFromCurrentStep} />;
    }

    // A page without a workspace ID is not checked, like the real page that the Wallet opens by the bank account ID.
    if (!!policyID && !isLoading && (!workspace || !isAuthorized)) {
        return (
            <ScreenWrapper testID="SimplifiedBankOnboardingEntryPage">
                <FullPageNotFoundView
                    shouldShow
                    onBackButtonPress={() => Navigation.goBack(backTo)}
                    onLinkPress={() => Navigation.goBack(backTo)}
                    subtitleKey={workspace ? 'workspace.common.notAuthorized' : undefined}
                />
            </ScreenWrapper>
        );
    }

    let errorText;
    if (account?.throttledDate) {
        errorText = <Text>{translate('bankAccount.hasBeenThrottledError')}</Text>;
    } else if (hasUnsupportedCurrency) {
        errorText = <RenderHTML html={translate('bankAccount.hasCurrencyError', `${environmentURL}/${ROUTES.SETTINGS_BANK_ONBOARDING_LAB}`)} />;
    }

    if (errorText) {
        return (
            <ScreenWrapper testID="SimplifiedBankOnboardingEntryPage">
                <HeaderWithBackButtonAndTitle
                    title={translate('bankAccount.addBankAccount')}
                    subtitle={workspace?.name}
                    onBackButtonPress={() => Navigation.goBack(backTo)}
                />
                <View style={[styles.m5, styles.mv3, styles.flex1]}>{errorText}</View>
            </ScreenWrapper>
        );
    }

    // The instance that replaces the bank account shows the setup options, although the shared data still describes the connected account.
    if (shouldShowConnectedBankAccount && isConnectedBankAccountData && !isChangingBankAccount) {
        return (
            <ConnectedBankAccount
                account={account}
                setShouldShowConnectedBankAccount={setShouldShowConnectedBankAccount}
                onBackButtonPress={goBackFromCurrentStep}
                isNonUSDWorkspace={isNonUSDSetup}
            />
        );
    }

    // The loader stays up for a pending USD account, so the entry point is never painted on the way to the validation step.
    if (shouldRedirectToPendingValidation) {
        return <ReimbursementAccountLoadingIndicator onBackButtonPress={leavePendingValidationFlow} />;
    }

    // Once the data has loaded, the derived value is used, because the copy in the state is one render behind it.
    const shouldShowContinueSetupButtonToDisplay = !isChangingBankAccount && (hasLoadedData ? shouldShowContinueSetupButtonValue : shouldShowContinueSetupButton);

    return (
        <OnboardingFlowEntryPoint
            account={account}
            onContinuePress={isNonUSDSetup ? continueNonUSDSetup : continueUSDSetup}
            policyName={workspace?.name}
            policyID={policyID}
            currency={policyCurrency}
            backTo={backTo}
            shouldShowContinueSetupButton={shouldShowContinueSetupButtonToDisplay}
            isNonUSDWorkspace={isNonUSDSetup}
            setShouldShowContinueSetupButton={setShouldShowContinueSetupButton}
            isChangingBankAccount={isChangingBankAccount}
        />
    );
}

export default OnboardingEntryPage;
