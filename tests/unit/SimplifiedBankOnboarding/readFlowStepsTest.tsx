import type {StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import FlowStep from '@pages/SimplifiedBankOnboarding/core/flow/FlowStep';
import type {FlowStepCounter} from '@pages/SimplifiedBankOnboarding/core/flow/FlowStep';
import {getAdjacentSteps, getStepCounter, readFlowSteps, resolveFlowStep} from '@pages/SimplifiedBankOnboarding/core/flow/readFlowSteps';

import React from 'react';

function StepContent() {
    return null;
}

type TestStep = {id: StepID; skip?: boolean; counter?: FlowStepCounter};

function buildSteps(steps: TestStep[]) {
    return readFlowSteps(
        steps.map(({id, skip, counter}) => (
            <FlowStep
                key={id}
                id={id}
                component={StepContent}
                skip={skip}
                counter={counter}
            />
        )),
    );
}

describe('readFlowSteps', () => {
    it('keeps the order of the children through fragments and conditions', () => {
        // Given steps written in a fragment, behind a false condition and next to an element that is not a step
        const isBusinessStepShown = false;
        const steps = readFlowSteps(
            <>
                <FlowStep
                    id="country"
                    component={StepContent}
                />
                {isBusinessStepShown && (
                    <FlowStep
                        id="business-info"
                        component={StepContent}
                    />
                )}
                <StepContent />
                <>
                    <FlowStep
                        id="bank-account"
                        component={StepContent}
                    />
                    <FlowStep
                        id="personal-info"
                        component={StepContent}
                    />
                </>
            </>,
        );

        // When the flow reads its steps
        const stepIDs = steps.map((step) => step.id);

        // Then only the rendered FlowStep elements count, in the order they are written
        expect(stepIDs).toEqual(['country', 'bank-account', 'personal-info']);
    });

    it('opens the next shown step for a skipped step in the URL', () => {
        // Given a flow whose second step is skipped
        const steps = buildSteps([{id: 'country'}, {id: 'bank-account', skip: true}, {id: 'personal-info'}]);

        // When the URL names the skipped step
        const shownStep = resolveFlowStep(steps, 'bank-account', undefined);

        // Then the next step that is not skipped opens instead
        expect(shownStep?.id).toBe('personal-info');
    });

    it('opens the resume step for a URL without a step and the first step without a resume step', () => {
        // Given a flow of three steps
        const steps = buildSteps([{id: 'country'}, {id: 'bank-account'}, {id: 'personal-info'}]);

        // When the URL names no step, once with a resume step and once without one
        const resumedStep = resolveFlowStep(steps, undefined, 'bank-account');
        const firstStep = resolveFlowStep(steps, undefined, undefined);

        // Then the resume step opens, and the first step opens when the server names none
        expect(resumedStep?.id).toBe('bank-account');
        expect(firstStep?.id).toBe('country');
    });

    it('passes over skipped steps for the previous and the next step', () => {
        // Given a flow where the steps around the middle one are skipped
        const steps = buildSteps([{id: 'country'}, {id: 'bank-account', skip: true}, {id: 'personal-info'}, {id: 'business-info', skip: true}, {id: 'beneficial-owners'}]);

        // When the middle step asks for the steps around it
        const adjacentSteps = getAdjacentSteps(steps, 'personal-info');

        // Then Back and Next jump over the skipped steps
        expect(adjacentSteps).toEqual({previousStep: 'country', nextStep: 'beneficial-owners'});
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
