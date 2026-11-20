import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {FlowPosition} from '@pages/SimplifiedBankOnboarding/flow/position';
import {findStep} from '@pages/SimplifiedBankOnboarding/flow/position';
import isPositionReachable from '@pages/SimplifiedBankOnboarding/flow/reachability';
import getResumePosition from '@pages/SimplifiedBankOnboarding/flow/resume';
import {getNextStepPosition, getPreviousPosition} from '@pages/SimplifiedBankOnboarding/flow/transitions';
import buildUSDPlan from '@pages/SimplifiedBankOnboarding/formConfig/buildUSDPlan';
import type {FlowPlan, PageID, StepID} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {buildClientACHData} from '@pages/SimplifiedBankOnboarding/mockBackend/handlers/buildResponse';
import usdWriteHandlers from '@pages/SimplifiedBankOnboarding/mockBackend/handlers/usdWriteHandlers';
import {PLAID_BANK_ACCOUNTS} from '@pages/SimplifiedBankOnboarding/mockBackend/serverCatalog';
import type {MockServerDatabase, MockServerResponse, ServerBankAccount} from '@pages/SimplifiedBankOnboarding/mockBackend/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';
import type {OnboardingAccount, SetupType} from '@pages/SimplifiedBankOnboarding/types/onyx';

import CONST from '@src/CONST';

import type {TupleToUnion} from 'type-fest';

const {PAGE_NAMES, STEP, COUNTRY_SUB_PAGES, BANK_INFO_SUB_PAGES, PERSONAL_INFO_SUB_PAGES, VERIFY_IDENTITY_SUB_PAGES, BUSINESS_INFO_SUB_PAGES, BENEFICIAL_OWNERS_SUB_PAGES} = SBO_CONST.USD;
const {COMPLETE_VERIFICATION_SUB_PAGES, KYB_DOCUMENTS_SUB_PAGES, VALIDATION_SUB_PAGES} = SBO_CONST.USD;
const {MANUAL, PLAID} = SBO_CONST.SETUP_TYPE;

const POLICY_ID = 'usd';
/** Returns the key with its parameters, so a validator error is never an empty string that would make an invalid form look complete */
const translate: LocalizedTranslate = (path, ...parameters) => [path, ...parameters.map(String)].join(' ');

/** The stages of a USD setup in the order the mock server accepts them */
const SERVER_STAGES = ['bankAccount', 'personalInfo', 'identity', 'company', 'owners', 'agreements', 'documents', 'validated'] as const;
type WriteStage = TupleToUnion<typeof SERVER_STAGES>;
type ServerStage = 'new' | WriteStage;

type ServerOptions = {
    setupType?: SetupType;
    shouldRequireKYBDocuments?: boolean;
};

/** The seed of the mock server reduced to the USD workspace */
function buildDatabase(shouldRequireKYBDocuments: boolean): MockServerDatabase {
    return {
        user: {validated: true},
        workspaces: {
            [POLICY_ID]: {
                id: POLICY_ID,
                name: 'Acme US',
                outputCurrency: SBO_CONST.CURRENCY.USD,
                role: SBO_CONST.WORKSPACE_ROLE.ADMIN,
            },
        },
        bankAccounts: {},
        lastBankAccountID: 1000,
        settings: {
            latencyMs: 0,
            failureMode: SBO_CONST.MOCK.FAILURE_MODE.NONE,
            isThrottled: false,
            shouldRequireKYBDocuments,
        },
        requestLog: [],
    };
}

/** The catalogs of the mock server are fixed lists, so a test that needs an entry fails loudly when one is missing */
function getFirst<TItem>(items: TItem[]): TItem {
    const item = items.at(0);
    if (item === undefined) {
        throw new Error('The catalog of the mock server is empty');
    }
    return item;
}

function expectSuccess(response: MockServerResponse) {
    if (response.jsonCode === SBO_CONST.MOCK.JSON_CODE.SUCCESS) {
        return;
    }
    throw new Error(`The mock server rejected a request of the test setup: ${response.message ?? ''}`);
}

