import {canOpen, findStep, getEntryPosition, getHeaderStepNames, getNextStep, getPreviousStep, getResumePosition} from '@pages/SimplifiedBankOnboarding/flow/flowNavigation';
import type {FlowContext} from '@pages/SimplifiedBankOnboarding/flow/types';
import USD_FLOW from '@pages/SimplifiedBankOnboarding/flow/usdFlow';
import type {USDPageName} from '@pages/SimplifiedBankOnboarding/flow/usdFlow';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {ACHData} from '@pages/SimplifiedBankOnboarding/types/onyx';

const {STEP, PAGE_NAMES, BANK_INFO_SUB_PAGES, PERSONAL_INFO_SUB_PAGES, BUSINESS_INFO_SUB_PAGES, BENEFICIAL_OWNERS_SUB_PAGES, COMPLETE_VERIFICATION_SUB_PAGES} = SBO_CONST.USD;

/** A USD account the way the mock server returns it after the bank step */
function buildServer(overrides: Partial<ACHData> = {}): ACHData {
    return {
        bankAccountID: 1001,
        policyID: 'usd',
        state: SBO_CONST.STATE.SETUP,
        country: SBO_CONST.COUNTRY.US,
        currency: SBO_CONST.CURRENCY.USD,
        accountNumber: 'XXXXX1234',
        currentStep: STEP.REQUESTOR,
        ...overrides,
    };
}

function buildContext(server: ACHData | undefined, draft: FlowContext['draft'] = undefined): FlowContext {
    return {currency: SBO_CONST.CURRENCY.USD, server, draft};
}

