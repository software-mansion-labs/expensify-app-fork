import type {USDStepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {USDStep} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import getUSDResumeStep from '@pages/SimplifiedBankOnboarding/flows/usd/getUSDResumeStep';

const {STEP, PAGE_NAMES} = SBO_CONST.USD;

describe('getUSDResumeStep', () => {
    it.each<[USDStep, USDStepID]>([
        [STEP.COUNTRY, PAGE_NAMES.COUNTRY],
        [STEP.BANK_ACCOUNT, PAGE_NAMES.BANK_ACCOUNT],
        [STEP.REQUESTOR, PAGE_NAMES.REQUESTOR],
        [STEP.COMPANY, PAGE_NAMES.COMPANY],
        [STEP.BENEFICIAL_OWNERS, PAGE_NAMES.BENEFICIAL_OWNERS],
        [STEP.ACH_CONTRACT, PAGE_NAMES.ACH_CONTRACT],
        [STEP.KYB_DOCS, PAGE_NAMES.KYB_DOCS],
        [STEP.VALIDATION, PAGE_NAMES.VALIDATION],
    ])('opens the step of the server step %s', (serverStep, expectedStep) => {
        // Given a setup that the server stored at this step
        const achData = {currentStep: serverStep};

        // When the flow opens without a step in the URL
        const step = getUSDResumeStep(achData);

        // Then it opens the step of the server, so the user continues where the server stopped
        expect(step).toBe(expectedStep);
    });

    it('opens the first step when the server stored no step', () => {
        // Given no account data at all, as for a new setup
        // When the flow opens without a step in the URL
        const step = getUSDResumeStep(undefined);

        // Then it opens the country step, which starts every setup
        expect(step).toBe(PAGE_NAMES.COUNTRY);
    });

    it('opens the first step when the server step has no step of the flow', () => {
        // Given an account that the server already enabled, a step that no page of the flow shows
        const achData = {currentStep: STEP.ENABLE};

        // When the flow opens without a step in the URL
        const step = getUSDResumeStep(achData);

        // Then it falls back to the country step, as the entry did before
        expect(step).toBe(PAGE_NAMES.COUNTRY);
    });
});
