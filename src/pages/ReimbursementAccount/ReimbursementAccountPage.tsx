import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
import ConfirmationPageDefault from '@components/ConfirmationPage/composed/ConfirmationPageDefault';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import {useSession} from '@components/OnyxListItemProvider';
import ReimbursementAccountLoadingIndicator from '@components/ReimbursementAccountLoadingIndicator';
import RenderHTML from '@components/RenderHTML';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';

import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useEnvironment from '@hooks/useEnvironment';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import usePrevious from '@hooks/usePrevious';
import useRootNavigationState from '@hooks/useRootNavigationState';
import useThemeStyles from '@hooks/useThemeStyles';

import {isCurrencySupportedForECards} from '@libs/CardUtils';
import createDynamicRoute from '@libs/Navigation/helpers/dynamicRoutesUtils/createDynamicRoute';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {ReimbursementAccountNavigatorParamList} from '@libs/Navigation/types';
import {canMemberWrite, goBackFromInvalidPolicy, isPendingDeletePolicy} from '@libs/PolicyUtils';
import {hasInProgressUSDVBBA, hasInProgressVBBA, REIMBURSEMENT_ACCOUNT_ROUTE_NAMES} from '@libs/ReimbursementAccountUtils';

import {isFullScreenName} from '@navigation/helpers/isNavigatorName';

import type {WithPolicyOnyxProps} from '@pages/workspace/withPolicy';
import withPolicy from '@pages/workspace/withPolicy';

import {
    clearOnfidoToken,
    goToWithdrawalAccountSetupStep,
    hideBankAccountErrors,
    openReimbursementAccountPage,
    setBankAccountSubStep,
    setPlaidEvent,
    setReimbursementAccountLoading,
    updateReimbursementAccountDraft,
} from '@userActions/BankAccounts';
import {setDraftValues} from '@userActions/FormActions';
import {getPaymentMethods} from '@userActions/PaymentMethods';
import {isCurrencySupportedForGlobalReimbursement} from '@userActions/Policy/Policy';
import {
    cancelChangingToNewBankAccount,
    clearReimbursementAccount,
    clearReimbursementAccountBackup,
    clearReimbursementAccountDraft,
    restoreReimbursementAccountBackup,
} from '@userActions/ReimbursementAccount';

import CONST from '@src/CONST';
import NAVIGATORS from '@src/NAVIGATORS';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES, {DYNAMIC_ROUTES} from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type {InputID} from '@src/types/form/ReimbursementAccountForm';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';
import type {ACHDataReimbursementAccount, ReimbursementAccountStep} from '@src/types/onyx/ReimbursementAccount';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

import type {TupleToUnion} from 'type-fest';
import type {EventFrom} from 'xstate';

import {useIsFocused} from '@react-navigation/native';
import {Str} from 'expensify-common';
import {deepEqual} from 'fast-equals';
import lodashPick from 'lodash/pick';
import React, {useEffect, useRef, useState} from 'react';
import {View} from 'react-native';
import {initialTransition, transition} from 'xstate';

import ConnectedVerifiedBankAccount from './ConnectedVerifiedBankAccount';
import getStartPageForContinueSetup from './NonUSD/utils/getStartPageForContinueSetup';
import pendingValidationRedirectMachine, {KEEPS_ACCOUNT_DATA_TAG, PENDING_VALIDATION_REDIRECT_ACTION} from './pendingValidationRedirectMachine';
import getFieldsForStep from './USD/utils/getFieldsForStep';
import getStepToOpenFromRouteParams from './USD/utils/getStepToOpenFromRouteParams';
import VerifiedBankAccountFlowEntryPoint from './VerifiedBankAccountFlowEntryPoint';

type ReimbursementAccountPageProps = WithPolicyOnyxProps & PlatformStackScreenProps<ReimbursementAccountNavigatorParamList, typeof SCREENS.REIMBURSEMENT_ACCOUNT_ROOT>;
type CurrencyType = TupleToUnion<typeof CONST.DIRECT_REIMBURSEMENT_CURRENCIES>;

const OFFLINE_ACCESSIBLE_STEPS = [
    CONST.BANK_ACCOUNT.STEP.COUNTRY,
    CONST.BANK_ACCOUNT.STEP.BANK_ACCOUNT,
    CONST.BANK_ACCOUNT.STEP.COMPANY,
    CONST.BANK_ACCOUNT.STEP.REQUESTOR,
    CONST.BANK_ACCOUNT.STEP.BENEFICIAL_OWNERS,
    CONST.BANK_ACCOUNT.STEP.ACH_CONTRACT,
] as const;

