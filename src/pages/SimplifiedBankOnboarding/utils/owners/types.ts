/**
 * The result of one answer in an owner loop. The step merges the draft values first, then opens the next sub page or
 * sends the owners. Both loops return it from pure functions, so the transitions are tested as a table.
 */
import type {OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';

type OwnerLoopNext<TSubPage extends string> = {subPage: TSubPage} | {submitOwnerKeys: string[]};

type OwnerLoopTransition<TSubPage extends string> = {
    /** The answers and the loop state that the step merges into the draft */
    draftValues: Partial<OnboardingForm>;
    next: OwnerLoopNext<TSubPage>;
};

export type {OwnerLoopNext, OwnerLoopTransition};
