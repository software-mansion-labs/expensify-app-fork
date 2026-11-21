import type {FlowPosition} from '@pages/SimplifiedBankOnboarding/flow/position';
import {comparePositionIndexes, getPositionIndex} from '@pages/SimplifiedBankOnboarding/flow/position';
import isPositionReachable from '@pages/SimplifiedBankOnboarding/flow/reachability';
import getResumePosition from '@pages/SimplifiedBankOnboarding/flow/resume';
import {
    getEditReturnPosition,
    getFirstPosition,
    getFollowingPagePosition,
    getNextStepPosition,
    getPositionAfterSubmit,
    getPreviousPosition,
    getStepFirstPosition,
    getStepPagePosition,
} from '@pages/SimplifiedBankOnboarding/flow/transitions';
import type {FlowPlan, PageConfig, PageID, StepConfig, StepID} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

const {PAGE_NAMES, PERSONAL_INFO_SUB_PAGES, VERIFY_IDENTITY_SUB_PAGES, BUSINESS_INFO_SUB_PAGES, VALIDATION_SUB_PAGES} = SBO_CONST.USD;

type PageOptions = {
    isComplete?: boolean;
    previousPageID?: PageID;
};

function formPage(id: PageID, {isComplete = true, previousPageID}: PageOptions = {}): PageConfig {
    return {
        kind: 'form',
        id,
        title: id,
        fields: [],
        isComplete,
        previousPageID,
    };
}

function confirmationPage(id: PageID, isComplete = true): PageConfig {
    return {kind: 'confirmation', id, title: id, isComplete};
}

function step(id: StepID, pages: PageConfig[], isComplete = true): StepConfig {
    return {id, title: id, pages, isComplete};
}

function position(stepID: StepID, pageID: PageID, isEditing = false): FlowPosition {
    return {stepID, pageID, isEditing};
}

type PlanOptions = {
    isPersonalInfoComplete?: boolean;
    isDateOfBirthComplete?: boolean;
    isBusinessInfoComplete?: boolean;
    businessNamePreviousPageID?: PageID;
};

/**
 * A small plan with the shape of the USD flow: a step with a confirmation, a custom step without one, a second step
 * with a confirmation and a last step with one page.
 */
function buildPlan({isPersonalInfoComplete = true, isDateOfBirthComplete = true, isBusinessInfoComplete = false, businessNamePreviousPageID}: PlanOptions = {}): FlowPlan {
    return {
        answers: {},
        steps: [
            step(
                PAGE_NAMES.REQUESTOR,
                [
                    formPage(PERSONAL_INFO_SUB_PAGES.FULL_NAME),
                    formPage(PERSONAL_INFO_SUB_PAGES.DATE_OF_BIRTH, {
                        isComplete: isDateOfBirthComplete,
                    }),
                    formPage(PERSONAL_INFO_SUB_PAGES.SSN),
                    confirmationPage(PERSONAL_INFO_SUB_PAGES.CONFIRMATION),
                ],
                isPersonalInfoComplete,
            ),
            step(PAGE_NAMES.VERIFY_IDENTITY, [formPage(VERIFY_IDENTITY_SUB_PAGES.IDENTITY_CHECK)], isPersonalInfoComplete),
            step(
                PAGE_NAMES.COMPANY,
                [
                    formPage(BUSINESS_INFO_SUB_PAGES.NAME, {
                        isComplete: false,
                        previousPageID: businessNamePreviousPageID,
                    }),
                    formPage(BUSINESS_INFO_SUB_PAGES.TAX_ID, {isComplete: false}),
                    confirmationPage(BUSINESS_INFO_SUB_PAGES.CONFIRMATION),
                ],
                isBusinessInfoComplete,
            ),
            step(PAGE_NAMES.VALIDATION, [formPage(VALIDATION_SUB_PAGES.VALIDATE, {isComplete: false})], false),
        ],
    };
}

describe('flow/position', () => {
    it('finds the index of a position and orders positions by step first, then by page', () => {
        // Given a plan and three positions, two in the same step
        const plan = buildPlan();

        // When the positions are looked up
        const dateOfBirth = getPositionIndex(plan, position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.DATE_OF_BIRTH));
        const confirmation = getPositionIndex(plan, position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.CONFIRMATION));
        const businessName = getPositionIndex(plan, position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.NAME));

        // Then the indexes follow the plan and the comparison puts a later step after every page of an earlier one
        expect(dateOfBirth).toEqual({stepIndex: 0, pageIndex: 1});
        expect(businessName).toEqual({stepIndex: 2, pageIndex: 0});
        if (!dateOfBirth || !confirmation || !businessName) {
            throw new Error('Every position of the plan must have an index');
        }
        expect(comparePositionIndexes(dateOfBirth, confirmation)).toBeLessThan(0);
        expect(comparePositionIndexes(businessName, confirmation)).toBeGreaterThan(0);
        expect(comparePositionIndexes(confirmation, confirmation)).toBe(0);
    });

    test.each([
        ['a step the plan does not have', position(PAGE_NAMES.KYB_DOCS, SBO_CONST.USD.KYB_DOCUMENTS_SUB_PAGES.UPLOAD)],
        ['a page that belongs to another step', position(PAGE_NAMES.REQUESTOR, BUSINESS_INFO_SUB_PAGES.TAX_ID)],
    ])('has no index for %s', (_, unknownPosition) => {
        // Given a URL that names a position the plan does not hold, such as a skipped step
        const plan = buildPlan();

        // When the position is looked up
        const index = getPositionIndex(plan, unknownPosition);

        // Then it has no index, so the URL guard and the moves treat it as missing
        expect(index).toBeUndefined();
    });
});

