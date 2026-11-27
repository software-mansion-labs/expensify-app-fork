import getStepCounter from '@pages/SimplifiedBankOnboarding/core/plan/getStepCounter';
import type {StepConfig} from '@pages/SimplifiedBankOnboarding/core/plan/types';

type StepCounterKind = StepConfig['counter'];

function createStep(id: string, counter?: StepCounterKind): StepConfig {
    return {id, title: id, isComplete: false, pages: [], counter};
}

/** A flow like the USD one: an optional check that belongs to the step before it, and an optional step outside the counter */
function createSteps({hasCheck, hasDocuments}: {hasCheck: boolean; hasDocuments: boolean}): StepConfig[] {
    return [
        createStep('country'),
        createStep('personalInfo'),
        ...(hasCheck ? [createStep('identityCheck', 'shared')] : []),
        createStep('company'),
        ...(hasDocuments ? [createStep('documents', 'none')] : []),
        createStep('validation'),
    ];
}

describe('getStepCounter', () => {
    test.each([
        ['both optional steps are in the plan', true, true],
        ['the optional steps are left out', false, false],
    ])('numbers the steps that count on their own in plan order when %s', (_, hasCheck, hasDocuments) => {
        // Given a plan with or without the optional steps that take no number of their own
        const steps = createSteps({hasCheck, hasDocuments});

        // When the counters of the steps that count on their own are read
        const counters = ['country', 'personalInfo', 'company', 'validation'].map((stepID) => getStepCounter(steps, stepID)?.index);

        // Then the numbers and the total stay the same either way, because only steps that count on their own take a number
        expect(counters).toEqual([0, 1, 2, 3]);
        expect(getStepCounter(steps, 'validation')?.stepNames).toEqual(['1', '2', '3', '4']);
    });

    it('shows the number of the step before a shared step', () => {
        // Given a plan where a check belongs to the personal info step
        const steps = createSteps({hasCheck: true, hasDocuments: false});

        // When the counter of the check is read
        const counter = getStepCounter(steps, 'identityCheck');

        // Then it shows the position of the personal info step, so the header does not move on during the check
        expect(counter).toEqual({index: 1, stepNames: ['1', '2', '3', '4']});
    });

    it('hides the counter of a step that does not count', () => {
        // Given a plan with a step outside the counter
        const steps = createSteps({hasCheck: false, hasDocuments: true});

        // When the counter of that step is read
        const counter = getStepCounter(steps, 'documents');

        // Then there is none, so the header shows no counter on it
        expect(counter).toBeUndefined();
    });

    it('raises the total when an optional step that counts on its own is in the plan', () => {
        // Given a plan whose last step counts on its own only for some setups, like the docusign step of AUD
        const stepsWithoutOptionalStep = [createStep('country'), createStep('agreements'), createStep('finish', 'none')];
        const stepsWithOptionalStep = [createStep('country'), createStep('agreements'), createStep('docusign'), createStep('finish', 'none')];

        // When the counter of the step before it is read in both plans
        const counterWithoutOptionalStep = getStepCounter(stepsWithoutOptionalStep, 'agreements');
        const counterWithOptionalStep = getStepCounter(stepsWithOptionalStep, 'agreements');

        // Then only the total changes, because the optional step comes after it
        expect(counterWithoutOptionalStep).toEqual({index: 1, stepNames: ['1', '2']});
        expect(counterWithOptionalStep).toEqual({index: 1, stepNames: ['1', '2', '3']});
    });

    it('shows no counter in a plan where no step counts on its own', () => {
        // Given a plan with one step outside the counter, like the page of an invited director
        const steps = [createStep('signerInfo', 'none')];

        // When the counter of the step is read
        const counter = getStepCounter(steps, 'signerInfo');

        // Then there is none, so the header shows no counter
        expect(counter).toBeUndefined();
    });

    it('shows no counter for a step that is not in the plan', () => {
        // Given a plan without the step
        const steps = createSteps({hasCheck: false, hasDocuments: false});

        // When the counter of a step outside the plan is read
        const counter = getStepCounter(steps, 'identityCheck');

        // Then there is none, so a stale step ID never gets the number of another step
        expect(counter).toBeUndefined();
    });
});
