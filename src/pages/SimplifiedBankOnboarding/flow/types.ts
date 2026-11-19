/**
 * Types of the declarative flow definitions. A flow is an ordered list of steps with pure predicates, and every navigation
 * decision (next, previous, resume, header counter, URL guard) is computed from it, so no other file knows the step order.
 */
import type {OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';
import type {ACHData} from '@pages/SimplifiedBankOnboarding/types/onyx';

type FlowContext = {
    /** The currency of the workspace, which adds or removes steps */
    currency: string | undefined;

    /** Server data of the account. Undefined when nothing is loaded for the route. */
    server: ACHData | undefined;

    /** Unsaved edits and the facts that only the device knows, such as the picked setup type or an uploaded file */
    draft: Partial<OnboardingForm> | undefined;
};

/** How the user arrives at a step: from the previous one, back from the next one, or by resuming a setup */
type FlowDirection = 'forward' | 'backward' | 'resume';

type StepDefinition<TPageName extends string = string> = {
    /** The `:page` segment of the URL, which is the only name of the step */
    id: TPageName;

    /** Position in the step counter of the header. Several steps may share one, and a step without one shows no counter. */
    headerPosition?: number;

    /** A step that is not applicable is skipped by every navigation function. Steps without the predicate always apply. */
    isApplicable?: (context: FlowContext) => boolean;

    /** True when the account is past this step, which is what the resume position and the URL guard rely on */
    isComplete: (context: FlowContext) => boolean;

    /** The sub page to open on arrival. Undefined lets the step pick the sub page from the values that it has. */
    getEntrySubPage?: (context: FlowContext, direction: FlowDirection) => string | undefined;

    /** True when the back button of this step must leave the flow instead of opening the previous step */
    leavesFlowOnBack?: (context: FlowContext) => boolean;
};

/** A flow always has a first step, which is what an unknown page of the URL falls back to */
type FlowDefinition<TPageName extends string = string> = readonly [StepDefinition<TPageName>, ...Array<StepDefinition<TPageName>>];

type FlowPosition<TPageName extends string = string> = {
    page: TPageName;
    subPage?: string;
};

export type {FlowContext, FlowDefinition, FlowDirection, FlowPosition, StepDefinition};