function getRow(database: MockServerDatabase): ServerBankAccount {
    const row = database.bankAccounts[POLICY_ID];
    if (!row) {
        throw new Error('The mock server has no bank account for the workspace');
    }
    return row;
}

function getBankAccountParams(database: MockServerDatabase) {
    return {
        policyID: POLICY_ID,
        bankAccountID: getRow(database).bankAccountID ?? CONST.DEFAULT_NUMBER_ID,
    };
}

/** Sends the request of one stage through the handler of the mock server, which moves `currentStep` the way the real backend does */
function runStage(database: MockServerDatabase, stage: WriteStage, setupType: SetupType) {
    switch (stage) {
        case 'bankAccount':
            expectSuccess(
                setupType === PLAID
                    ? usdWriteHandlers[WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_WITH_PLAID](
                          {
                              policyID: POLICY_ID,
                              plaidAccountID: getFirst(PLAID_BANK_ACCOUNTS).plaidAccountID,
                          },
                          database,
                      )
                    : usdWriteHandlers[WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_MANUALLY](
                          {
                              policyID: POLICY_ID,
                              routingNumber: '011401533',
                              accountNumber: '1234567890',
                          },
                          database,
                      ),
            );
            return;
        case 'personalInfo':
            expectSuccess(
                usdWriteHandlers[WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION](
                    {
                        ...getBankAccountParams(database),
                        firstName: 'Jane',
                        lastName: 'Doe',
                        dob: '1990-01-01',
                        ssnLast4: '1234',
                        confirm: true,
                    },
                    database,
                ),
            );
            return;
        case 'identity':
            expectSuccess(usdWriteHandlers[WRITE_COMMANDS.VERIFY_IDENTITY]({...getBankAccountParams(database), onfidoData: 'mock-onfido-data'}, database));
            return;
        case 'company':
            expectSuccess(
                usdWriteHandlers[WRITE_COMMANDS.UPDATE_COMPANY_INFORMATION](
                    {
                        ...getBankAccountParams(database),
                        companyName: 'Acme',
                        companyTaxID: '123456789',
                        incorporationType: SBO_CONST.USD.INCORPORATION_TYPES.LLC,
                    },
                    database,
                ),
            );
            return;
        case 'owners':
            expectSuccess(
                usdWriteHandlers[WRITE_COMMANDS.UPDATE_BENEFICIAL_OWNERS](
                    {
                        ...getBankAccountParams(database),
                        ownsMoreThan25Percent: false,
                        beneficialOwners: '[]',
                        beneficialOwnerKeys: [],
                    },
                    database,
                ),
            );
            return;
        case 'agreements':
            expectSuccess(
                usdWriteHandlers[WRITE_COMMANDS.ACCEPT_ACH_CONTRACT](
                    {
                        ...getBankAccountParams(database),
                        isAuthorizedToUseBankAccount: true,
                        certifyTrueInformation: true,
                        acceptTermsAndConditions: true,
                    },
                    database,
                ),
            );
            return;
        case 'documents':
            // The server only asks for documents when its checks fail, so a setup without that request has nothing to upload
            if (database.settings.shouldRequireKYBDocuments) {
                expectSuccess(
                    usdWriteHandlers[WRITE_COMMANDS.UPLOAD_KYB_DOCUMENTS](
                        {
                            ...getBankAccountParams(database),
                            documentNames: ['tax-id.pdf', 'address.pdf'],
                        },
                        database,
                    ),
                );
            }
            return;
        case 'validated':
            // A Plaid account waits for the review instead of the test deposits, which a reviewer finishes outside the flow
            if (setupType === MANUAL) {
                expectSuccess(
                    usdWriteHandlers[WRITE_COMMANDS.VALIDATE_BANK_ACCOUNT](
                        {
                            ...getBankAccountParams(database),
                            validateCode: SBO_CONST.MOCK.MICRO_DEPOSIT_AMOUNTS.join(','),
                        },
                        database,
                    ),
                );
            }
            return;
        default:
            throw new Error('Unknown stage');
    }
}

