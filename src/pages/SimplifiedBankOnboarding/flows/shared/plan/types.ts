/**
 * The plan types of the engine with the names of the bank onboarding flows. The engine takes any names, and the flows
 * use the closed unions of the constants, so a plan builder cannot point at a step or a page that does not exist. A flow
 * configuration imports its plan types from here.
 */
import type {PageID, StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type * as Core from '@pages/SimplifiedBankOnboarding/core';

type OnboardingVocabulary = {
    stepID: StepID;
    pageID: PageID;
};

type FlowPlan = Core.FlowPlan<OnboardingVocabulary>;
type StepConfig = Core.StepConfig<OnboardingVocabulary>;
type PageConfig = Core.PageConfig<OnboardingVocabulary>;
type FormPageConfig = Core.FormPageConfig<OnboardingVocabulary>;
type FormPageDefinition = Core.FormPageDefinition<OnboardingVocabulary>;
type ConfirmationPageConfig = Core.ConfirmationPageConfig<OnboardingVocabulary>;
type ListPageConfig = Core.ListPageConfig<OnboardingVocabulary>;
type PageTransition = Core.PageTransition<OnboardingVocabulary>;
type FlowPosition = Core.FlowPosition<OnboardingVocabulary>;
type CustomPageProps = Core.CustomPageProps<OnboardingVocabulary>;
type FlowDescriptor<TData> = Core.FlowDescriptor<TData, OnboardingVocabulary>;

export type {
    ConfirmationPageConfig,
    CustomPageProps,
    FlowDescriptor,
    FlowPlan,
    FlowPosition,
    FormPageConfig,
    FormPageDefinition,
    ListPageConfig,
    OnboardingVocabulary,
    PageConfig,
    PageTransition,
    StepConfig,
};