describe('flow/transitions', () => {
    it('opens the first page of the plan and of a step', () => {
        // Given a plan
        const plan = buildPlan();

        // When the first positions are asked for
        const firstPosition = getFirstPosition(plan);
        const companyFirstPosition = getStepFirstPosition(plan, PAGE_NAMES.COMPANY);
        const missingStepPosition = getStepFirstPosition(plan, PAGE_NAMES.KYB_DOCS);

        // Then they are the first pages, and a step that the plan skips has no first page
        expect(firstPosition).toEqual(position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.FULL_NAME));
        expect(companyFirstPosition).toEqual(position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.NAME));
        expect(missingStepPosition).toBeUndefined();
    });

    it('opens a page of a step only when the step holds it', () => {
        // Given a plan
        const plan = buildPlan();

        // When a confirmation row asks for a page of the step in edit mode, and for a page of another step
        const editPosition = getStepPagePosition(plan, PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.SSN, true);
        const foreignPosition = getStepPagePosition(plan, PAGE_NAMES.REQUESTOR, BUSINESS_INFO_SUB_PAGES.TAX_ID);

        // Then the page of the step opens with the edit flag, and a page of another step does not open
        expect(editPosition).toEqual(position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.SSN, true));
        expect(foreignPosition).toBeUndefined();
    });

    test.each([
        ['the next page of the step', position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.FULL_NAME), position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.DATE_OF_BIRTH)],
        ['nothing at the end of the step', position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.CONFIRMATION), undefined],
        ['nothing for a step the plan does not have', position(PAGE_NAMES.KYB_DOCS, SBO_CONST.USD.KYB_DOCUMENTS_SUB_PAGES.UPLOAD), undefined],
    ])('follows a page with %s', (_, currentPosition, expectedPosition) => {
        // Given a plan and the open page
        const plan = buildPlan();

        // When the following page is asked for
        const followingPosition = getFollowingPagePosition(plan, currentPosition);

        // Then it stays in the step, so the end of the step is where the step request runs
        expect(followingPosition).toEqual(expectedPosition);
    });

    describe('getPositionAfterSubmit', () => {
        it('goes to the following page when the transition names no page', () => {
            // Given the first page of a step
            const plan = buildPlan();

            // When the page is submitted without a transition of its own
            const nextPosition = getPositionAfterSubmit(plan, position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.FULL_NAME), {});

            // Then the next page of the step opens
            expect(nextPosition).toEqual(position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.DATE_OF_BIRTH));
        });

        it('goes to the page that the transition names, in edit mode when it asks for it', () => {
            // Given a page whose transition jumps over a page, like a question that leads to the owner list
            const plan = buildPlan();

            // When the page is submitted with that transition
            const nextPosition = getPositionAfterSubmit(plan, position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.FULL_NAME), {
                nextPageID: PERSONAL_INFO_SUB_PAGES.CONFIRMATION,
                isEditing: true,
            });

            // Then the named page opens and keeps the edit flag
            expect(nextPosition).toEqual(position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.CONFIRMATION, true));
        });

        it('falls back to the following page when the named page is not in the step', () => {
            // Given a transition that names a page which the plan left out
            const plan = buildPlan();

            // When the page is submitted
            const nextPosition = getPositionAfterSubmit(plan, position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.FULL_NAME), {
                nextPageID: BUSINESS_INFO_SUB_PAGES.TAX_ID,
            });

            // Then the flow does not jump into another step and opens the following page instead
            expect(nextPosition).toEqual(position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.DATE_OF_BIRTH));
        });

        it('ends the step after the last page', () => {
            // Given the confirmation, the last page of a step
            const plan = buildPlan();

            // When it is submitted
            const nextPosition = getPositionAfterSubmit(plan, position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.CONFIRMATION), {});

            // Then there is no next page, which tells the controller to run the request of the step
            expect(nextPosition).toBeUndefined();
        });
    });

    describe('getEditReturnPosition', () => {
        test.each([
            [
                'the confirmation after a page of the step',
                position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.FULL_NAME),
                position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.CONFIRMATION),
            ],
            ['nothing on the confirmation itself', position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.CONFIRMATION), undefined],
            ['nothing on the only page of a step', position(PAGE_NAMES.VERIFY_IDENTITY, VERIFY_IDENTITY_SUB_PAGES.IDENTITY_CHECK), undefined],
            ['nothing for a step the plan does not have', position(PAGE_NAMES.KYB_DOCS, SBO_CONST.USD.KYB_DOCUMENTS_SUB_PAGES.UPLOAD), undefined],
        ])('returns from an edited page to %s', (_, editedPosition, expectedPosition) => {
            // Given a page that a confirmation row opened
            const plan = buildPlan();

            // When the edit ends
            const returnPosition = getEditReturnPosition(plan, editedPosition);

            // Then the user lands on the confirmation that opened the page
            expect(returnPosition).toEqual(expectedPosition);
        });

        it('returns to the last page of the step when no confirmation follows', () => {
            // Given a step whose pages end without a confirmation
            const plan: FlowPlan = {
                answers: {},
                steps: [step(PAGE_NAMES.COMPANY, [formPage(BUSINESS_INFO_SUB_PAGES.NAME), formPage(BUSINESS_INFO_SUB_PAGES.TAX_ID), formPage(BUSINESS_INFO_SUB_PAGES.INCORPORATION_TYPE)])],
            };

            // When the first page ends its edit
            const returnPosition = getEditReturnPosition(plan, position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.NAME, true));

            // Then the last page of the step opens
            expect(returnPosition).toEqual(position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.INCORPORATION_TYPE));
        });
    });

    describe('getPreviousPosition', () => {
        test.each([
            ['the preceding page of the step', position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.SSN), position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.DATE_OF_BIRTH)],
            [
                'the last page of the previous step',
                position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.NAME),
                position(PAGE_NAMES.VERIFY_IDENTITY, VERIFY_IDENTITY_SUB_PAGES.IDENTITY_CHECK),
            ],
            ['the entry page from the first page of the plan', position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.FULL_NAME), undefined],
            ['the entry page from a position the plan does not have', position(PAGE_NAMES.KYB_DOCS, SBO_CONST.USD.KYB_DOCUMENTS_SUB_PAGES.UPLOAD), undefined],
            ['the entry page from a page the step does not have', position(PAGE_NAMES.COMPANY, PERSONAL_INFO_SUB_PAGES.SSN), undefined],
            [
                'the confirmation from a page in edit mode',
                position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.DATE_OF_BIRTH, true),
                position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.CONFIRMATION),
            ],
            [
                'the preceding page from the confirmation in edit mode, which has no confirmation to return to',
                position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.CONFIRMATION, true),
                position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.SSN),
            ],
        ])('goes back to %s', (_, currentPosition, expectedPosition) => {
            // Given a plan and the open page
            const plan = buildPlan();

            // When the user presses Back
            const previousPosition = getPreviousPosition(plan, currentPosition);

            // Then the plan decides where Back leads, and undefined leaves the flow
            expect(previousPosition).toEqual(expectedPosition);
        });

        it('follows the previous page that a page names', () => {
            // Given a page that names the page before it, like the first owner page that returns to the owner list
            const plan = buildPlan({
                businessNamePreviousPageID: BUSINESS_INFO_SUB_PAGES.CONFIRMATION,
            });

            // When the user presses Back on it
            const previousPosition = getPreviousPosition(plan, position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.NAME));

            // Then the named page opens instead of the last page of the previous step
            expect(previousPosition).toEqual(position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.CONFIRMATION));
        });

        it('ignores a named previous page that the step does not have', () => {
            // Given a page that names a previous page which the plan left out
            const plan = buildPlan({
                businessNamePreviousPageID: PERSONAL_INFO_SUB_PAGES.SSN,
            });

            // When the user presses Back on it
            const previousPosition = getPreviousPosition(plan, position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.NAME));

            // Then Back falls back to the order of the plan
            expect(previousPosition).toEqual(position(PAGE_NAMES.VERIFY_IDENTITY, VERIFY_IDENTITY_SUB_PAGES.IDENTITY_CHECK));
        });
    });

    describe('getNextStepPosition', () => {
        it('opens the first page of the next step', () => {
            // Given a plan that the request of the step did not change
            const plan = buildPlan();

            // When the personal info step is done
            const nextPosition = getNextStepPosition(plan, plan, PAGE_NAMES.REQUESTOR);

            // Then the first page of the following step opens
            expect(nextPosition).toEqual(position(PAGE_NAMES.VERIFY_IDENTITY, VERIFY_IDENTITY_SUB_PAGES.IDENTITY_CHECK));
        });

        it('finds the next step when the request removed the finished step from the plan', () => {
            // Given the identity check, which leaves the plan once the server accepts it
            const previousPlan = buildPlan();
            const plan: FlowPlan = {
                answers: {},
                steps: previousPlan.steps.filter((planStep) => planStep.id !== PAGE_NAMES.VERIFY_IDENTITY),
            };

            // When the identity step is done
            const nextPosition = getNextStepPosition(plan, previousPlan, PAGE_NAMES.VERIFY_IDENTITY);

            // Then the flow goes on after the step that came before it, so it does not restart from the first step
            expect(nextPosition).toEqual(position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.NAME));
        });

        it('ends the flow after the last step', () => {
            // Given a plan
            const plan = buildPlan();

            // When the last step is done
            const nextPosition = getNextStepPosition(plan, plan, PAGE_NAMES.VALIDATION);

            // Then there is no next position, which means the flow is done
            expect(nextPosition).toBeUndefined();
        });
    });
});