describe('USD flow definition', () => {
    describe('getResumePosition', () => {
        // The rows are the accounts that show "Continue with setup", and the expected page is what the baseline
        // entry page opened through STEP_TO_PAGE_NAME for the step of the server.
        test.each<[string, ACHData, USDPageName]>([
            ['the requestor step before the identity check', buildServer({currentStep: STEP.REQUESTOR}), PAGE_NAMES.REQUESTOR],
            ['the company step', buildServer({currentStep: STEP.COMPANY, isOnfidoSetupComplete: true}), PAGE_NAMES.COMPANY],
            ['the owners step', buildServer({currentStep: STEP.BENEFICIAL_OWNERS, isOnfidoSetupComplete: true}), PAGE_NAMES.BENEFICIAL_OWNERS],
            ['the agreements step', buildServer({currentStep: STEP.ACH_CONTRACT, isOnfidoSetupComplete: true}), PAGE_NAMES.ACH_CONTRACT],
            ['the documents step', buildServer({currentStep: STEP.KYB_DOCS, isOnfidoSetupComplete: true, requiredKYBDocuments: ['companyTaxID']}), PAGE_NAMES.KYB_DOCS],
            ['a pending validation', buildServer({currentStep: STEP.VALIDATION, isOnfidoSetupComplete: true, state: SBO_CONST.STATE.PENDING}), PAGE_NAMES.VALIDATION],
            ['an account in review', buildServer({currentStep: STEP.VALIDATION, isOnfidoSetupComplete: true, state: SBO_CONST.STATE.VERIFYING}), PAGE_NAMES.VALIDATION],
        ])('resumes %s on the page of the server step', (_, server, expectedPage) => {
            // Given an account that the server moved to a step
            const context = buildContext(server);

            // When the user continues the setup
            const position = getResumePosition(USD_FLOW, context);

            // Then the flow opens the page of that step, like the baseline did
            expect(position.page).toBe(expectedPage);
        });

        it('lets the personal info step pick its own sub page on resume', () => {
            // Given an account on the requestor step, which the baseline opened without a sub page
            const context = buildContext(buildServer({currentStep: STEP.REQUESTOR}));

            // When the user continues the setup
            const position = getResumePosition(USD_FLOW, context);

            // Then no sub page is set, so the step lands on the first sub page that misses a value
            expect(position).toEqual({page: PAGE_NAMES.REQUESTOR, subPage: undefined});
        });

        it('starts on the country page when nothing is known yet', () => {
            // Given a workspace without an account and an empty draft
            const context = buildContext({policyID: 'usd', currentStep: STEP.BANK_ACCOUNT});

            // When the resume position is computed
            const position = getResumePosition(USD_FLOW, context);

            // Then the user starts from the first page, because the country lives only on the client
            expect(position.page).toBe(PAGE_NAMES.COUNTRY);
        });

        it('opens the picked bank variant after the country is confirmed', () => {
            // Given a confirmed country in the draft and the Plaid option picked on the entry point
            const context = buildContext({policyID: 'usd', currentStep: STEP.BANK_ACCOUNT}, {country: SBO_CONST.COUNTRY.US, setupType: SBO_CONST.SETUP_TYPE.PLAID});

            // When the resume position is computed
            const position = getResumePosition(USD_FLOW, context);

            // Then the bank page opens with the Plaid variant
            expect(position).toEqual({page: PAGE_NAMES.BANK_ACCOUNT, subPage: BANK_INFO_SUB_PAGES.PLAID});
        });
    });

    describe('skip rules', () => {
        test.each<[string, Partial<ACHData>, USDPageName, USDPageName | undefined]>([
            ['the identity check while it is not done', {isOnfidoSetupComplete: false}, PAGE_NAMES.REQUESTOR, PAGE_NAMES.VERIFY_IDENTITY],
            ['past the identity check once it is done', {isOnfidoSetupComplete: true}, PAGE_NAMES.REQUESTOR, PAGE_NAMES.COMPANY],
            ['the documents when the server asks for them', {requiredKYBDocuments: ['companyTaxID']}, PAGE_NAMES.ACH_CONTRACT, PAGE_NAMES.KYB_DOCS],
            ['past the documents when the server asks for none', {requiredKYBDocuments: []}, PAGE_NAMES.ACH_CONTRACT, PAGE_NAMES.VALIDATION],
            ['out of the flow after the last page', {}, PAGE_NAMES.VALIDATION, undefined],
        ])('goes forward to %s', (_, overrides, currentPage, expectedPage) => {
            // Given an account whose data decides which optional pages exist
            const context = buildContext(buildServer(overrides));

            // When the user submits the current page
            const nextStep = getNextStep(USD_FLOW, context, currentPage);

            // Then the next page is the same one that the hand-written skip rules of the baseline picked
            expect(nextStep?.id).toBe(expectedPage);
        });

        test.each<[string, Partial<ACHData>, USDPageName, USDPageName | undefined]>([
            ['the identity check while it is not done', {isOnfidoSetupComplete: false}, PAGE_NAMES.COMPANY, PAGE_NAMES.VERIFY_IDENTITY],
            ['past the identity check once it is done', {isOnfidoSetupComplete: true}, PAGE_NAMES.COMPANY, PAGE_NAMES.REQUESTOR],
            ['the documents when the server asks for them', {requiredKYBDocuments: ['companyTaxID']}, PAGE_NAMES.VALIDATION, PAGE_NAMES.KYB_DOCS],
            ['past the documents when the server asks for none', {}, PAGE_NAMES.VALIDATION, PAGE_NAMES.ACH_CONTRACT],
            ['out of the flow from the first page', {}, PAGE_NAMES.COUNTRY, undefined],
        ])('goes back to %s', (_, overrides, currentPage, expectedPage) => {
            // Given an account whose data decides which optional pages exist
            const context = buildContext(buildServer(overrides));

            // When the user presses the back button
            const previousStep = getPreviousStep(USD_FLOW, context, currentPage);

            // Then the previous page is the same one that the baseline picked
            expect(previousStep?.id).toBe(expectedPage);
        });

        test.each([
            [SBO_CONST.STATE.PENDING, true],
            [SBO_CONST.STATE.VERIFYING, false],
        ])('leaves the flow from the validation page of a %s account: %s', (state, expectedLeavesFlow) => {
            // Given an account on the validation page
            const context = buildContext(buildServer({currentStep: STEP.VALIDATION, state}));

            // When the back button decides where to go
            const leavesFlow = findStep(USD_FLOW, PAGE_NAMES.VALIDATION).leavesFlowOnBack?.(context);

            // Then only a pending account leaves, because the entry page would send it straight back
            expect(leavesFlow).toBe(expectedLeavesFlow);
        });
    });

    describe('entry sub pages', () => {
        test.each<[string, USDPageName, 'forward' | 'backward', string | undefined]>([
            ['personal info from the previous step', PAGE_NAMES.REQUESTOR, 'forward', PERSONAL_INFO_SUB_PAGES.FULL_NAME],
            ['personal info from the next step', PAGE_NAMES.REQUESTOR, 'backward', PERSONAL_INFO_SUB_PAGES.CONFIRMATION],
            ['business info from the previous step', PAGE_NAMES.COMPANY, 'forward', BUSINESS_INFO_SUB_PAGES.NAME],
            ['business info from the next step', PAGE_NAMES.COMPANY, 'backward', BUSINESS_INFO_SUB_PAGES.CONFIRMATION],
            ['the owners from the previous step', PAGE_NAMES.BENEFICIAL_OWNERS, 'forward', BENEFICIAL_OWNERS_SUB_PAGES.IS_USER_UBO],
            ['the owners from the next step', PAGE_NAMES.BENEFICIAL_OWNERS, 'backward', undefined],
            ['the agreements from the next step', PAGE_NAMES.ACH_CONTRACT, 'backward', COMPLETE_VERIFICATION_SUB_PAGES.CONFIRM_AGREEMENTS],
        ])('opens %s on the same sub page as the baseline', (_, pageName, direction, expectedSubPage) => {
            // Given an account in the middle of the setup
            const context = buildContext(buildServer());

            // When the user arrives at the step
            const position = getEntryPosition(findStep(USD_FLOW, pageName), context, direction);

            // Then the sub page is the first or the last one of the baseline `pages` array
            expect(position.subPage).toBe(expectedSubPage);
        });

        test.each<[string, ACHData, FlowContext['draft'], string]>([
            ['the manual variant once the server holds a bank account', buildServer(), {setupType: SBO_CONST.SETUP_TYPE.PLAID}, BANK_INFO_SUB_PAGES.MANUAL],
            ['the picked manual variant', {policyID: 'usd'}, {setupType: SBO_CONST.SETUP_TYPE.MANUAL}, BANK_INFO_SUB_PAGES.MANUAL],
            ['Plaid when nothing was picked', {policyID: 'usd'}, undefined, BANK_INFO_SUB_PAGES.PLAID],
        ])('opens the bank page on %s', (_, server, draft, expectedSubPage) => {
            // Given the bank account of the server and the option that the user picked on the entry point
            const context = buildContext(server, draft);

            // When the user arrives at the bank page
            const position = getEntryPosition(findStep(USD_FLOW, PAGE_NAMES.BANK_ACCOUNT), context, 'forward');

            // Then the variant comes from the draft until the server has an account
            expect(position.subPage).toBe(expectedSubPage);
        });
    });

    describe('header', () => {
        it('keeps seven positions whichever optional pages apply', () => {
            // Given an account that skips the identity check and asks for documents
            const context = buildContext(buildServer({isOnfidoSetupComplete: true, requiredKYBDocuments: ['companyTaxID']}));

            // When the step counter is built
            const stepNames = getHeaderStepNames(USD_FLOW, context);

            // Then it matches the baseline STEP_NAMES, because the identity check shares a position and the documents page has none
            expect(stepNames).toEqual(['1', '2', '3', '4', '5', '6', '7']);
            expect(findStep(USD_FLOW, PAGE_NAMES.VERIFY_IDENTITY).headerPosition).toBe(findStep(USD_FLOW, PAGE_NAMES.REQUESTOR).headerPosition);
            expect(findStep(USD_FLOW, PAGE_NAMES.KYB_DOCS).headerPosition).toBeUndefined();
        });
    });

    describe('canOpen', () => {
        it('allows the pages up to the resume position only', () => {
            // Given an account on the company step
            const context = buildContext(buildServer({currentStep: STEP.COMPANY, isOnfidoSetupComplete: true}));

            // When the URL guard checks the pages around it
            const results = [PAGE_NAMES.REQUESTOR, PAGE_NAMES.COMPANY, PAGE_NAMES.BENEFICIAL_OWNERS, PAGE_NAMES.VERIFY_IDENTITY].map((pageName) => canOpen(USD_FLOW, context, pageName));

            // Then the done pages and the current one open, a later page does not, and a skipped page does not either
            expect(results).toEqual([true, true, false, false]);
        });
    });
});
