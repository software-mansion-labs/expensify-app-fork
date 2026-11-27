import type {StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import {getAdjacentSteps, getStepCounter, resolveFlowStep} from '@pages/SimplifiedBankOnboarding/core/flow/flowSteps';
import type {FlowStepConfig, FlowStepCounter} from '@pages/SimplifiedBankOnboarding/core/flow/flowSteps';

type TestStep = {id: StepID; isComplete?: boolean; skip?: boolean; counter?: FlowStepCounter};

function buildSteps(steps: TestStep[]): FlowStepConfig[] {
    return steps.map(({id, isComplete = false, skip, counter}) => ({id, isComplete, skip, counter, content: null}));
}

describe('flowSteps', () => {
    it('throws in development for a last step that is skipped', () => {
        // Given a flow whose last step is skipped
        const steps = buildSteps([{id: 'country'}, {id: 'bank-account', skip: true}]);

        // When the flow resolves the step to show
        // Then it throws, because Next of the step before it would open a URL that shows no step after it
        expect(() => resolveFlowStep(steps, undefined)).toThrow('the last step cannot be skipped');
    });

    it('opens the next shown step for a skipped step in the URL', () => {
        // Given a flow whose second step is skipped
        const steps = buildSteps([{id: 'country'}, {id: 'bank-account', skip: true}, {id: 'personal-info'}]);

        // When the URL names the skipped step
        const shownStep = resolveFlowStep(steps, 'bank-account');

        // Then the next step that is not skipped opens instead
        expect(shownStep?.id).toBe('personal-info');
    });

    it('opens a complete step that the URL names', () => {
        // Given a flow whose first step is complete
        const steps = buildSteps([{id: 'country', isComplete: true}, {id: 'bank-account'}]);

        // When the URL names the complete step
        const shownStep = resolveFlowStep(steps, 'country');

        // Then it opens, because completion only picks the step of a URL without one and locks nothing
        expect(shownStep?.id).toBe('country');
    });

    it('opens the first step that is neither skipped nor complete for a URL without a step', () => {
        // Given a flow with two complete steps, a skipped step that is not complete, and two open steps
        const steps = buildSteps([
            {id: 'country', isComplete: true},
            {id: 'bank-account', isComplete: true},
            {id: 'personal-info', skip: true},
            {id: 'business-info'},
            {id: 'beneficial-owners'},
        ]);

        // When the URL names no step, and when it names a step that the flow does not have
        const resumedStep = resolveFlowStep(steps, undefined);
        const stepOfUnknownURL = resolveFlowStep(steps, 'finish');

        // Then both open the first step that the user still has to do and can see
        expect(resumedStep?.id).toBe('business-info');
        expect(stepOfUnknownURL?.id).toBe('business-info');
    });

    it('opens the first step of a new setup and the last step of a finished one', () => {
        // Given a flow where no step is complete, and one where every step is
        const newSetup = buildSteps([{id: 'country'}, {id: 'bank-account'}]);
        const finishedSetup = buildSteps([
            {id: 'country', isComplete: true},
            {id: 'bank-account', isComplete: true},
        ]);

        // When the URL names no step
        // Then the new setup starts at the first step and the finished one shows its last step
        expect(resolveFlowStep(newSetup, undefined)?.id).toBe('country');
        expect(resolveFlowStep(finishedSetup, undefined)?.id).toBe('bank-account');
    });

    it('passes over skipped steps for the previous step and names the next step of the list', () => {
        // Given a flow where the steps around the middle one are skipped
        const steps = buildSteps([{id: 'country'}, {id: 'bank-account', skip: true}, {id: 'personal-info'}, {id: 'business-info', skip: true}, {id: 'beneficial-owners'}]);

        // When the middle step asks for the steps around it
        const adjacentSteps = getAdjacentSteps(steps, 'personal-info');

        // Then Back jumps over the skipped step, and Next names the skipped step, which the flow resolves when it opens
        expect(adjacentSteps).toEqual({previousStep: 'country', nextStep: 'business-info'});
    });

    it('names no next step for the last step', () => {
        // Given a flow of two steps
        const steps = buildSteps([{id: 'country'}, {id: 'bank-account'}]);

        // When the last step asks for the steps around it
        const adjacentSteps = getAdjacentSteps(steps, 'bank-account');

        // Then it has no next step, so its Next leaves the flow
        expect(adjacentSteps).toEqual({previousStep: 'country', nextStep: undefined});
    });

    it('counts only own steps that are not skipped', () => {
        // Given a flow with a shared counter, a step without a counter and a skipped step
        const steps = buildSteps([
            {id: 'country'},
            {id: 'bank-account'},
            {id: 'personal-info', counter: 'shared'},
            {id: 'verify-identity', counter: 'none'},
            {id: 'business-info', skip: true},
            {id: 'beneficial-owners'},
        ]);

        // When the steps ask for their counters
        const bankAccountCounter = getStepCounter(steps, 'bank-account');
        const sharedCounter = getStepCounter(steps, 'personal-info');
        const hiddenCounter = getStepCounter(steps, 'verify-identity');
        const lastCounter = getStepCounter(steps, 'beneficial-owners');

        // Then the labels count the three own steps, the shared step shows the number before it and the 'none' step shows nothing
        expect(bankAccountCounter).toEqual({index: 1, names: ['1', '2', '3']});
        expect(sharedCounter).toEqual({index: 1, names: ['1', '2', '3']});
        expect(hiddenCounter).toBeUndefined();
        expect(lastCounter).toEqual({index: 2, names: ['1', '2', '3']});
    });
});