function ReimbursementAccountPage({route, policy, isLoadingPolicy}: ReimbursementAccountPageProps) {
    const {environmentURL} = useEnvironment();
    const session = useSession();
    const {login: currentUserLogin = ''} = useCurrentUserPersonalDetails();
    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);
    const [reimbursementAccountDraft] = useOnyx(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM_DRAFT);
    const [plaidCurrentEvent = ''] = useOnyx(ONYXKEYS.PLAID_CURRENT_EVENT);
    const [onfidoToken = ''] = useOnyx(ONYXKEYS.ONFIDO_TOKEN);
    const [isLoadingApp = false] = useOnyx(ONYXKEYS.IS_LOADING_APP);
    const topmostFullScreenRoute = useRootNavigationState((state) => state?.routes.findLast((lastRoute) => isFullScreenName(lastRoute.name)));
    const [isChangingToNewBankAccount] = useOnyx(ONYXKEYS.IS_CHANGING_TO_NEW_BANK_ACCOUNT);
    const [reimbursementAccountBackup] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT_BACKUP);

    const policyName = policy?.name ?? '';
    const policyIDParam = route.params?.policyID;
    const bankAccountIDParam = route.params?.bankAccountID;
    const backTo = route.params?.backTo;
    const isChangingBankAccount = !!route.params?.isChangingBankAccount;
    const isComingFromExpensifyCard = (backTo as string)?.includes(CONST.EXPENSIFY_CARD.ROUTE as string);
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const hasRequestedNewBankAccountRef = useRef(false);
    const hasClearedStalePlaidErrorsRef = useRef(false);
    const isChangingBankAccountRef = useRef(isChangingBankAccount);
    const hasShownConnectedBankAccountRef = useRef(false);
    // A ref rather than state, so a transition cannot repaint the entry point on the way out of the page.
    const pendingValidationRedirectRef = useRef(initialTransition(pendingValidationRedirectMachine)[0]);
    const prevReimbursementAccount = usePrevious(reimbursementAccount);
    const prevIsOffline = usePrevious(isOffline);
    const achData = reimbursementAccount?.achData;
    const policyCurrency = policy ? policy.outputCurrency : (achData?.currency ?? reimbursementAccountDraft?.currency);
    const prevPolicyCurrency = usePrevious(policyCurrency);
    const achContractValuesRef = useRef<{
        isAuthorizedToUseBankAccount?: boolean;
        certifyTrueInformation?: boolean;
        acceptTermsAndConditions?: boolean;
    }>({});
    const isLoadingWorkspaceReimbursement = policy?.isLoadingWorkspaceReimbursement;
    const prevIsLoadingWorkspaceReimbursement = usePrevious(isLoadingWorkspaceReimbursement);

    const [isSettingBA, setIsSettingBA] = useState(false);
    // Keeps the loader up while switching the workspace's bank account, bridging the gap between the switch request
    // finishing and the follow-up refetch's own loading flag landing.
    if (isLoadingWorkspaceReimbursement && !prevIsLoadingWorkspaceReimbursement && !isSettingBA) {
        setIsSettingBA(true);
    } else if (isSettingBA && !isLoadingWorkspaceReimbursement && reimbursementAccount?.isLoading) {
        setIsSettingBA(false);
    }
    const isNonUSDWorkspace = !!policyCurrency && policyCurrency !== CONST.CURRENCY.USD;
    const hasUnsupportedCurrency =
        isComingFromExpensifyCard && isNonUSDWorkspace
            ? !isCurrencySupportedForECards(policyCurrency)
            : policyCurrency && !isCurrencySupportedForGlobalReimbursement(policyCurrency as CurrencyType);

    const nonUSDCountryDraftValue = reimbursementAccountDraft?.country ?? '';
    let workspaceRoute = '';
    const isFocused = useIsFocused();

    // Navigation.getActiveRoute() can return the route of previous page while this page is blurred
    // So add isFocused check to get the correct workspaceRoute
    if (isFocused) {
        workspaceRoute = `${environmentURL}/${ROUTES.WORKSPACE_OVERVIEW.getRoute(policyIDParam, Navigation.getActiveRoute())}`;
    }

    const contactMethodRoute = `${environmentURL}/${createDynamicRoute(DYNAMIC_ROUTES.CONTACT_METHODS.path, backTo)}`;
    const isPreviousPolicy = !!policyIDParam && !!reimbursementAccount && policyIDParam === achData?.policyID;
    const hasConfirmedUSDCurrency = (reimbursementAccountDraft?.[INPUT_IDS.ADDITIONAL_DATA.COUNTRY] ?? '') !== '' || (achData?.accountNumber ?? '') !== '';

    /**
     We main rely on `achData.currentStep` to determine the step to display in USD flow.
     This data is synchronized with the BE to know which step to resume/start from.
     Except for the CountryStep which exists purely in the FE.
     This function is to decide if we should start from the CountryStep.
     */
    const getInitialCurrentStep = () => {
        if (!hasConfirmedUSDCurrency) {
            return CONST.BANK_ACCOUNT.STEP.COUNTRY;
        }

        return achData?.currentStep ?? CONST.BANK_ACCOUNT.STEP.COUNTRY;
    };
    const currentStep = getInitialCurrentStep();
    const [isNonUSDSetup, setIsNonUSDSetup] = useState(policy ? isNonUSDWorkspace : achData?.currency !== CONST.CURRENCY.USD || reimbursementAccountDraft?.currency !== CONST.CURRENCY.USD);
    const isConnectedVerifiedBankAccountData = isNonUSDSetup ? achData?.state === CONST.BANK_ACCOUNT.STATE.OPEN : achData?.currentStep === CONST.BANK_ACCOUNT.STEP.ENABLE;

    useEffect(() => {
        const isChangingBankAccountInstance = isChangingBankAccountRef.current;
        return () => {
            if (!isChangingBankAccountInstance) {
                // The draft is always safe to clear. Nothing in the validation step branches on it, while the
                // micro-deposit inputs save into it, so leaving it behind prefills the previous attempt's amounts
                // against the limited number of validation attempts the next time the account is opened.
                clearReimbursementAccountDraft();
                if (!pendingValidationRedirectRef.current.hasTag(KEEPS_ACCOUNT_DATA_TAG)) {
                    clearReimbursementAccount();
                }
            }
            cancelChangingToNewBankAccount();
            getPaymentMethods();
        };
    }, []);

    useEffect(() => {
        if (!policyCurrency || isNonUSDSetup === (policyCurrency !== CONST.CURRENCY.USD)) {
            return;
        }
        setIsNonUSDSetup(policyCurrency !== CONST.CURRENCY.USD);
    }, [policyCurrency, isNonUSDSetup]);

    useEffect(() => {
        const achContractValues = lodashPick(reimbursementAccountDraft, ['isAuthorizedToUseBankAccount', 'certifyTrueInformation', 'acceptTermsAndConditions']);

        if (!isEmptyObject(achContractValues)) {
            achContractValuesRef.current = achContractValues;
        }
    }, [reimbursementAccountDraft]);

    useEffect(() => {
        if (reimbursementAccountDraft || isEmptyObject(achContractValuesRef.current) || currentStep !== CONST.BANK_ACCOUNT.STEP.ACH_CONTRACT) {
            return;
        }

        updateReimbursementAccountDraft(achContractValuesRef.current);
    }, [reimbursementAccountDraft, currentStep]);

    function getBankAccountFields(fieldNames: InputID[]): Partial<ACHDataReimbursementAccount> {
        return {
            ...lodashPick(reimbursementAccount?.achData, ...fieldNames),
        };
    }

    const shouldShowContinueSetupButtonValue = hasInProgressVBBA(achData, isNonUSDWorkspace, policyIDParam);

    const isDefaultReimbursementAccountData = deepEqual(reimbursementAccount, CONST.REIMBURSEMENT_ACCOUNT.DEFAULT_DATA);
    const hasLoadedData = reimbursementAccount?.achData && !isDefaultReimbursementAccountData && !reimbursementAccount?.isLoading;
    const canManageWorkspaceBankAccount = canMemberWrite(policy, currentUserLogin, CONST.POLICY.POLICY_FEATURE.WORKFLOWS_PAYMENTS);
    // The redirect fires from an effect, and effects run even on the renders that return FullPageNotFoundView below.
    // The validation step has no authorization guard of its own, so a stale cached account for a workspace the user
    // can no longer manage would carry them past the not-authorized screen and into the micro-deposit form. Redirect
    // only once the policy has loaded and positively grants access. When it has not, this page falls through to its
    // normal render, which shows the loader while the policy is loading and the not-found screen once it is not.
    const isAuthorizedToValidateBankAccount = !isLoadingPolicy && !isEmptyObject(policy) && canManageWorkspaceBankAccount && !isPendingDeletePolicy(policy);
    // For a pending USD account this page only redirects, so it must never paint the entry point. Derived during render
    // because effects run after paint. Not latched on the redirect machine: it moves on mid-transition and the next
    // render would fall through to the entry point. policyID must match because REIMBURSEMENT_ACCOUNT is persisted, so on a
    // cold load achData can still describe another policy's account. Entry points that pass no policyID at all (the
    // Wallet ones) are excluded outright, since there is nothing to match them against.
    const shouldRedirectToPendingValidation =
        policyCurrency === CONST.CURRENCY.USD &&
        achData?.state === CONST.BANK_ACCOUNT.STATE.PENDING &&
        !!hasLoadedData &&
        !isChangingBankAccount &&
        !!policyIDParam &&
        achData?.policyID === policyIDParam &&
        isAuthorizedToValidateBankAccount;

    const sendToPendingValidationRedirect = (event: EventFrom<typeof pendingValidationRedirectMachine>) => {
        const [snapshot, actions] = transition(pendingValidationRedirectMachine, pendingValidationRedirectRef.current, event);
        pendingValidationRedirectRef.current = snapshot;
        for (const action of actions) {
            if (action.type === PENDING_VALIDATION_REDIRECT_ACTION.REDIRECT_TO_VALIDATION) {
                // A push, not a forceReplace: replacing unmounts this page and its cleanup wipes REIMBURSEMENT_ACCOUNT,
                // leaving ConnectBankAccount with state 'SETUP' and a blank RHP.
                Navigation.navigate(ROUTES.BANK_ACCOUNT_USD_SETUP.getRoute({policyID: policyIDParam, page: CONST.BANK_ACCOUNT.PAGE_NAMES.VALIDATION, backTo}));
            } else if (action.type === PENDING_VALIDATION_REDIRECT_ACTION.LEAVE_FLOW && backTo) {
                Navigation.goBack(backTo);
            } else if (action.type === PENDING_VALIDATION_REDIRECT_ACTION.LEAVE_FLOW) {
                Navigation.dismissModal();
            }
        }
    };
    /**
     When this page is first opened, `reimbursementAccount` prop might not yet be fully loaded from Onyx.
     Calculating `shouldShowContinueSetupButton` immediately on initial render doesn't make sense as
     it relies on incomplete data. Thus, we should wait to calculate it until we have received
     the full `reimbursementAccount` data from the server. This logic is handled within the useEffect hook,
     which acts similarly to `componentDidUpdate` when the `reimbursementAccount` dependency changes.
     */
    const [hasACHDataBeenLoaded, setHasACHDataBeenLoaded] = useState(hasLoadedData);
    const [shouldShowContinueSetupButton, setShouldShowContinueSetupButton] = useState<boolean>(shouldShowContinueSetupButtonValue);
    const [shouldShowConnectedVerifiedBankAccount, setShouldShowConnectedVerifiedBankAccount] = useState<boolean>(false);

    /**
     * Retrieve verified business bank account currently being set up.
     */
    function fetchData(preserveCurrentStep = false) {
        if ((!policyIDParam && !bankAccountIDParam) || (policyIDParam !== undefined && backTo === ROUTES.BANK_ACCOUNT_CONNECT_EXISTING_BUSINESS_BANK_ACCOUNT.getRoute(policyIDParam))) {
            return;
        }
        if (bankAccountIDParam) {
            // we don't need to send the stepToOpen and subStep when opening by bankAccountID - the step is returned from the backend
            openReimbursementAccountPage({bankAccountID: Number(bankAccountIDParam)});
            return;
        }
        // We can specify a step to navigate to by using route params when the component mounts.
        // We want to use the same stepToOpen variable when the network state changes because we can be redirected to a different step when the account refreshes.
        const stepToOpen = preserveCurrentStep ? currentStep : getStepToOpenFromRouteParams(route, hasConfirmedUSDCurrency);
        const subStep = isPreviousPolicy ? (achData?.subStep ?? '') : '';

        let localCurrentStep: ReimbursementAccountStep = '';
        if (preserveCurrentStep) {
            localCurrentStep = currentStep;
        } else if (isPreviousPolicy) {
            localCurrentStep = achData?.currentStep ?? '';
        }

        // When preserving the current step (e.g., coming back online), also preserve the draft
        // to prevent losing user selections made while offline
        openReimbursementAccountPage({stepToOpen, subStep, localCurrentStep, policyID: policyIDParam, shouldPreserveDraft: preserveCurrentStep});
    }

    // When the workspace's bank account is switched, the switch request and the refetch that reloads
    // the new account run one after another. We must not refetch until the switch has committed to escape race condition.
    useEffect(() => {
        const isSettingFinished = !isLoadingWorkspaceReimbursement && prevIsLoadingWorkspaceReimbursement;
        if (!isSettingFinished) {
            return;
        }
        fetchData();
        // Run only on the loading transition, not when fetchData's identity changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoadingWorkspaceReimbursement, prevIsLoadingWorkspaceReimbursement]);

    const isBackupMatchRoute =
        (bankAccountIDParam !== undefined && reimbursementAccountBackup?.achData?.bankAccountID === Number(bankAccountIDParam)) ||
        (!!policyIDParam && reimbursementAccountBackup?.achData?.policyID === policyIDParam);

    // A "change bank account" flow clears the shared reimbursement account. When focus returns to this (non-changing)
    // screen, restore the original account if the user backed out instead of showing the abandoned setup.
    useEffect(() => {
        if (isChangingBankAccount || !isFocused) {
            return;
        }

        if (reimbursementAccountBackup && !isBackupMatchRoute) {
            clearReimbursementAccountBackup();
        }
        const hasRestorableBackup = !!reimbursementAccountBackup && isBackupMatchRoute;

        // A fully connected account is shown (original untouched, or the replacement finished) — drop the stale backup.
        if (isConnectedVerifiedBankAccountData) {
            hasShownConnectedBankAccountRef.current = true;
            if (hasRestorableBackup) {
                clearReimbursementAccountBackup();
            }
            return;
        }

        // A backup means the user backed out of a change flow; restore the original account (preferred over any
        // in-progress replacement) instantly, without a refetch.
        if (hasRestorableBackup) {
            restoreReimbursementAccountBackup(reimbursementAccountBackup);
            return;
        }
        if (!shouldShowContinueSetupButtonValue && hasShownConnectedBankAccountRef.current) {
            fetchData();
        }
        // fetchData is intentionally omitted; this must react to the shared data being clobbered, not to fetchData's identity.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFocused, isChangingBankAccount, isConnectedVerifiedBankAccountData, shouldShowContinueSetupButtonValue, reimbursementAccountBackup, isBackupMatchRoute]);

    useEffect(() => {
        // Consume this route intent only once so the response changing isPreviousPolicy does not trigger another request.
        const shouldOpenNewBankAccount = route.params?.stepToOpen === REIMBURSEMENT_ACCOUNT_ROUTE_NAMES.NEW && !hasRequestedNewBankAccountRef.current;
        if (!shouldOpenNewBankAccount && isPreviousPolicy && !!reimbursementAccount) {
            return;
        }

        // Skip while switching the workspace's bank account: the dedicated effect above fetches once the switch
        // finishes, so fetching here would race it and could load the old account.
        if (isChangingToNewBankAccount || isLoadingWorkspaceReimbursement) {
            return;
        }

        if (policyIDParam) {
            setReimbursementAccountLoading(true);
            clearReimbursementAccountDraft();
        }

        // If the step to open is empty, we want to clear the sub step, so the connect option view is shown to the user
        const isStepToOpenEmpty = getStepToOpenFromRouteParams(route, hasConfirmedUSDCurrency) === '';
        if (isStepToOpenEmpty) {
            setBankAccountSubStep(null);
            setPlaidEvent(null);
        }
        if (shouldOpenNewBankAccount) {
            hasRequestedNewBankAccountRef.current = true;
        }
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPreviousPolicy]); // Only re-run this effect when isPreviousPolicy changes, which happens once when the component first loads

    useEffect(() => {
        if (policyIDParam && !isPreviousPolicy) {
            return;
        }

        setShouldShowConnectedVerifiedBankAccount(isNonUSDSetup ? achData?.state === CONST.BANK_ACCOUNT.STATE.OPEN : achData?.currentStep === CONST.BANK_ACCOUNT.STEP.ENABLE);
        setShouldShowContinueSetupButton(shouldShowContinueSetupButtonValue);
    }, [policyIDParam, achData?.currentStep, shouldShowContinueSetupButtonValue, isNonUSDSetup, isPreviousPolicy, achData?.state, policyCurrency]);

    // Sends a pending USD account straight to the validation step, from this page so that openReimbursementAccountPage
    // has already loaded the achData that ConnectBankAccount reads.
    useEffect(() => {
        sendToPendingValidationRedirect({type: 'UPDATE', shouldRedirect: shouldRedirectToPendingValidation, isFocused});
    }, [shouldRedirectToPendingValidation, isFocused, sendToPendingValidationRedirect]);

    useEffect(() => {
        if (!prevPolicyCurrency || policyCurrency === prevPolicyCurrency) {
            return;
        }

        setBankAccountSubStep(null);
    }, [policyCurrency, prevPolicyCurrency]);

    useEffect(
        () => {
            const isOnPlaidBankAccountStep = currentStep === CONST.BANK_ACCOUNT.STEP.BANK_ACCOUNT && achData?.subStep === CONST.BANK_ACCOUNT.SETUP_TYPE.PLAID;

            // Reset the "stale errors cleared" guard whenever we leave the Plaid bank account step, so the next
            // fresh entry into the Plaid step clears any old errors exactly once.
            if (!isOnPlaidBankAccountStep) {
                hasClearedStalePlaidErrorsRef.current = false;
            }

            // Check for network change from offline to online
            if (prevIsOffline && !isOffline && prevReimbursementAccount && prevReimbursementAccount.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE) {
                fetchData(true);
            }

            if (!hasACHDataBeenLoaded) {
                if (hasLoadedData) {
                    setHasACHDataBeenLoaded(true);
                }
                return;
            }

            if (prevReimbursementAccount?.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE && reimbursementAccount?.pendingAction !== prevReimbursementAccount.pendingAction) {
                setShouldShowContinueSetupButton(hasInProgressUSDVBBA(achData));
            }

            if (shouldShowContinueSetupButton) {
                return;
            }

            const currentStepRouteParam = getStepToOpenFromRouteParams(route, hasConfirmedUSDCurrency);
            if (currentStepRouteParam === currentStep) {
                // If the user is connecting online with plaid, reset any bank account errors so we don't persist old data from a potential previous connection.
                // Guard with a ref so this only happens once per Plaid-step entry.
                if (isOnPlaidBankAccountStep && !hasClearedStalePlaidErrorsRef.current) {
                    hasClearedStalePlaidErrorsRef.current = true;
                    hideBankAccountErrors();
                }

                // The route is showing the correct step, no need to update the route param or clear errors.
                return;
            }

            // Update the data that is returned from back-end to draft value
            const draftStep = reimbursementAccount?.draftStep;
            if (draftStep) {
                updateReimbursementAccountDraft(getBankAccountFields(getFieldsForStep(draftStep)));
            }

            if (currentStepRouteParam !== '') {
                // When we click "Connect bank account", we load the page without the current step param, if there
                // was an error when we tried to disconnect or start over, we want the user to be able to see the error,
                // so we don't clear it. We only want to clear the errors if we are moving between steps.
                hideBankAccountErrors();
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            isOffline,
            reimbursementAccount?.draftStep,
            reimbursementAccount?.pendingAction,
            reimbursementAccount?.isLoading,
            hasACHDataBeenLoaded,
            shouldShowContinueSetupButton,
            currentStep,
            isNonUSDSetup,
        ],
    );

    const continueUSDVBBASetup = () => {
        // If user comes back to the flow we never want to allow him to go through plaid again
        // so we're always showing manual setup with locked numbers he can not change
        setBankAccountSubStep(CONST.BANK_ACCOUNT.SETUP_TYPE.MANUAL).then(() => {
            const stepToPageName: Record<string, string> = {
                [CONST.BANK_ACCOUNT.STEP.COUNTRY]: CONST.BANK_ACCOUNT.PAGE_NAMES.COUNTRY,
                [CONST.BANK_ACCOUNT.STEP.BANK_ACCOUNT]: CONST.BANK_ACCOUNT.PAGE_NAMES.BANK_ACCOUNT,
                [CONST.BANK_ACCOUNT.STEP.REQUESTOR]: CONST.BANK_ACCOUNT.PAGE_NAMES.REQUESTOR,
                [CONST.BANK_ACCOUNT.STEP.COMPANY]: CONST.BANK_ACCOUNT.PAGE_NAMES.COMPANY,
                [CONST.BANK_ACCOUNT.STEP.BENEFICIAL_OWNERS]: CONST.BANK_ACCOUNT.PAGE_NAMES.BENEFICIAL_OWNERS,
                [CONST.BANK_ACCOUNT.STEP.ACH_CONTRACT]: CONST.BANK_ACCOUNT.PAGE_NAMES.ACH_CONTRACT,
                [CONST.BANK_ACCOUNT.STEP.KYB_DOCS]: CONST.BANK_ACCOUNT.PAGE_NAMES.KYB_DOCS,
                [CONST.BANK_ACCOUNT.STEP.VALIDATION]: CONST.BANK_ACCOUNT.PAGE_NAMES.VALIDATION,
            };
            const page = stepToPageName[currentStep] ?? CONST.BANK_ACCOUNT.PAGE_NAMES.COUNTRY;
            Navigation.navigate(ROUTES.BANK_ACCOUNT_USD_SETUP.getRoute({policyID: policyIDParam, page, backTo}));
        });
    };

    const continueNonUSDVBBASetup = () => {
        const {page: startPage, subPage: startSubPage} = getStartPageForContinueSetup(achData, nonUSDCountryDraftValue, policyCurrency, reimbursementAccountDraft);
        if (isComingFromExpensifyCard) {
            setDraftValues(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM, {isComingFromExpensifyCard});
        }
        Navigation.navigate(ROUTES.BANK_ACCOUNT_NON_USD_SETUP.getRoute({policyID: policyIDParam ?? '', page: startPage, subPage: startSubPage, backTo}));
    };

    const goBack = () => {
        const shouldShowOnfido = onfidoToken && !achData?.isOnfidoSetupComplete;

        switch (currentStep) {
            case CONST.BANK_ACCOUNT.STEP.COUNTRY:
                if (hasInProgressUSDVBBA(achData)) {
                    setShouldShowContinueSetupButton(true);
                }
                setBankAccountSubStep(null);
                break;
            case CONST.BANK_ACCOUNT.STEP.BANK_ACCOUNT:
                setPlaidEvent(null);
                goToWithdrawalAccountSetupStep(CONST.BANK_ACCOUNT.STEP.COUNTRY);
                break;
            case CONST.BANK_ACCOUNT.STEP.COMPANY:
                clearOnfidoToken();
                goToWithdrawalAccountSetupStep(CONST.BANK_ACCOUNT.STEP.REQUESTOR);
                break;

            case CONST.BANK_ACCOUNT.STEP.REQUESTOR:
                if (shouldShowOnfido) {
                    clearOnfidoToken();
                } else {
                    goToWithdrawalAccountSetupStep(CONST.BANK_ACCOUNT.STEP.BANK_ACCOUNT);
                }
                break;

            case CONST.BANK_ACCOUNT.STEP.BENEFICIAL_OWNERS:
                goToWithdrawalAccountSetupStep(CONST.BANK_ACCOUNT.STEP.COMPANY);
                break;

            case CONST.BANK_ACCOUNT.STEP.ACH_CONTRACT:
                goToWithdrawalAccountSetupStep(CONST.BANK_ACCOUNT.STEP.BENEFICIAL_OWNERS);
                break;

            case CONST.BANK_ACCOUNT.STEP.VALIDATION:
                if ([CONST.BANK_ACCOUNT.STATE.VERIFYING, CONST.BANK_ACCOUNT.STATE.SETUP].some((value) => value === achData?.state)) {
                    goToWithdrawalAccountSetupStep(CONST.BANK_ACCOUNT.STEP.ACH_CONTRACT);
                } else if (CONST.BANK_ACCOUNT.STATE.PENDING === achData?.state) {
                    Navigation.closeRHPFlow();
                } else {
                    Navigation.goBack();
                }
                break;

            default:
                Navigation.dismissModal();
        }
    };

    const isLoading =
        (isLoadingApp || (reimbursementAccount?.isLoading && !reimbursementAccount?.isCreateCorpayBankAccount)) &&
        (!plaidCurrentEvent || plaidCurrentEvent === CONST.BANK_ACCOUNT.PLAID.EVENTS_NAME.EXIT);

    const shouldShowOfflineLoader = !(hasLoadedData && isOffline && OFFLINE_ACCESSIBLE_STEPS.some((value) => value === currentStep));

    const shouldShowPolicyName = topmostFullScreenRoute?.name === NAVIGATORS.SETTINGS_SPLIT_NAVIGATOR;
    const policyNameToDisplay = shouldShowPolicyName ? policyName : '';

    // Matched the way fetchData opens the account. Like hasInProgressVBBA, an account without the route's ID counts as another one.
    const isOtherAccount = bankAccountIDParam ? achData?.bankAccountID !== Number(bankAccountIDParam) : !!policyIDParam && achData?.policyID !== policyIDParam;
    // hasLoadedData only proves the account differs from DEFAULT_DATA. Offline, the mount effect's setBankAccountSubStep(null) and the
    // failed OpenReimbursementAccountPage request also cause that, by leaving `{achData: {}, isLoading: false}` with nothing loaded.
    const hasAchDataForThisPage = !isEmptyObject(achData) && !deepEqual(achData, CONST.REIMBURSEMENT_ACCOUNT.DEFAULT_DATA.achData) && !isOtherAccount;

    if (isOffline && (!hasLoadedData || !hasAchDataForThisPage)) {
        return (
            <ScreenWrapper testID="ReimbursementAccountPage">
                <HeaderWithBackButton
                    title={translate('bankAccount.addBankAccount')}
                    onBackButtonPress={() => Navigation.goBack(backTo)}
                />
                <FullPageOfflineBlockingView>{null}</FullPageOfflineBlockingView>
            </ScreenWrapper>
        );
    }

    if (isLoadingPolicy) {
        return <FullScreenLoadingIndicator onGoBack={() => Navigation.goBack(backTo)} />;
    }

    // Show loading indicator when page is first time being opened and props.reimbursementAccount yet to be loaded from the server
    // or when data is being loaded. Don't show the loading indicator if we're offline and restarted the bank account setup process
    if (
        (!!policyIDParam || !!bankAccountIDParam) &&
        !isChangingToNewBankAccount &&
        (!hasACHDataBeenLoaded || isLoading || isLoadingWorkspaceReimbursement || isSettingBA) &&
        shouldShowOfflineLoader
    ) {
        return <ReimbursementAccountLoadingIndicator onBackButtonPress={goBack} />;
    }

    if (!!policyIDParam && ((!isLoading && (isEmptyObject(policy) || !canManageWorkspaceBankAccount)) || isPendingDeletePolicy(policy))) {
        return (
            <ScreenWrapper testID="ReimbursementAccountPage">
                <FullPageNotFoundView
                    shouldShow
                    onBackButtonPress={goBackFromInvalidPolicy}
                    onLinkPress={goBackFromInvalidPolicy}
                    subtitleKey={isEmptyObject(policy) || isPendingDeletePolicy(policy) ? undefined : 'workspace.common.notAuthorized'}
                />
            </ScreenWrapper>
        );
    }

    let errorText;
    const userHasPhonePrimaryEmail = Str.endsWith(session?.email ?? '', CONST.SMS.DOMAIN);
    const throttledDate = reimbursementAccount?.throttledDate ?? '';

    if (userHasPhonePrimaryEmail) {
        errorText = <RenderHTML html={translate('bankAccount.hasPhoneLoginError', contactMethodRoute)} />;
    } else if (throttledDate) {
        errorText = <Text>{translate('bankAccount.hasBeenThrottledError')}</Text>;
    } else if (hasUnsupportedCurrency) {
        errorText = <RenderHTML html={translate('bankAccount.hasCurrencyError', workspaceRoute)} />;
    }

    if (errorText) {
        return (
            <ScreenWrapper testID="ReimbursementAccountPage">
                <HeaderWithBackButton
                    title={translate('bankAccount.addBankAccount')}
                    subtitle={policyNameToDisplay}
                    onBackButtonPress={() => Navigation.goBack(backTo)}
                />
                <View style={[styles.m5, styles.mv3, styles.flex1]}>{errorText}</View>
            </ScreenWrapper>
        );
    }

    // While this instance is starting a fresh setup (change bank account), show the setup entry instead of the connected
    // account, even though the shared data still describes the currently connected account.
    if (shouldShowConnectedVerifiedBankAccount && isConnectedVerifiedBankAccountData && !isChangingBankAccount) {
        if (topmostFullScreenRoute?.name === NAVIGATORS.SETTINGS_SPLIT_NAVIGATOR) {
            return (
                <ScreenWrapper testID="ReimbursementAccountPage">
                    <HeaderWithBackButton
                        title={translate('bankAccount.addBankAccount')}
                        onBackButtonPress={() => Navigation.dismissModal()}
                    />
                    <ConfirmationPageDefault
                        heading={translate('bankAccount.bbaAdded')}
                        description={translate('bankAccount.bbaAddedDescription')}
                        headingStyle={styles.mh5}
                        buttonText={translate('common.confirm')}
                        buttonSentryLabel={CONST.SENTRY_LABEL.REIMBURSEMENT_ACCOUNT.BANK_ACCOUNT_ADDED_CONFIRM}
                        onButtonPress={() => Navigation.dismissModal()}
                    />
                </ScreenWrapper>
            );
        }
        return (
            <ConnectedVerifiedBankAccount
                reimbursementAccount={reimbursementAccount}
                setShouldShowConnectedVerifiedBankAccount={setShouldShowConnectedVerifiedBankAccount}
                onBackButtonPress={goBack}
                isNonUSDWorkspace={isNonUSDSetup}
            />
        );
    }

    // Keep the loader on screen for a pending USD account so the "Continue setup / Start over" entry point is never
    // painted on the way to the validation step. The back button leaves the flow rather than using goBack, which
    // switches on achData.currentStep and performs no navigation at all for several of its cases.
    if (shouldRedirectToPendingValidation) {
        return <ReimbursementAccountLoadingIndicator onBackButtonPress={() => sendToPendingValidationRedirect({type: 'LEAVE'})} />;
    }

    // Once fresh data has loaded, trust the live value to avoid a one-frame flash from the effect-synced state lagging achData.
    // On a "change bank account" instance never show "continue setup", since the shared data still describes the account being replaced.
    const shouldShowContinueSetupButtonToDisplay = !isChangingBankAccount && (hasLoadedData ? shouldShowContinueSetupButtonValue : shouldShowContinueSetupButton);

    return (
        <VerifiedBankAccountFlowEntryPoint
            setShouldShowContinueSetupButton={setShouldShowContinueSetupButton}
            reimbursementAccount={reimbursementAccount}
            onContinuePress={isNonUSDSetup ? continueNonUSDVBBASetup : continueUSDVBBASetup}
            policyName={policyName}
            backTo={backTo}
            shouldShowContinueSetupButton={shouldShowContinueSetupButtonToDisplay}
            isNonUSDWorkspace={isNonUSDSetup}
            policyID={policyIDParam}
            isComingFromExpensifyCard={isComingFromExpensifyCard}
            isChangingBankAccount={isChangingBankAccount}
        />
    );
}

export default withPolicy(ReimbursementAccountPage);