/** What the open-page read returns: the row of the workspace without the server-only columns, or the empty account of a new setup */
function readAccount(database: MockServerDatabase): OnboardingAccount {
    const row = database.bankAccounts[POLICY_ID];
    if (!row) {
        return {
            achData: {
                policyID: POLICY_ID,
                currentStep: STEP.BANK_ACCOUNT,
                subStep: '',
            },
        };
    }
    return {achData: buildClientACHData(row)};
}

function createServer({setupType = MANUAL, shouldRequireKYBDocuments = false}: ServerOptions = {}) {
    const database = buildDatabase(shouldRequireKYBDocuments);
    return {
        database,
        advanceTo(stage: ServerStage) {
            if (stage === 'new') {
                return this;
            }
            for (const serverStage of SERVER_STAGES.slice(0, SERVER_STAGES.indexOf(stage) + 1)) {
                runStage(database, serverStage, setupType);
            }
            return this;
        },
        run(stage: WriteStage) {
            runStage(database, stage, setupType);
            return this;
        },
        readAccount: () => readAccount(database),
    };
}

function buildPlan(account: OnboardingAccount, draft?: OnboardingDraft): FlowPlan {
    return buildUSDPlan(draft, account, {translate, policyID: POLICY_ID});
}

function position(stepID: StepID, pageID: PageID): FlowPosition {
    return {stepID, pageID, isEditing: false};
}

function getStepIDs(plan: FlowPlan): StepID[] {
    return plan.steps.map((step) => step.id);
}

/** The draft that the entry page and the country step write before the first request */
const STARTED_DRAFT: OnboardingDraft = {
    country: SBO_CONST.COUNTRY.US,
    setupType: MANUAL,
};

