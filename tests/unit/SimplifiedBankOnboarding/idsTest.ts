import {ENTER_SIGNER_INFO_STEP_ID, isPageID, isStepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';

describe('step and page IDs', () => {
    it('accepts the steps of both flows and of the invited director page', () => {
        // Given step IDs taken from every flow
        // When they are checked
        // Then each one is known, so a URL built by a flow always names a step
        expect(isStepID(SBO_CONST.USD.PAGE_NAMES.REQUESTOR)).toBe(true);
        expect(isStepID(SBO_CONST.NON_USD.PAGE_NAMES.DOCUSIGN)).toBe(true);
        expect(isStepID(ENTER_SIGNER_INFO_STEP_ID)).toBe(true);
    });

    it('accepts the sub pages of every group of both flows and of the invited director page', () => {
        // Given page IDs taken from every kind of sub page group
        // When they are checked
        // Then each one is known, so a URL built by a flow always names a page
        expect(isPageID(SBO_CONST.USD.BENEFICIAL_OWNERS_SUB_PAGES.UBOS_LIST)).toBe(true);
        expect(isPageID(SBO_CONST.USD.PERSONAL_INFO_SUB_PAGES.SSN)).toBe(true);
        expect(isPageID(SBO_CONST.NON_USD.SIGNER_INFO_SUB_PAGES.HANG_TIGHT)).toBe(true);
        expect(isPageID(SBO_CONST.ENTER_SIGNER_INFO_SUB_PAGES.JOB_TITLE)).toBe(true);
    });

    it('rejects values that are not IDs of the constants', () => {
        // Given values from a hand-edited URL, a missing param, and constants that are not steps or sub pages
        // When they are checked
        // Then none of them is an ID, so the flow redirects instead of trusting the URL
        expect(isStepID('unknown-step')).toBe(false);
        expect(isStepID(undefined)).toBe(false);
        expect(isStepID(SBO_CONST.USD.STEP.REQUESTOR)).toBe(false);
        expect(isPageID('unknown-page')).toBe(false);
        expect(isPageID(undefined)).toBe(false);
        expect(isPageID(SBO_CONST.USD.INCORPORATION_TYPES.LLC)).toBe(false);
    });
});
