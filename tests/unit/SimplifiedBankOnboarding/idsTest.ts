import {ENTER_SIGNER_INFO_STEP_ID, isStepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';

describe('step IDs', () => {
    it('accepts the steps of both flows and of the invited director page', () => {
        // Given step IDs taken from every flow
        // When they are checked
        // Then each one is known, so a URL built by a flow always names a step
        expect(isStepID(SBO_CONST.USD.PAGE_NAMES.REQUESTOR)).toBe(true);
        expect(isStepID(SBO_CONST.NON_USD.PAGE_NAMES.DOCUSIGN)).toBe(true);
        expect(isStepID(ENTER_SIGNER_INFO_STEP_ID)).toBe(true);
    });

    it('rejects values that are not IDs of the constants', () => {
        // Given values from a hand-edited URL, a missing param, and a constant that is not a step of a URL
        // When they are checked
        // Then none of them is an ID, so the flow redirects instead of trusting the URL
        expect(isStepID('unknown-step')).toBe(false);
        expect(isStepID(undefined)).toBe(false);
        expect(isStepID(SBO_CONST.USD.STEP.REQUESTOR)).toBe(false);
    });
});