describe('flow/resume', () => {
    test.each<[string, PlanOptions, FlowPosition]>([
        [
            'the first incomplete page of the first incomplete step',
            {isPersonalInfoComplete: false, isDateOfBirthComplete: false},
            position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.DATE_OF_BIRTH),
        ],
        ['the last page of an incomplete step whose pages are all complete', {isPersonalInfoComplete: false}, position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.CONFIRMATION)],
        ['the first page of the next step once the earlier steps are complete', {}, position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.NAME)],
        ['an incomplete page of a later step even when a complete step has incomplete pages', {isDateOfBirthComplete: false}, position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.NAME)],
    ])('resumes on %s', (_, options, expectedPosition) => {
        // Given a plan whose completeness comes from the answers and the server data
        const plan = buildPlan(options);

        // When the flow opens without a position in the URL
        const resumePosition = getResumePosition(plan);

        // Then it opens the page that still needs an answer
        expect(resumePosition).toEqual(expectedPosition);
    });

    it('resumes on the last step when every step is complete', () => {
        // Given a plan where the server finished every step
        const plan: FlowPlan = {
            answers: {},
            steps: [step(PAGE_NAMES.REQUESTOR, [confirmationPage(PERSONAL_INFO_SUB_PAGES.CONFIRMATION)]), step(PAGE_NAMES.VALIDATION, [formPage(VALIDATION_SUB_PAGES.VALIDATE)])],
        };

        // When the flow opens
        const resumePosition = getResumePosition(plan);

        // Then the last page shows the state of the setup instead of sending the user back to the start
        expect(resumePosition).toEqual(position(PAGE_NAMES.VALIDATION, VALIDATION_SUB_PAGES.VALIDATE));
    });

    it('has no resume position for an empty plan', () => {
        // Given a plan without steps
        const plan: FlowPlan = {steps: [], answers: {}};

        // When the flow opens
        const resumePosition = getResumePosition(plan);

        // Then there is nothing to open
        expect(resumePosition).toBeUndefined();
    });
});