describe('buildUSDPlan', () => {
    describe('resume position', () => {
        test.each<[string, ServerStage, ServerOptions, OnboardingDraft | undefined, FlowPosition]>([
            ['a new setup with an empty draft on the country page', 'new', {}, undefined, position(PAGE_NAMES.COUNTRY, COUNTRY_SUB_PAGES.CONFIRM_CURRENCY)],
            ['a new setup with only the setup type on the country page', 'new', {}, {setupType: PLAID}, position(PAGE_NAMES.COUNTRY, COUNTRY_SUB_PAGES.CONFIRM_CURRENCY)],
            [
                'a confirmed country with the Plaid option on the Plaid page',
                'new',
                {},
                {country: SBO_CONST.COUNTRY.US, setupType: PLAID},
                position(PAGE_NAMES.BANK_ACCOUNT, BANK_INFO_SUB_PAGES.PLAID),
            ],
            ['a confirmed country with the manual option on the manual form', 'new', {}, STARTED_DRAFT, position(PAGE_NAMES.BANK_ACCOUNT, BANK_INFO_SUB_PAGES.MANUAL)],
            ['a connected bank account on the first personal info page', 'bankAccount', {}, STARTED_DRAFT, position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.FULL_NAME)],
            ['a connected bank account on another device on the first personal info page', 'bankAccount', {}, undefined, position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.FULL_NAME)],
            [
                'a name typed but not sent on the date of birth page',
                'bankAccount',
                {},
                {...STARTED_DRAFT, firstName: 'Jane', lastName: 'Doe'},
                position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.DATE_OF_BIRTH),
            ],
            [
                'confirmed personal info before the identity check on the identity check',
                'personalInfo',
                {},
                STARTED_DRAFT,
                position(PAGE_NAMES.VERIFY_IDENTITY, VERIFY_IDENTITY_SUB_PAGES.IDENTITY_CHECK),
            ],
            ['a passed identity check on the business name', 'identity', {}, STARTED_DRAFT, position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.NAME)],
            ['a saved company on the first owner question', 'company', {}, STARTED_DRAFT, position(PAGE_NAMES.BENEFICIAL_OWNERS, BENEFICIAL_OWNERS_SUB_PAGES.IS_USER_UBO)],
            ['saved owners on the agreements', 'owners', {}, STARTED_DRAFT, position(PAGE_NAMES.ACH_CONTRACT, COMPLETE_VERIFICATION_SUB_PAGES.CONFIRM_AGREEMENTS)],
            ['a manual account waiting for the test deposits on the validation page', 'agreements', {}, STARTED_DRAFT, position(PAGE_NAMES.VALIDATION, VALIDATION_SUB_PAGES.VALIDATE)],
            ['a Plaid account in review on the validation page', 'agreements', {setupType: PLAID}, {setupType: PLAID}, position(PAGE_NAMES.VALIDATION, VALIDATION_SUB_PAGES.VALIDATE)],
            ['required documents on the documents page', 'agreements', {shouldRequireKYBDocuments: true}, STARTED_DRAFT, position(PAGE_NAMES.KYB_DOCS, KYB_DOCUMENTS_SUB_PAGES.UPLOAD)],
            ['uploaded documents on the validation page', 'documents', {shouldRequireKYBDocuments: true}, STARTED_DRAFT, position(PAGE_NAMES.VALIDATION, VALIDATION_SUB_PAGES.VALIDATE)],
            ['a validated account on the validation page, the last page of the plan', 'validated', {}, STARTED_DRAFT, position(PAGE_NAMES.VALIDATION, VALIDATION_SUB_PAGES.VALIDATE)],
        ])('resumes %s', (_, stage, serverOptions, draft, expectedPosition) => {
            // Given the account that the mock server returns after the setup reached a stage, and the draft of the client
            const account = createServer(serverOptions).advanceTo(stage).readAccount();

            // When the flow opens without a position in the URL
            const plan = buildPlan(account, draft);
            const resumePosition = getResumePosition(plan);

            // Then it opens the first page that still needs an answer, and that page is reachable
            expect(resumePosition).toEqual(expectedPosition);
            expect(isPositionReachable(plan, resumePosition)).toBe(true);
        });
    });

    describe('identity check', () => {
        it('keeps the identity check reachable after the personal info is confirmed, while the server still holds the requestor step', () => {
            // Given personal info that the server saved, while Onfido has not passed yet
            const server = createServer().advanceTo('personalInfo');
            const account = server.readAccount();

            // When the plan is built
            const plan = buildPlan(account, STARTED_DRAFT);
            const resumePosition = getResumePosition(plan);

            // Then the server did not move on, the plan still resumes on the identity check, and the guard lets the user open it
            expect(account.achData?.currentStep).toBe(STEP.REQUESTOR);
            expect(resumePosition).toEqual(position(PAGE_NAMES.VERIFY_IDENTITY, VERIFY_IDENTITY_SUB_PAGES.IDENTITY_CHECK));
            expect(isPositionReachable(plan, position(PAGE_NAMES.VERIFY_IDENTITY, VERIFY_IDENTITY_SUB_PAGES.IDENTITY_CHECK))).toBe(true);
            expect(isPositionReachable(plan, position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.CONFIRMATION))).toBe(true);
            expect(isPositionReachable(plan, position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.NAME))).toBe(false);
        });

        test.each<[string, ServerStage, boolean]>([
            ['holds the identity check while Onfido has not passed', 'personalInfo', true],
            ['drops the identity check once Onfido passed', 'identity', false],
        ])('%s', (_, stage, hasIdentityStep) => {
            // Given an account before or after the identity check
            const account = createServer().advanceTo(stage).readAccount();

            // When the plan is built
            const stepIDs = getStepIDs(buildPlan(account, STARTED_DRAFT));

            // Then the identity step is in the plan only while the server still asks for it, so no move has to skip it
            expect(stepIDs.includes(PAGE_NAMES.VERIFY_IDENTITY)).toBe(hasIdentityStep);
        });

        test.each<[string, ServerStage, FlowPosition]>([
            ['the identity check while it is pending', 'personalInfo', position(PAGE_NAMES.VERIFY_IDENTITY, VERIFY_IDENTITY_SUB_PAGES.IDENTITY_CHECK)],
            ['the business step once the check passed', 'identity', position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.NAME)],
        ])('goes forward from the personal info step to %s', (_, stage, expectedPosition) => {
            // Given an account before or after the identity check
            const plan = buildPlan(createServer().advanceTo(stage).readAccount(), STARTED_DRAFT);

            // When the personal info step is done
            const nextPosition = getNextStepPosition(plan, plan, PAGE_NAMES.REQUESTOR);

            // Then the identity check comes next only while it is pending
            expect(nextPosition).toEqual(expectedPosition);
        });

        test.each<[string, ServerStage, FlowPosition]>([
            ['the identity check while it is pending', 'personalInfo', position(PAGE_NAMES.VERIFY_IDENTITY, VERIFY_IDENTITY_SUB_PAGES.IDENTITY_CHECK)],
            ['the personal info confirmation once the check passed', 'identity', position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.CONFIRMATION)],
        ])('goes back from the business step to %s', (_, stage, expectedPosition) => {
            // Given an account before or after the identity check
            const plan = buildPlan(createServer().advanceTo(stage).readAccount(), STARTED_DRAFT);

            // When the user presses Back on the first business page
            const previousPosition = getPreviousPosition(plan, position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.NAME));

            // Then a passed identity check is not opened again
            expect(previousPosition).toEqual(expectedPosition);
        });

        it('opens the business step after the identity request removed its own step from the plan', () => {
            // Given the plan before the identity request and the plan after the server accepted the check
            const server = createServer().advanceTo('personalInfo');
            const previousPlan = buildPlan(server.readAccount(), STARTED_DRAFT);
            const plan = buildPlan(server.run('identity').readAccount(), STARTED_DRAFT);

            // When the identity step is done
            const nextPosition = getNextStepPosition(plan, previousPlan, PAGE_NAMES.VERIFY_IDENTITY);

            // Then the flow continues on the business step instead of starting over
            expect(nextPosition).toEqual(position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.NAME));
        });

        it('counts the identity check as a part of the personal info position of the header', () => {
            // Given an account before the identity check
            const plan = buildPlan(createServer().advanceTo('personalInfo').readAccount(), STARTED_DRAFT);

            // When the counter positions of both steps are read
            const personalInfoIndex = findStep(plan, PAGE_NAMES.REQUESTOR)?.counterIndex;
            const identityIndex = findStep(plan, PAGE_NAMES.VERIFY_IDENTITY)?.counterIndex;

            // Then they share one position, so the counter keeps the seven positions of STEP_NAMES
            expect(identityIndex).toBe(personalInfoIndex);
        });
    });

    describe('documents step', () => {
        test.each<[string, boolean, FlowPosition]>([
            ['the documents page when the server asks for documents', true, position(PAGE_NAMES.KYB_DOCS, KYB_DOCUMENTS_SUB_PAGES.UPLOAD)],
            ['the validation page when it asks for none', false, position(PAGE_NAMES.VALIDATION, VALIDATION_SUB_PAGES.VALIDATE)],
        ])('goes forward from the agreements to %s', (_, shouldRequireKYBDocuments, expectedPosition) => {
            // Given the plan before the agreements request and the plan after the server answered it
            const server = createServer({shouldRequireKYBDocuments}).advanceTo('owners');
            const previousPlan = buildPlan(server.readAccount(), STARTED_DRAFT);
            const plan = buildPlan(server.run('agreements').readAccount(), STARTED_DRAFT);

            // When the agreements step is done
            const nextPosition = getNextStepPosition(plan, previousPlan, PAGE_NAMES.ACH_CONTRACT);

            // Then the step that the request added to the plan opens, or the validation when it added none
            expect(nextPosition).toEqual(expectedPosition);
        });

        test.each<[string, ServerStage, FlowPosition]>([
            ['the documents page while the server asks for documents', 'agreements', position(PAGE_NAMES.KYB_DOCS, KYB_DOCUMENTS_SUB_PAGES.UPLOAD)],
            ['the agreements once the documents are uploaded', 'documents', position(PAGE_NAMES.ACH_CONTRACT, COMPLETE_VERIFICATION_SUB_PAGES.CONFIRM_AGREEMENTS)],
        ])('goes back from the validation to %s', (_, stage, expectedPosition) => {
            // Given an account with required documents before or after the upload
            const plan = buildPlan(createServer({shouldRequireKYBDocuments: true}).advanceTo(stage).readAccount(), STARTED_DRAFT);

            // When the user presses Back on the validation page
            const previousPosition = getPreviousPosition(plan, position(PAGE_NAMES.VALIDATION, VALIDATION_SUB_PAGES.VALIDATE));

            // Then the documents page is in the way only while the server still asks for it
            expect(previousPosition).toEqual(expectedPosition);
        });

        it('keeps the documents step out of the header counter', () => {
            // Given an account with required documents
            const plan = buildPlan(createServer({shouldRequireKYBDocuments: true}).advanceTo('agreements').readAccount(), STARTED_DRAFT);

            // When the counter position of the documents step is read
            const counterIndex = findStep(plan, PAGE_NAMES.KYB_DOCS)?.counterIndex;

            // Then it has none, so the counter keeps the seven positions of STEP_NAMES
            expect(counterIndex).toBeUndefined();
        });
    });

    describe('validation step', () => {
        test.each<[string, SetupType, boolean]>([
            ['leaves the flow on Back while the manual account waits for the test deposits', MANUAL, true],
            ['goes back through the flow while the Plaid account is in review', PLAID, false],
        ])('%s', (_, setupType, expectedShouldExit) => {
            // Given an account that the agreements request moved to the validation step
            const plan = buildPlan(createServer({setupType}).advanceTo('agreements').readAccount(), {setupType});

            // When the validation page is read from the plan
            const validationPage = findStep(plan, PAGE_NAMES.VALIDATION)?.pages.at(0);

            // Then only a pending account leaves, because the entry page would send it straight back to this page
            expect(validationPage?.shouldExitOnBack).toBe(expectedShouldExit);
        });
    });

    describe('URL guard', () => {
        test.each<[string, FlowPosition, boolean]>([
            ['a page of a finished step', position(PAGE_NAMES.REQUESTOR, PERSONAL_INFO_SUB_PAGES.FULL_NAME), true],
            ['the page where the flow resumes', position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.NAME), true],
            ['a later page of the step where the flow resumes', position(PAGE_NAMES.COMPANY, BUSINESS_INFO_SUB_PAGES.CONFIRMATION), false],
            ['a page of a later step', position(PAGE_NAMES.BENEFICIAL_OWNERS, BENEFICIAL_OWNERS_SUB_PAGES.IS_USER_UBO), false],
            ['the identity check that already passed', position(PAGE_NAMES.VERIFY_IDENTITY, VERIFY_IDENTITY_SUB_PAGES.IDENTITY_CHECK), false],
            ['the documents step that the server did not ask for', position(PAGE_NAMES.KYB_DOCS, KYB_DOCUMENTS_SUB_PAGES.UPLOAD), false],
        ])('decides for %s: %s', (_, urlPosition, expected) => {
            // Given an account that passed the identity check and waits for the company
            const plan = buildPlan(createServer().advanceTo('identity').readAccount(), STARTED_DRAFT);

            // When a URL names a position
            const isReachable = isPositionReachable(plan, urlPosition);

            // Then the done pages and the resume page open, a later or skipped page does not
            expect(isReachable).toBe(expected);
        });
    });
});
