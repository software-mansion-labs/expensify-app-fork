/**
 * The frame of every step: InteractiveStepWrapper with the header, the title, the counter of the flow and Back, and the
 * switching between sub pages by the URL.
 *
 * What it hides: the start page rule ("arrived by Next" from the navigation state, `startAt`, `isAnswered`), the URL
 * write of the resolved page without a loader frame, Next and Back between pages and steps, history-aware Back to the
 * previous step, edit mode and its return to the confirmation, the clearing of the account error mirror on Back, the
 * progress save and the screen guard.
 */
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useOnyx from '@hooks/useOnyx';

import Navigation from '@libs/Navigation/Navigation';

import type {PageID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import {useFlowStepPosition, useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {findLatestRouteOfStep, getFlowRoute, getStepBelow} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import useScreenGuard from '@pages/SimplifiedBankOnboarding/core/flow/useScreenGuard';
import {clearAccountErrorMirror} from '@pages/SimplifiedBankOnboarding/core/requests/runRequest';
import type {OnboardingRequest, RequestOutcome} from '@pages/SimplifiedBankOnboarding/core/requests/types';
import {useProgressSaveRequest} from '@pages/SimplifiedBankOnboarding/core/requests/useOnboardingRequest';

import ONYXKEYS from '@src/ONYXKEYS';

import type {OnyxEntry} from 'react-native-onyx';

import {useNavigation, useNavigationState, useRoute} from '@react-navigation/native';
import React, {Fragment, useEffect} from 'react';

import type {PageNavigationActions, PageNavigationState} from './pageNavigation';
import type {PageTarget, SubPageEntry} from './readSubPages';

import {PageNavigationActionsContext, PageNavigationStateContext} from './pageNavigation';
import {getEditReturnPage, getNextPage, getPreviousPage, getStartPage, NEXT_STEP, readSubPages} from './readSubPages';

type OnboardingStepProps = {
    title: string;

    /** The test ID of the screen. Keep the value of today's step (see FEATURES.md). */
    wrapperID: string;

    /**
     * Sub page elements in order (blocks, SubPage, or arrays of them from render functions), or the content of a single
     * page step. A sub page that is not rendered does not exist for the step.
     */
    children: React.ReactNode;

    /**
     * The sub page that opens when the URL names none, or names one that is not rendered, on every way into the step.
     * Without it the first rendered sub page opens when the user arrived by Next from the previous step, and else the
     * first sub page whose `isAnswered` is not true (the last one when every sub page is answered).
     */
    startAt?: PageID;

    /** Sent after each sub page except the last, outside edit mode, without waiting and without showing its state */
    saveAfterEachPage?: OnboardingRequest;

    /**
     * Back from the first sub page, or from a single page step. Default: the previous step that is not skipped, and
     * returnToEntry on the first step of the flow.
     */
    onBackFromStart?: () => void;

    shouldEnableMaxHeight?: boolean;
    shouldEnablePickerAvoiding?: boolean;
};

function hasAccountErrors(account: OnyxEntry<OnboardingAccount>): boolean {
    return !!account?.errors && Object.keys(account.errors).length > 0;
}

function OnboardingStep({title, wrapperID, children, startAt, saveAfterEachPage, onBackFromStart, shouldEnableMaxHeight, shouldEnablePickerAvoiding}: OnboardingStepProps) {
    const {target, returnToEntry} = useOnboardingFlow();
    const {step, previousStep, nextStep, counterIndex, counterNames, page: urlPage, isEditing: isEditingInURL} = useFlowStepPosition();
    const route = useRoute();
    const navigation = useNavigation();
    const stepBelow = useNavigationState((state) => getStepBelow(state, route.key, target));
    const [doesAccountHoldErrors] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {selector: hasAccountErrors});
    const sendProgressSave = useProgressSaveRequest(saveAfterEachPage);

    const {pages, content} = readSubPages(children);
    const hasArrivedByNext = !!previousStep && stepBelow === previousStep;
    const currentPage = getStartPage(pages, {urlPage, startAt, hasArrivedByNext});
    const isEditing = isEditingInURL && !!currentPage && currentPage.name === urlPage;
    const pageToWrite = currentPage && currentPage.name !== urlPage ? currentPage.name : undefined;
    const navigateAfterOutcome = useScreenGuard(`${step}/${currentPage?.name ?? ''}/${isEditing ? 'edit' : ''}`);

    useEffect(() => {
        if (!pageToWrite) {
            return;
        }
        Navigation.setParams({subPage: pageToWrite}, route.key);
    }, [pageToWrite, route.key]);

    function openNextStep() {
        if (!nextStep) {
            returnToEntry();
            return;
        }
        Navigation.navigate(getFlowRoute(target, {step: nextStep}));
    }

    function returnToConfirmation(page: SubPageEntry) {
        Navigation.goBack(getFlowRoute(target, {step, page: getEditReturnPage(pages, page)?.name}));
    }

    function goBackToPreviousStep() {
        if (!previousStep) {
            returnToEntry();
            return;
        }
        const latestPosition = findLatestRouteOfStep(navigation.getState(), route.key, target, previousStep);
        Navigation.goBack(getFlowRoute(target, latestPosition ?? {step: previousStep}));
    }

    function goNext(pageTarget?: PageTarget) {
        if (!currentPage) {
            openNextStep();
            return;
        }
        if (isEditing) {
            returnToConfirmation(currentPage);
            return;
        }
        const destination = getNextPage(pages, currentPage, pageTarget);
        if (destination === NEXT_STEP) {
            openNextStep();
            return;
        }
        if (saveAfterEachPage) {
            sendProgressSave();
        }
        Navigation.navigate(getFlowRoute(target, {step, page: destination.name}));
    }

    function goNextAfter(outcome: Promise<RequestOutcome>, pageTarget?: PageTarget) {
        navigateAfterOutcome(outcome, () => goNext(pageTarget));
    }

    const goBack = () => {
        if (doesAccountHoldErrors) {
            clearAccountErrorMirror();
        }
        if (currentPage && isEditing) {
            returnToConfirmation(currentPage);
            return;
        }
        const previousPage = currentPage ? getPreviousPage(pages, currentPage) : undefined;
        if (previousPage) {
            Navigation.goBack(getFlowRoute(target, {step, page: previousPage.name}));
            return;
        }
        if (onBackFromStart) {
            onBackFromStart();
            return;
        }
        goBackToPreviousStep();
    };

    function openPage(name: PageID, options?: {isEditing?: boolean}) {
        Navigation.navigate(getFlowRoute(target, {step, page: name, isEditing: options?.isEditing}));
    }

    const navigationState: PageNavigationState = {page: currentPage?.name, isEditing};
    const navigationActions: PageNavigationActions = {goNext, goNextAfter, goBack, openPage};
    const pageContent = currentPage ? <Fragment key={currentPage.name}>{currentPage.element}</Fragment> : content;

    return (
        <InteractiveStepWrapper
            wrapperID={wrapperID}
            headerTitle={title}
            handleBackButtonPress={goBack}
            startStepIndex={counterIndex}
            stepNames={counterNames}
            shouldEnableMaxHeight={shouldEnableMaxHeight}
            shouldEnablePickerAvoiding={shouldEnablePickerAvoiding}
        >
            <PageNavigationStateContext.Provider value={navigationState}>
                <PageNavigationActionsContext.Provider value={navigationActions}>{pageContent}</PageNavigationActionsContext.Provider>
            </PageNavigationStateContext.Provider>
        </InteractiveStepWrapper>
    );
}

export default OnboardingStep;
export type {OnboardingStepProps};