describe('flow/reachability', () => {
    test.each<[string, FlowPosition | undefined, boolean]>([
        ['allows a page of a finished step', position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.SSN), true],
        ['allows the resume position itself', position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.NAME), true],
        ['rejects a later page of the resume step', position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.TAX_ID), false],
        ['rejects a page of a later step', position(PAGE_NAMES.VALIDATION, VALIDATION_SUB_PAGES.VALIDATE), false],
        ['rejects a step the plan skips', position(PAGE_NAMES.KYB_DOCS, SBO_CONST.USD.KYB_DOCUMENTS_SUB_PAGES.UPLOAD), false],
        ['rejects a URL without a position', undefined, false],
    ])('%s', (_, urlPosition, expected) => {
        // Given a plan that resumes on the first page of the business step
        const plan = buildPlan();

        // When the URL guard checks the position of the URL
        const isReachable = isPositionReachable(plan, urlPosition);

        // Then only positions up to the resume position open, so a typed or stale URL cannot skip a page
        expect(isReachable).toBe(expected);
    });

    it('allows an earlier page in edit mode', () => {
        // Given a plan and a confirmation row link of a finished step
        const plan = buildPlan();

        // When the URL guard checks the edit position
        const isReachable = isPositionReachable(plan, position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.FULL_NAME, true));

        // Then the edit flag does not change what is reachable
        expect(isReachable).toBe(true);
    });

    it('rejects every position of an empty plan', () => {
        // Given a plan without steps, which has no resume position
        const plan: FlowPlan = {steps: [], answers: {}};

        // When the URL guard checks any position
        const isReachable = isPositionReachable(plan, position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.FULL_NAME));

        // Then nothing is reachable
        expect(isReachable).toBe(false);
    });
});
