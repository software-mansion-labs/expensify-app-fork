import {findStep, getEntryPosition, getHeaderStepNames, getNextStep, getPreviousStep, getResumePosition} from '@pages/SimplifiedBankOnboarding/flow/flowNavigation';
import NON_USD_FLOW from '@pages/SimplifiedBankOnboarding/flow/nonUSDFlow';
import type {NonUSDPageName} from '@pages/SimplifiedBankOnboarding/flow/nonUSDFlow';
import type {FlowContext} from '@pages/SimplifiedBankOnboarding/flow/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';
import type {BankAccountState, CorpayData} from '@pages/SimplifiedBankOnboarding/types/onyx';

const {PAGE_NAMES, BANK_INFO_SUB_PAGES, BUSINESS_INFO_SUB_PAGES, BENEFICIAL_OWNER_INFO_SUB_PAGES, SIGNER_INFO_SUB_PAGES} = SBO_CONST.NON_USD;
const {EUR, AUD} = SBO_CONST.CURRENCY;

const SIGNED_AGREEMENTS = {authorizedToBindClientToAgreement: true, agreeToTermsAndConditions: true, consentToPrivacyNotice: true} satisfies Partial<OnboardingForm>;
const UPLOADED_STATEMENT: Partial<OnboardingForm> = {bankStatement: [{name: 'statement.pdf'}]};

type ContextOptions = {
    currency?: string;
    corpay?: CorpayData;
    state?: BankAccountState;
    draft?: Partial<OnboardingForm>;
};

/** A NonUSD account the way the mock server returns it after the bank step */
function buildContext({currency = EUR, corpay = {}, state = SBO_CONST.STATE.SETUP, draft}: ContextOptions = {}): FlowContext {
    return {
        currency,
        server: {
            policyID: 'non-usd',
            bankAccountID: 2001,
            created: '2026-11-19',
            country: currency === AUD ? SBO_CONST.COUNTRY.AU : SBO_CONST.COUNTRY.DE,
            currency,
            state,
            corpay,
        },
        draft,
    };
}

const OWNERS_ANSWERED: CorpayData = {companyName: 'Acme', anyIndividualOwn25PercentOrMore: false};

