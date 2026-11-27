/**
 * The values that the flow shell gives every component inside it: which flow runs for which bank account, the form of
 * the flow, and its exits. Requests read the bank account scope and the form from here. An internal part, the position
 * of the step in the flow, is for the step shell only and is not exported from `core/index.ts`.
 */
import type {OnboardingDraft, OnboardingFormID} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {PageID, StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {ACHData} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import getBankAccountParams from '@pages/SimplifiedBankOnboarding/core/requests/bankAccountParams';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import CONST from '@src/CONST';
import type {Route} from '@src/ROUTES';

import type {OnyxEntry} from 'react-native-onyx';

import {createContext, useContext} from 'react';

/** Which flow runs and for which bank account. Every route the flow builds keeps these values. */
type FlowTarget =
    | {kind: 'usd' | 'nonUSD'; policyID: string | undefined; backTo: Route | undefined}
    | {kind: 'enterSignerInfo'; policyID: string | undefined; bankAccountID: number | undefined};

type OnboardingFlowControls = {
    target: FlowTarget;

    /** policyID of the route, and bankAccountID of the account (or of the route for the invited director) */
    bankAccount: BankAccountParams;
    formID: OnboardingFormID;

    /** Merges values into the draft of the flow's form and resolves when Onyx holds them */
    saveDraft: (values: OnboardingDraft) => Promise<void>;

    /** Back to the screen under the flow (the entry page): Navigation.goBack(). Used after the last step and from the first. */
    returnToEntry: () => void;

    /** Leaves the whole flow: goBack(backTo) when there is a backTo, else dismissModal. The invited director goes back. */
    leaveFlow: () => void;

    /**
     * Opens another step of this flow, at `page` or at its start page. Only for a jump that is not Next or Back (the
     * "Update details" button of the USD review card opens personal info at its first page, named explicitly).
     */
    openStep: (step: StepID, page?: PageID) => void;
};

/** The data half of the controls. A provider value holds either data or functions (rule context-provider-split-values). */
type OnboardingFlowState = Pick<OnboardingFlowControls, 'target' | 'bankAccount' | 'formID'>;
type OnboardingFlowActions = Omit<OnboardingFlowControls, keyof OnboardingFlowState>;

/** Internal: the position of the shown step in the flow, for the step shell */
type FlowStepPosition = {
    step: StepID;

    /** The nearest step before this one that is not skipped */
    previousStep: StepID | undefined;

    /** The next step of the list. The flow resolves it when it opens, so it may be skipped now. */
    nextStep: StepID | undefined;

    /** The counter of the header, undefined when the step shows none */
    counterIndex: number | undefined;
    counterNames: string[] | undefined;

    /** The sub page that the URL names, undefined when it names none, an unknown one or one of another step */
    page: PageID | undefined;
    isEditing: boolean;

    /** The page that opened edit mode, which Next and Back of the edited page return to */
    editReturnPage?: PageID;

    /**
     * This step, when the URL names no step, an unknown one or a skipped one. The step shell writes it into the URL in
     * the same write as its start page.
     */
    stepToWrite?: StepID;
};

const OnboardingFlowStateContext = createContext<OnboardingFlowState | undefined>(undefined);
const OnboardingFlowActionsContext = createContext<OnboardingFlowActions | undefined>(undefined);
const FlowStepPositionContext = createContext<FlowStepPosition | undefined>(undefined);

/** For any component inside OnboardingFlow */
function useOnboardingFlow(): OnboardingFlowControls {
    const state = useContext(OnboardingFlowStateContext);
    const actions = useContext(OnboardingFlowActionsContext);
    if (!state || !actions) {
        throw new Error('useOnboardingFlow works only inside OnboardingFlow');
    }
    return {...state, ...actions};
}

/** Internal: for the step shell inside OnboardingFlow */
function useFlowStepPosition(): FlowStepPosition {
    const position = useContext(FlowStepPositionContext);
    if (!position) {
        throw new Error('useFlowStepPosition works only inside OnboardingFlow');
    }
    return position;
}

/**
 * The bank account of a flow: the route's policyID and the account's bankAccountID. The invited director names the bank
 * account in the route, because the account key may hold the account of another user's setup.
 */
function getFlowBankAccount(target: FlowTarget, achData: OnyxEntry<ACHData>): BankAccountParams {
    if (target.kind === 'enterSignerInfo') {
        return {policyID: target.policyID, bankAccountID: target.bankAccountID ?? CONST.DEFAULT_NUMBER_ID};
    }
    return getBankAccountParams(target.policyID, achData);
}

export {FlowStepPositionContext, getFlowBankAccount, OnboardingFlowActionsContext, OnboardingFlowStateContext, useFlowStepPosition, useOnboardingFlow};
export type {FlowStepPosition, FlowTarget, OnboardingFlowActions, OnboardingFlowControls, OnboardingFlowState};
