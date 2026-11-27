/**
 * The plan types of the engine with the names of the bank onboarding flows. The engine takes any names, and the flows
 * use the closed unions of the constants, so a plan builder cannot point at a step or a page that does not exist. A flow
 * configuration imports its plan types from here.
 */
import type {PageID, StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type * as Core from '@pages/SimplifiedBankOnboarding/core';

/**
 * The pages that are not forms. Each one is a screen in the `customSteps/` of its flow, picked by name, and a page that
 * sends a request itself gets it from the plan with the type of the input that the page passes to it.
 */
type CustomPage =
    | {
          component: 'plaid';

          /** Exchanges the public token that the Plaid widget returns after the bank login for the list of accounts */
          request: Core.PlannedRequest<string>;
      }
    | {component: 'onfido'}
    | {
          component: 'hangTight';

          /** Reminds the invited directors to fill in their details */
          request: Core.PlannedRequest;
      }
    | {
          component: 'validation';

          /** Sends the amounts of the test deposits */
          request: Core.PlannedRequest<string[]>;
      }
    | {component: 'finish'};

type OnboardingVocabulary = {
    stepID: StepID;
    pageID: PageID;
    customPage: CustomPage;
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
type CustomStepProps = Core.CustomStepProps<OnboardingVocabulary>;
type FlowDescriptor<TData> = Core.FlowDescriptor<TData, OnboardingVocabulary>;

export type {
    ConfirmationPageConfig,
    CustomPage,
    CustomStepProps,
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
