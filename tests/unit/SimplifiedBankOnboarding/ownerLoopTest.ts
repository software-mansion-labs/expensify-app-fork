import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {GlobalOwnerDraft, OnboardingDraft, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {PageID, StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {FlowPosition} from '@pages/SimplifiedBankOnboarding/core/plan/position/position';
import {findPage, findStep} from '@pages/SimplifiedBankOnboarding/core/plan/position/position';
import {getPositionAfterSubmit, getPreviousPosition, getStepPagePosition} from '@pages/SimplifiedBankOnboarding/core/plan/position/transitions';
import type {FlowPlan, PageConfig} from '@pages/SimplifiedBankOnboarding/core/plan/types';
import buildNonUSDPlan from '@pages/SimplifiedBankOnboarding/flows/nonUSD/buildNonUSDPlan';
import {canAddMoreGlobalOwners, canAddMoreUSDOwners, isValidGlobalOwnerShare} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/canAddMoreOwners';
import buildUSDPlan from '@pages/SimplifiedBankOnboarding/flows/usd/buildUSDPlan';

/** Returns the key with its parameters, so a validator error is never an empty string that would make an invalid form look complete */
const translate: LocalizedTranslate = (path, ...parameters) => [path, ...parameters.map(String)].join(' ');

const USD_PAGES = SBO_CONST.USD.BENEFICIAL_OWNERS_SUB_PAGES;
const USD_STEP_ID = SBO_CONST.USD.PAGE_NAMES.BENEFICIAL_OWNERS;
const GLOBAL_PAGES = SBO_CONST.NON_USD.BENEFICIAL_OWNER_INFO_SUB_PAGES;
const GLOBAL_STEP_ID = SBO_CONST.NON_USD.PAGE_NAMES.BENEFICIAL_OWNER_INFO;
const {CURRENT_USER_KEY} = SBO_CONST.NON_USD;

/** A USD account that the server moved to the owners step, with the personal info and the company saved */
const USD_ACCOUNT: OnboardingAccount = {
    achData: {
        policyID: 'usd',
        bankAccountID: 1001,
        state: SBO_CONST.STATE.SETUP,
        currentStep: SBO_CONST.USD.STEP.BENEFICIAL_OWNERS,
        subStep: SBO_CONST.SETUP_TYPE.MANUAL,
        country: SBO_CONST.COUNTRY.US,
        firstName: 'Jane',
        lastName: 'Doe',
        dob: '1990-01-01',
        ssnLast4: '1234',
        isOnfidoSetupComplete: true,
        companyName: 'Acme',
        companyTaxID: '123456789',
        incorporationType: SBO_CONST.USD.INCORPORATION_TYPES.LLC,
    },
};

/** A EUR account with the bank and the company saved and no owners yet */
const GLOBAL_ACCOUNT: OnboardingAccount = {
    achData: {
        policyID: 'eur',
        bankAccountID: 1001,
        state: SBO_CONST.STATE.SETUP,
        created: '2026-01-01T00:00:00.000Z',
        country: SBO_CONST.COUNTRY.DE,
        currency: SBO_CONST.CURRENCY.EUR,
        corpay: {companyName: 'Acme', businessType: 'COMPANY'},
    },
};

function buildUSDOwnersPlan(draft: OnboardingDraft): FlowPlan {
    return buildUSDPlan(
        {draft, account: USD_ACCOUNT, workspaces: undefined, bankFields: undefined, picklists: undefined, plaidLinkToken: undefined, onfidoToken: undefined},
        {translate, policyID: 'usd'},
    );
}

function buildGlobalOwnersPlan(draft: OnboardingDraft): FlowPlan {
    return buildNonUSDPlan(
        {
            draft,
            account: GLOBAL_ACCOUNT,
            workspaces: {
                eur: {
                    id: 'eur',
                    name: 'Acme EU',
                    outputCurrency: SBO_CONST.CURRENCY.EUR,
                    role: SBO_CONST.WORKSPACE_ROLE.ADMIN,
                },
            },
            bankFields: undefined,
            picklists: undefined,
            plaidLinkToken: undefined,
            onfidoToken: undefined,
        },
        {translate, policyID: 'eur'},
    );
}

function getPage(plan: FlowPlan, position: FlowPosition): PageConfig {
    const step = findStep(plan, position.stepID);
    const page = step ? findPage(step, position.pageID) : undefined;
    if (!page) {
        throw new Error(`The plan has no page ${position.pageID}`);
    }
    return page;
}

/**
 * Drives the owner step the way the flow controller does: a submit merges the transition draft update (or the submitted
 * values) into the draft, rebuilds the plan and moves to the page the transition names, else the following one. An
 * undefined position means the step is done.
 */
function createOwnerStep(buildPlan: (draft: OnboardingDraft) => FlowPlan, stepID: StepID, firstPageID: PageID, initialDraft: OnboardingDraft = {}) {
    let draft = initialDraft;
    let position: FlowPosition | undefined = getStepPagePosition(buildPlan(draft), stepID, firstPageID);

    const getCurrentPosition = (): FlowPosition => {
        if (!position) {
            throw new Error('The owner step is already done');
        }
        return position;
    };

    const ownerStep = {
        submit(values: OnboardingDraft) {
            const from = getCurrentPosition();
            const transition = getPage(buildPlan(draft), from).onSubmit?.(values) ?? {};
            draft = {...draft, ...(transition.draftUpdate ?? values)};
            position = getPositionAfterSubmit(buildPlan(draft), from, transition);
            return ownerStep;
        },
        pressRow(rowID: string) {
            const from = getCurrentPosition();
            const page = getPage(buildPlan(draft), from);
            if (page.kind !== 'list' || !page.onRowPress) {
                throw new Error(`The page ${from.pageID} is not a list`);
            }
            const transition = page.onRowPress(rowID);
            draft = {...draft, ...transition.draftUpdate};
            position = transition.nextPageID
                ? {
                      stepID: from.stepID,
                      pageID: transition.nextPageID,
                      isEditing: !!transition.isEditing,
                  }
                : from;
            return ownerStep;
        },
        getPageID: () => position?.pageID,
        getDraft: () => draft,
        getListRowIDs: () => {
            const page = getPage(buildPlan(draft), getCurrentPosition());
            return page.kind === 'list' ? page.rows.map((row) => row.id) : [];
        },
        getPreviousPageID: () => getPreviousPosition(buildPlan(draft), getCurrentPosition())?.pageID,
    };
    return ownerStep;
}

function answer(
    fieldID: typeof INPUT_IDS.OWNS_MORE_THAN_25_PERCENT | typeof INPUT_IDS.HAS_OTHER_BENEFICIAL_OWNERS | typeof INPUT_IDS.HAS_MORE_BENEFICIAL_OWNERS,
    value: boolean,
): OnboardingDraft {
    return {[fieldID]: value};
}

/** Enters one USD owner on the name and date of birth pages and confirms it */
function enterUSDOwner(ownerStep: ReturnType<typeof createOwnerStep>, firstName: string, lastName = 'Owner') {
    return ownerStep
        .submit({
            [INPUT_IDS.OWNER_FIRST_NAME]: firstName,
            [INPUT_IDS.OWNER_LAST_NAME]: lastName,
        })
        .submit({[INPUT_IDS.OWNER_DOB]: '1980-05-05'})
        .submit({});
}

/** Enters one NonUSD owner on the name and share pages and confirms it */
function enterGlobalOwner(ownerStep: ReturnType<typeof createOwnerStep>, firstName: string, ownershipPercentage: string) {
    return ownerStep
        .submit({
            [INPUT_IDS.OWNER_FIRST_NAME]: firstName,
            [INPUT_IDS.OWNER_LAST_NAME]: 'Owner',
        })
        .submit({[INPUT_IDS.OWNER_OWNERSHIP_PERCENTAGE]: ownershipPercentage})
        .submit({});
}

function getUSDOwnerNames(draft: OnboardingDraft): string[] {
    return (draft.usdOwners ?? []).map((owner) => owner.firstName);
}

function getGlobalOwnerShares(draft: OnboardingDraft): Array<[string, string]> {
    return (draft.globalOwners ?? []).map((owner) => [owner.id, owner.ownershipPercentage]);
}

function buildUSDOwner(id: string): USDOwnerDraft {
    return {id, firstName: id, lastName: 'Owner', dob: '1980-05-05'};
}

function buildGlobalOwner(id: string, ownershipPercentage: string): GlobalOwnerDraft {
    return {id, firstName: id, lastName: 'Owner', ownershipPercentage};
}

describe('owner loop', () => {
    describe('USD', () => {
        const startUSDOwnerStep = (draft?: OnboardingDraft) => createOwnerStep(buildUSDOwnersPlan, USD_STEP_ID, USD_PAGES.IS_USER_UBO, draft);

        it('finishes the step on the second question when nobody owns 25%', () => {
            // Given a user at the first owner question
            const ownerStep = startUSDOwnerStep();

            // When the user answers that neither they nor anyone else owns 25%
            ownerStep.submit(answer(INPUT_IDS.OWNS_MORE_THAN_25_PERCENT, false)).submit(answer(INPUT_IDS.HAS_OTHER_BENEFICIAL_OWNERS, false));

            // Then the step has nothing more to ask, so it ends and its request sends no owners
            expect(ownerStep.getPageID()).toBeUndefined();
        });

        it('lists only the user when the user owns 25% and nobody else does', () => {
            // Given a user at the first owner question
            const ownerStep = startUSDOwnerStep();

            // When the user answers that only they own 25%
            ownerStep.submit(answer(INPUT_IDS.OWNS_MORE_THAN_25_PERCENT, true)).submit(answer(INPUT_IDS.HAS_OTHER_BENEFICIAL_OWNERS, false));

            // Then the list shows the read-only row of the user, whose details come from the personal info step
            expect(ownerStep.getPageID()).toBe(USD_PAGES.UBOS_LIST);
            expect(ownerStep.getListRowIDs()).toEqual(['requestor']);
        });

        it('adds owners until the three places are taken, then opens the list', () => {
            // Given a user who owns less than 25% and said that someone else does
            const ownerStep = startUSDOwnerStep().submit(answer(INPUT_IDS.OWNS_MORE_THAN_25_PERCENT, false)).submit(answer(INPUT_IDS.HAS_OTHER_BENEFICIAL_OWNERS, true));
            expect(ownerStep.getPageID()).toBe(USD_PAGES.LEGAL_NAME);

            // When the user adds an owner and answers "yes" to more owners twice
            enterUSDOwner(ownerStep, 'Anna');
            expect(ownerStep.getPageID()).toBe(USD_PAGES.ARE_THERE_MORE_UBOS);
            enterUSDOwner(ownerStep.submit(answer(INPUT_IDS.HAS_MORE_BENEFICIAL_OWNERS, true)), 'Ben');
            enterUSDOwner(ownerStep.submit(answer(INPUT_IDS.HAS_MORE_BENEFICIAL_OWNERS, true)), 'Carl');

            // Then the third owner fills the places, so the flow skips the question about more owners and opens the list
            expect(getUSDOwnerNames(ownerStep.getDraft())).toEqual(['Anna', 'Ben', 'Carl']);
            expect(ownerStep.getPageID()).toBe(USD_PAGES.UBOS_LIST);
            expect(ownerStep.getPreviousPageID()).toBe(USD_PAGES.IS_ANYONE_ELSE_UBO);
        });

        it('leaves two places for other owners when the user owns 25%', () => {
            // Given a user who owns 25% and said that someone else does
            const ownerStep = startUSDOwnerStep().submit(answer(INPUT_IDS.OWNS_MORE_THAN_25_PERCENT, true)).submit(answer(INPUT_IDS.HAS_OTHER_BENEFICIAL_OWNERS, true));

            // When the user adds two owners
            enterUSDOwner(ownerStep, 'Anna');
            enterUSDOwner(ownerStep.submit(answer(INPUT_IDS.HAS_MORE_BENEFICIAL_OWNERS, true)), 'Ben');

            // Then the user takes the third place, so the list opens with the user and both owners
            expect(ownerStep.getPageID()).toBe(USD_PAGES.UBOS_LIST);
            expect(ownerStep.getListRowIDs()).toHaveLength(3);
        });

        it('opens the list when the user answers "no" to more owners', () => {
            // Given one owner added and room for more
            const ownerStep = startUSDOwnerStep().submit(answer(INPUT_IDS.OWNS_MORE_THAN_25_PERCENT, false)).submit(answer(INPUT_IDS.HAS_OTHER_BENEFICIAL_OWNERS, true));
            enterUSDOwner(ownerStep, 'Anna');

            // When the user says that there are no more owners
            ownerStep.submit(answer(INPUT_IDS.HAS_MORE_BENEFICIAL_OWNERS, false));

            // Then the list opens, and Back returns to the question because the list still has room
            expect(ownerStep.getPageID()).toBe(USD_PAGES.UBOS_LIST);
            expect(ownerStep.getPreviousPageID()).toBe(USD_PAGES.ARE_THERE_MORE_UBOS);
        });

        it('starts a new owner with empty inputs after the previous one', () => {
            // Given one owner added
            const ownerStep = startUSDOwnerStep().submit(answer(INPUT_IDS.OWNS_MORE_THAN_25_PERCENT, false)).submit(answer(INPUT_IDS.HAS_OTHER_BENEFICIAL_OWNERS, true));
            enterUSDOwner(ownerStep, 'Anna');

            // When the user adds another one
            ownerStep.submit(answer(INPUT_IDS.HAS_MORE_BENEFICIAL_OWNERS, true));

            // Then the buffer is empty, so the new owner does not start with the details of the previous one
            expect(ownerStep.getDraft()).toMatchObject({
                ownerFirstName: '',
                ownerLastName: '',
                ownerDob: '',
                ownerBeingModifiedID: null,
            });
        });

        it('edits an owner from the list in place', () => {
            // Given a list of two owners
            const ownerStep = startUSDOwnerStep().submit(answer(INPUT_IDS.OWNS_MORE_THAN_25_PERCENT, false)).submit(answer(INPUT_IDS.HAS_OTHER_BENEFICIAL_OWNERS, true));
            enterUSDOwner(ownerStep, 'Anna');
            enterUSDOwner(ownerStep.submit(answer(INPUT_IDS.HAS_MORE_BENEFICIAL_OWNERS, true)), 'Ben');
            ownerStep.submit(answer(INPUT_IDS.HAS_MORE_BENEFICIAL_OWNERS, false));
            const [firstOwnerID] = ownerStep.getListRowIDs();

            // When the user opens the first owner, renames them and confirms
            ownerStep.pressRow(firstOwnerID);
            expect(ownerStep.getPageID()).toBe(USD_PAGES.LEGAL_NAME);
            expect(ownerStep.getDraft()).toMatchObject({
                ownerFirstName: 'Anna',
                ownerBeingModifiedID: firstOwnerID,
            });
            expect(ownerStep.getPreviousPageID()).toBe(USD_PAGES.UBOS_LIST);
            enterUSDOwner(ownerStep, 'Alice');

            // Then the owner keeps its ID and place, and the flow returns to the list instead of asking for more owners
            expect(ownerStep.getPageID()).toBe(USD_PAGES.UBOS_LIST);
            expect(getUSDOwnerNames(ownerStep.getDraft())).toEqual(['Alice', 'Ben']);
            expect(ownerStep.getListRowIDs().at(0)).toBe(firstOwnerID);
        });

        it('drops the last owner when the user becomes an owner of a full list', () => {
            // Given three owners in the draft and a user who said they own less than 25%
            const ownerStep = startUSDOwnerStep({
                ownsMoreThan25Percent: false,
                hasOtherBeneficialOwners: true,
                usdOwners: [buildUSDOwner('first'), buildUSDOwner('second'), buildUSDOwner('third')],
            });

            // When the user changes the answer to own 25%
            ownerStep.submit(answer(INPUT_IDS.OWNS_MORE_THAN_25_PERCENT, true));

            // Then the user takes a place, so only two other owners fit and the last one is dropped
            expect((ownerStep.getDraft().usdOwners ?? []).map((owner) => owner.id)).toEqual(['first', 'second']);
        });

        test.each<[string, number, boolean, boolean]>([
            ['allows a third owner beside a user who owns less than 25%', 2, false, true],
            ['rejects a fourth owner', 3, false, false],
            ['allows a second owner beside a user who owns 25%', 1, true, true],
            ['rejects a third owner beside a user who owns 25%', 2, true, false],
        ])('%s', (_, ownerCount, isUserOwner, expected) => {
            // Given a list of owners and the answer of the user
            const owners = Array.from({length: ownerCount}, (_value, index) => buildUSDOwner(`owner-${index}`));

            // When the flow asks whether another owner fits
            const canAddMore = canAddMoreUSDOwners(owners, isUserOwner);

            // Then at most three people are listed, counting the user who owns 25%
            expect(canAddMore).toBe(expected);
        });
    });

    describe('NonUSD', () => {
        const startGlobalOwnerStep = (draft?: OnboardingDraft) => createOwnerStep(buildGlobalOwnersPlan, GLOBAL_STEP_ID, GLOBAL_PAGES.IS_USER_BENEFICIAL_OWNER, draft);

        it('asks for the details of a user who owns 25% before the question about other owners', () => {
            // Given a user at the first owner question
            const ownerStep = startGlobalOwnerStep();

            // When the user answers that they own 25%
            ownerStep.submit(answer(INPUT_IDS.OWNS_MORE_THAN_25_PERCENT, true));

            // Then the owner pages open for the user, and the question about other owners waits until the user is listed
            expect(ownerStep.getPageID()).toBe(GLOBAL_PAGES.NAME);
            expect(ownerStep.getDraft().ownerBeingModifiedID).toBe(CURRENT_USER_KEY);
            expect(ownerStep.getPreviousPageID()).toBe(GLOBAL_PAGES.IS_USER_BENEFICIAL_OWNER);
        });

        it('asks about other owners after the user is listed, then lists only the user', () => {
            // Given a user who owns 25%
            const ownerStep = startGlobalOwnerStep().submit(answer(INPUT_IDS.OWNS_MORE_THAN_25_PERCENT, true));

            // When the user enters 30% and says that nobody else owns 25%
            enterGlobalOwner(ownerStep, 'Jane', '30');
            expect(ownerStep.getPageID()).toBe(GLOBAL_PAGES.IS_ANYONE_ELSE_BENEFICIAL_OWNER);
            ownerStep.submit(answer(INPUT_IDS.HAS_OTHER_BENEFICIAL_OWNERS, false));

            // Then the list holds the user under the fixed ID
            expect(ownerStep.getPageID()).toBe(GLOBAL_PAGES.BENEFICIAL_OWNERS_LIST);
            expect(ownerStep.getListRowIDs()).toEqual([CURRENT_USER_KEY]);
        });

        it('opens the list right after the user when the share of the user leaves no room for another holder of 25%', () => {
            // Given a user who owns 25%
            const ownerStep = startGlobalOwnerStep().submit(answer(INPUT_IDS.OWNS_MORE_THAN_25_PERCENT, true));

            // When the user enters 80%
            enterGlobalOwner(ownerStep, 'Jane', '80');

            // Then nobody else can own 25%, so the question about other owners is not asked
            expect(ownerStep.getPageID()).toBe(GLOBAL_PAGES.BENEFICIAL_OWNERS_LIST);
        });

        it('adds owners while their shares leave room for another holder of 25%', () => {
            // Given a user who owns less than 25% and said that someone else does
            const ownerStep = startGlobalOwnerStep().submit(answer(INPUT_IDS.OWNS_MORE_THAN_25_PERCENT, false)).submit(answer(INPUT_IDS.HAS_OTHER_BENEFICIAL_OWNERS, true));
            expect(ownerStep.getPageID()).toBe(GLOBAL_PAGES.NAME);

            // When the user adds owners of 30%, 30% and 25%
            enterGlobalOwner(ownerStep, 'Anna', '30');
            expect(ownerStep.getPageID()).toBe(GLOBAL_PAGES.ARE_THERE_MORE_BENEFICIAL_OWNERS);
            enterGlobalOwner(ownerStep.submit(answer(INPUT_IDS.HAS_MORE_BENEFICIAL_OWNERS, true)), 'Ben', '30');
            expect(ownerStep.getPageID()).toBe(GLOBAL_PAGES.ARE_THERE_MORE_BENEFICIAL_OWNERS);
            enterGlobalOwner(ownerStep.submit(answer(INPUT_IDS.HAS_MORE_BENEFICIAL_OWNERS, true)), 'Carl', '25');

            // Then 85% leaves less than 25%, so the list opens without the question about more owners
            expect(ownerStep.getPageID()).toBe(GLOBAL_PAGES.BENEFICIAL_OWNERS_LIST);
            expect(ownerStep.getListRowIDs()).toHaveLength(3);
            expect(ownerStep.getPreviousPageID()).toBe(GLOBAL_PAGES.IS_ANYONE_ELSE_BENEFICIAL_OWNER);
        });

        it('edits the share of an owner from the list in place', () => {
            // Given a list of two owners
            const ownerStep = startGlobalOwnerStep().submit(answer(INPUT_IDS.OWNS_MORE_THAN_25_PERCENT, false)).submit(answer(INPUT_IDS.HAS_OTHER_BENEFICIAL_OWNERS, true));
            enterGlobalOwner(ownerStep, 'Anna', '30');
            enterGlobalOwner(ownerStep.submit(answer(INPUT_IDS.HAS_MORE_BENEFICIAL_OWNERS, true)), 'Ben', '30');
            ownerStep.submit(answer(INPUT_IDS.HAS_MORE_BENEFICIAL_OWNERS, false));
            const [firstOwnerID, secondOwnerID] = ownerStep.getListRowIDs();

            // When the user opens the first owner and changes the share to 40%
            ownerStep.pressRow(firstOwnerID);
            expect(ownerStep.getDraft()).toMatchObject({
                ownerOwnershipPercentage: '30',
                ownerBeingModifiedID: firstOwnerID,
            });
            enterGlobalOwner(ownerStep, 'Anna', '40');

            // Then the owner keeps its ID and place, and the flow returns to the list
            expect(ownerStep.getPageID()).toBe(GLOBAL_PAGES.BENEFICIAL_OWNERS_LIST);
            expect(getGlobalOwnerShares(ownerStep.getDraft())).toEqual([
                [firstOwnerID, '40'],
                [secondOwnerID, '30'],
            ]);
        });

        it('removes the user from the owners when the user takes the answer back', () => {
            // Given a draft where the user and another person are owners
            const ownerStep = startGlobalOwnerStep({
                ownsMoreThan25Percent: true,
                hasOtherBeneficialOwners: true,
                globalOwners: [buildGlobalOwner(CURRENT_USER_KEY, '30'), buildGlobalOwner('other', '30')],
            });

            // When the user answers that they own less than 25%
            ownerStep.submit(answer(INPUT_IDS.OWNS_MORE_THAN_25_PERCENT, false));

            // Then the user leaves the list and the other owner stays
            expect(getGlobalOwnerShares(ownerStep.getDraft())).toEqual([['other', '30']]);
            expect(ownerStep.getPageID()).toBe(GLOBAL_PAGES.IS_ANYONE_ELSE_BENEFICIAL_OWNER);
        });

        it('opens the saved details of the user when the user answers "yes" again', () => {
            // Given a draft that already lists the user
            const ownerStep = startGlobalOwnerStep({
                ownsMoreThan25Percent: true,
                hasOtherBeneficialOwners: false,
                globalOwners: [buildGlobalOwner(CURRENT_USER_KEY, '30')],
            });

            // When the user confirms the answer again
            ownerStep.submit(answer(INPUT_IDS.OWNS_MORE_THAN_25_PERCENT, true));

            // Then the buffer holds the listed details, so the user edits them instead of starting over
            expect(ownerStep.getPageID()).toBe(GLOBAL_PAGES.NAME);
            expect(ownerStep.getDraft()).toMatchObject({
                ownerFirstName: CURRENT_USER_KEY,
                ownerOwnershipPercentage: '30',
                ownerBeingModifiedID: CURRENT_USER_KEY,
            });
        });

        test.each<[string, string[], boolean]>([
            ['allows another owner with no owners listed', [], true],
            ['allows another owner at exactly 75%', ['50', '25'], true],
            ['rejects another owner above 75%', ['50', '26'], false],
        ])('%s', (_, shares, expected) => {
            // Given owners with these shares
            const owners = shares.map((share, index) => buildGlobalOwner(`owner-${index}`, share));

            // When the flow asks whether another owner fits
            const canAddMore = canAddMoreGlobalOwners(owners);

            // Then another owner fits only while the shares leave at least 25%
            expect(canAddMore).toBe(expected);
        });

        test.each<[string, string, string[], string | null, boolean]>([
            ['accepts the minimum share', '25', [], null, true],
            ['rejects a share below 25%', '24', [], null, false],
            ['rejects a share above 100%', '101', [], null, false],
            ['rejects a value that is no number', 'abc', [], null, false],
            ['rejects a share that takes the sum above 100%', '30', ['40', '40'], null, false],
            ['accepts the new share of an edited owner, whose old share no longer counts', '60', ['40', '40'], 'owner-0', true],
        ])('%s', (_, value, shares, ownerBeingModifiedID, expected) => {
            // Given owners with these shares and the owner that the pages edit
            const owners = shares.map((share, index) => buildGlobalOwner(`owner-${index}`, share));

            // When the share input is validated
            const isValid = isValidGlobalOwnerShare(value, owners, ownerBeingModifiedID);

            // Then a share must reach 25% and fit in what the other owners leave
            expect(isValid).toBe(expected);
        });
    });
});