describe('NonUSD flow definition', () => {
    describe('getResumePosition', () => {
        // The rows are the accounts that the mock server can hold, and the expected position is what the baseline
        // `getStartPageForContinueSetup` returned for them.
        test.each<[string, FlowContext, NonUSDPageName, string | undefined]>([
            ['a created account without a company', buildContext(), PAGE_NAMES.BUSINESS_INFO, BUSINESS_INFO_SUB_PAGES.NAME],
            ['a saved company', buildContext({corpay: {companyName: 'Acme'}}), PAGE_NAMES.BENEFICIAL_OWNER_INFO, BENEFICIAL_OWNER_INFO_SUB_PAGES.IS_USER_BENEFICIAL_OWNER],
            ['answered owners', buildContext({corpay: OWNERS_ANSWERED}), PAGE_NAMES.SIGNER_INFO, SIGNER_INFO_SUB_PAGES.IS_DIRECTOR],
            ['an invited EUR signer', buildContext({corpay: {...OWNERS_ANSWERED, signerEmail: 'director@example.com'}}), PAGE_NAMES.SIGNER_INFO, SIGNER_INFO_SUB_PAGES.HANG_TIGHT],
            ['a known EUR signer', buildContext({corpay: {...OWNERS_ANSWERED, signerFullName: 'Jane Doe'}}), PAGE_NAMES.AGREEMENTS, undefined],
            [
                'one known AUD director and an invited second one',
                buildContext({currency: AUD, corpay: {...OWNERS_ANSWERED, signerFullName: 'Jane Doe', secondSignerEmail: 'second@example.com'}}),
                PAGE_NAMES.SIGNER_INFO,
                SIGNER_INFO_SUB_PAGES.HANG_TIGHT,
            ],
            [
                'two known AUD directors',
                buildContext({currency: AUD, corpay: {...OWNERS_ANSWERED, signerFullName: 'Jane Doe', secondSignerFullName: 'John Roe'}}),
                PAGE_NAMES.AGREEMENTS,
                undefined,
            ],
            [
                'checked AUD agreements with a statement',
                buildContext({
                    currency: AUD,
                    corpay: {...OWNERS_ANSWERED, signerFullName: 'Jane Doe', secondSignerFullName: 'John Roe'},
                    draft: {...SIGNED_AGREEMENTS, ...UPLOADED_STATEMENT},
                }),
                PAGE_NAMES.DOCUSIGN,
                undefined,
            ],
            [
                'checked AUD agreements without a statement',
                buildContext({currency: AUD, corpay: {...OWNERS_ANSWERED, signerFullName: 'Jane Doe', secondSignerFullName: 'John Roe'}, draft: SIGNED_AGREEMENTS}),
                PAGE_NAMES.AGREEMENTS,
                undefined,
            ],
            [
                'checked EUR agreements with a statement',
                buildContext({corpay: {...OWNERS_ANSWERED, signerFullName: 'Jane Doe'}, draft: {...SIGNED_AGREEMENTS, ...UPLOADED_STATEMENT}}),
                PAGE_NAMES.AGREEMENTS,
                undefined,
            ],
            [
                'an EUR account in review',
                buildContext({state: SBO_CONST.STATE.VERIFYING, corpay: {...OWNERS_ANSWERED, signerFullName: 'Jane Doe', ...SIGNED_AGREEMENTS}}),
                PAGE_NAMES.FINISH,
                undefined,
            ],
            [
                'an AUD account in review',
                buildContext({
                    currency: AUD,
                    state: SBO_CONST.STATE.VERIFYING,
                    corpay: {...OWNERS_ANSWERED, signerFullName: 'Jane Doe', secondSignerFullName: 'John Roe', ...SIGNED_AGREEMENTS},
                }),
                PAGE_NAMES.FINISH,
                undefined,
            ],
            [
                'a confirmed country without an account',
                {currency: EUR, server: {policyID: 'non-usd'}, draft: {country: SBO_CONST.COUNTRY.DE}},
                PAGE_NAMES.BANK_INFO,
                BANK_INFO_SUB_PAGES.BANK_ACCOUNT_DETAILS,
            ],
        ])('resumes %s like the baseline', (_, context, expectedPage, expectedSubPage) => {
            // Given an account in one of the states that the mock server can hold

            // When the user continues the setup
            const position = getResumePosition(NON_USD_FLOW, context);

            // Then the flow opens the position that the baseline `getStartPageForContinueSetup` returned
            expect(position).toEqual({page: expectedPage, subPage: expectedSubPage});
        });
    });

    describe('skip rules', () => {
        test.each([
            [AUD, PAGE_NAMES.DOCUSIGN],
            [EUR, PAGE_NAMES.FINISH],
        ])('goes forward from the agreements of a %s account to %s', (currency, expectedPage) => {
            // Given an account whose currency decides if the docusign page exists
            const context = buildContext({currency});

            // When the user submits the agreements
            const nextStep = getNextStep(NON_USD_FLOW, context, PAGE_NAMES.AGREEMENTS);

            // Then only an AUD account goes through docusign
            expect(nextStep?.id).toBe(expectedPage);
        });

        test.each([
            [AUD, PAGE_NAMES.DOCUSIGN],
            [EUR, PAGE_NAMES.AGREEMENTS],
        ])('goes back from the finish page of a %s account to %s', (currency, expectedPage) => {
            // Given an account whose currency decides if the docusign page exists
            const context = buildContext({currency});

            // When the user presses the back button on the last page
            const previousStep = getPreviousStep(NON_USD_FLOW, context, PAGE_NAMES.FINISH);

            // Then the skipped docusign page is not opened
            expect(previousStep?.id).toBe(expectedPage);
        });
    });

    describe('entry sub pages', () => {
        test.each([
            [AUD, SIGNER_INFO_SUB_PAGES.HANG_TIGHT],
            [EUR, SIGNER_INFO_SUB_PAGES.CONFIRMATION],
        ])('opens the signer step of a %s account from the next step on %s', (currency, expectedSubPage) => {
            // Given an account that went past the signer step
            const context = buildContext({currency});

            // When the user goes back to the signer step
            const position = getEntryPosition(findStep(NON_USD_FLOW, PAGE_NAMES.SIGNER_INFO), context, 'backward');

            // Then the last sub page of the baseline opens, which waits for the second director on AUD
            expect(position.subPage).toBe(expectedSubPage);
        });

        test.each<[NonUSDPageName, string, string]>([
            [PAGE_NAMES.BANK_INFO, BANK_INFO_SUB_PAGES.BANK_ACCOUNT_DETAILS, BANK_INFO_SUB_PAGES.CONFIRMATION],
            [PAGE_NAMES.BUSINESS_INFO, BUSINESS_INFO_SUB_PAGES.NAME, BUSINESS_INFO_SUB_PAGES.CONFIRMATION],
            [PAGE_NAMES.BENEFICIAL_OWNER_INFO, BENEFICIAL_OWNER_INFO_SUB_PAGES.IS_USER_BENEFICIAL_OWNER, BENEFICIAL_OWNER_INFO_SUB_PAGES.BENEFICIAL_OWNERS_LIST],
        ])('opens %s on its first sub page forward and its last one backward', (pageName, expectedForward, expectedBackward) => {
            // Given an account in the middle of the setup
            const context = buildContext();
            const step = findStep(NON_USD_FLOW, pageName);

            // When the user arrives at the step from both sides
            const forwardPosition = getEntryPosition(step, context, 'forward');
            const backwardPosition = getEntryPosition(step, context, 'backward');

            // Then the sub pages are the first and the last ones of the baseline `pages` array
            expect(forwardPosition.subPage).toBe(expectedForward);
            expect(backwardPosition.subPage).toBe(expectedBackward);
        });
    });

    describe('header', () => {
        test.each([
            [EUR, 6],
            [AUD, 7],
        ])('shows the step counter of a %s account with %s positions', (currency, expectedLength) => {
            // Given an account whose currency decides if the docusign page exists
            const context = buildContext({currency});

            // When the step counter is built
            const stepNames = getHeaderStepNames(NON_USD_FLOW, context);

            // Then it matches the baseline STEP_NAMES and DOCUSIGN_REQUIRED_STEP_NAMES
            expect(stepNames).toHaveLength(expectedLength);
        });
    });
});
