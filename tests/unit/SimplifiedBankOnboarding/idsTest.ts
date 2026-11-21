import {isPageID, isStepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {getPositionFromParams} from '@pages/SimplifiedBankOnboarding/core/navigation/routes';
import type {FlowRouteParams, FlowRouteTarget} from '@pages/SimplifiedBankOnboarding/core/navigation/routes';

const USD_TARGET: FlowRouteTarget = {kind: 'usd', policyID: 'usd', backTo: undefined};
const SIGNER_TARGET: FlowRouteTarget = {kind: 'enterSignerInfo', policyID: 'eur', bankAccountID: 42, isCompleted: false};

describe('step and page IDs', () => {
    it('accepts the page names and sub-pages of both flows and of the invited director page', () => {
        // Given IDs taken from every group of the constants
        // When they are checked
        // Then each one is known, so a URL built by the flow always names a position
        expect(isStepID(SBO_CONST.USD.PAGE_NAMES.REQUESTOR)).toBe(true);
        expect(isStepID(SBO_CONST.NON_USD.PAGE_NAMES.DOCUSIGN)).toBe(true);
        expect(isPageID(SBO_CONST.USD.BENEFICIAL_OWNERS_SUB_PAGES.UBOS_LIST)).toBe(true);
        expect(isPageID(SBO_CONST.NON_USD.SIGNER_INFO_SUB_PAGES.HANG_TIGHT)).toBe(true);
        expect(isPageID(SBO_CONST.ENTER_SIGNER_INFO_SUB_PAGES.JOB_TITLE)).toBe(true);
    });

    it('rejects values that are not IDs of the constants', () => {
        // Given values from a hand-edited URL and a constant that is not a sub-page
        // When they are checked
        // Then none of them is an ID
        expect(isStepID('unknown-step')).toBe(false);
        expect(isPageID('unknown-page')).toBe(false);
        expect(isPageID(SBO_CONST.USD.INCORPORATION_TYPES.LLC)).toBe(false);
    });
});

describe('getPositionFromParams', () => {
    it('reads a known position from the URL', () => {
        // Given a URL of the USD flow opened from a confirmation
        const params: FlowRouteParams = {page: SBO_CONST.USD.PAGE_NAMES.REQUESTOR, subPage: SBO_CONST.USD.PERSONAL_INFO_SUB_PAGES.SSN, action: 'edit'};

        // When the position is read
        const position = getPositionFromParams(USD_TARGET, params);

        // Then it names the step, the page and the edit mode
        expect(position).toEqual({stepID: SBO_CONST.USD.PAGE_NAMES.REQUESTOR, pageID: SBO_CONST.USD.PERSONAL_INFO_SUB_PAGES.SSN, isEditing: true});
    });

    it('names no position for an unknown step or page', () => {
        // Given URLs with a step or a page that the flow does not have
        // When the positions are read
        const unknownStep = getPositionFromParams(USD_TARGET, {page: 'unknown-step', subPage: SBO_CONST.USD.PERSONAL_INFO_SUB_PAGES.SSN});
        const unknownPage = getPositionFromParams(USD_TARGET, {page: SBO_CONST.USD.PAGE_NAMES.REQUESTOR, subPage: 'unknown-page'});

        // Then neither names a position, so the flow redirects to where it resumes
        expect(unknownStep).toBeUndefined();
        expect(unknownPage).toBeUndefined();
    });

    it('takes the step of the invited director page from the target', () => {
        // Given the invited director page, whose URL holds the page alone
        // When the position is read
        const position = getPositionFromParams(SIGNER_TARGET, {subPage: SBO_CONST.ENTER_SIGNER_INFO_SUB_PAGES.NAME});

        // Then the step is the signer step
        expect(position).toEqual({stepID: SBO_CONST.NON_USD.PAGE_NAMES.SIGNER_INFO, pageID: SBO_CONST.ENTER_SIGNER_INFO_SUB_PAGES.NAME, isEditing: false});
    });
});
