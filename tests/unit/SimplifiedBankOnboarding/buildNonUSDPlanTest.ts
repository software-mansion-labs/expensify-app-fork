import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {GlobalOwnerDraft, OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {PageID, StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {BankFields, OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {FlowPosition} from '@pages/SimplifiedBankOnboarding/core/plan/position/position';
import {findStep} from '@pages/SimplifiedBankOnboarding/core/plan/position/position';
import isPositionReachable from '@pages/SimplifiedBankOnboarding/core/plan/position/reachability';
import getResumePosition from '@pages/SimplifiedBankOnboarding/core/plan/position/resume';
import {getNextStepPosition} from '@pages/SimplifiedBankOnboarding/core/plan/position/transitions';
import getRequestKey from '@pages/SimplifiedBankOnboarding/core/requests/requestKey';
import buildNonUSDPlan from '@pages/SimplifiedBankOnboarding/flows/nonUSD/buildNonUSDPlan';
import type FlowData from '@pages/SimplifiedBankOnboarding/flows/shared/flowData/types';
import type {FlowPlan} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {buildClientACHData} from '@pages/SimplifiedBankOnboarding/mockBackend/handlers/buildResponse';
import nonUSDWriteHandlers from '@pages/SimplifiedBankOnboarding/mockBackend/handlers/nonUSDWriteHandlers';
import {BUSINESS_TYPES, getBankFormFields} from '@pages/SimplifiedBankOnboarding/mockBackend/serverCatalog';
import type {MockServerDatabase, MockServerResponse} from '@pages/SimplifiedBankOnboarding/mockBackend/types';

import CONST from '@src/CONST';

const {PAGE_NAMES, COUNTRY_SUB_PAGES, BANK_INFO_SUB_PAGES, BUSINESS_INFO_SUB_PAGES, BENEFICIAL_OWNER_INFO_SUB_PAGES, SIGNER_INFO_SUB_PAGES} = SBO_CONST.NON_USD;
const {AGREEMENTS_SUB_PAGES, DOCUSIGN_SUB_PAGES, FINISH_SUB_PAGES, CURRENT_USER_KEY} = SBO_CONST.NON_USD;

/** Returns the key with its parameters, so a validator error is never an empty string that would make an invalid form look complete */
const translate: LocalizedTranslate = (path, ...parameters) => [path, ...parameters.map(String)].join(' ');

type Market = 'eur' | 'aud';

const COUNTRY_OF_MARKET: Record<Market, string> = {
    eur: SBO_CONST.COUNTRY.DE,
    aud: SBO_CONST.COUNTRY.AU,
};
const CURRENCY_OF_MARKET: Record<Market, string> = {
    eur: SBO_CONST.CURRENCY.EUR,
    aud: SBO_CONST.CURRENCY.AUD,
};

const BANK_FIELD_VALUES: Record<Market, Record<string, string>> = {
    eur: {
        [INPUT_IDS.IBAN]: `DE${'1'.repeat(20)}`,
        [INPUT_IDS.ACCOUNT_HOLDER_NAME]: 'Acme GmbH',
        [INPUT_IDS.ACCOUNT_HOLDER_COUNTRY]: SBO_CONST.COUNTRY.DE,
    },
    aud: {
        [INPUT_IDS.BSB_NUMBER]: '123456',
        [INPUT_IDS.ACCOUNT_NUMBER]: '12345678',
        [INPUT_IDS.ACCOUNT_HOLDER_NAME]: 'Acme Pty',
        [INPUT_IDS.ACCOUNT_HOLDER_REGION]: 'NSW',
    },
};

const AGREEMENTS = {
    authorizedToBindClientToAgreement: true,
    agreeToTermsAndConditions: true,
    consentToPrivacyNotice: true,
};

/** The draft of an AUD user who accepted the agreements and attached the bank statement, which the docusign step sends later */
const AUD_AGREEMENTS_DRAFT: OnboardingDraft = {
    ...AGREEMENTS,
    bankStatement: [{name: 'statement.pdf'}],
};

const USER_OWNER: GlobalOwnerDraft = {
    id: CURRENT_USER_KEY,
    firstName: 'Jane',
    lastName: 'Owner',
    ownershipPercentage: '30',
};

/** The seed of the mock server reduced to the NonUSD workspaces */
function buildDatabase(): MockServerDatabase {
    return {
        user: {validated: true},
        workspaces: {
            eur: {
                id: 'eur',
                name: 'Acme EU',
                outputCurrency: SBO_CONST.CURRENCY.EUR,
                role: SBO_CONST.WORKSPACE_ROLE.ADMIN,
            },
            aud: {
                id: 'aud',
                name: 'Acme AU',
                outputCurrency: SBO_CONST.CURRENCY.AUD,
                role: SBO_CONST.WORKSPACE_ROLE.ADMIN,
            },
        },
        bankAccounts: {},
        lastBankAccountID: 1000,
        settings: {
            latencyMs: 0,
            failureMode: SBO_CONST.MOCK.FAILURE_MODE.NONE,
            isThrottled: false,
            shouldRequireKYBDocuments: false,
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

type SavedOwners = {isUserOwner: boolean; otherOwners?: GlobalOwnerDraft[]};

/** Sends the requests of the NonUSD flow through the handlers of the mock server, which store the fields the way the real backend does */
function createServer(market: Market) {
    const database = buildDatabase();
    const policyID = market;

    const getBankAccountParams = () => ({
        policyID,
        bankAccountID: database.bankAccounts[policyID]?.bankAccountID ?? CONST.DEFAULT_NUMBER_ID,
    });

    const server = {
        createAccount() {
            expectSuccess(
                nonUSDWriteHandlers[WRITE_COMMANDS.CREATE_GLOBAL_BANK_ACCOUNT](
                    {
                        policyID,
                        country: COUNTRY_OF_MARKET[market],
                        currency: CURRENCY_OF_MARKET[market],
                        fields: BANK_FIELD_VALUES[market],
                    },
                    database,
                ),
            );
            return server;
        },
        saveCompany() {
            expectSuccess(
                nonUSDWriteHandlers[WRITE_COMMANDS.SAVE_ONBOARDING_COMPANY_DETAILS](
                    {
                        ...getBankAccountParams(),
                        companyName: 'Acme',
                        businessType: getFirst(BUSINESS_TYPES).id,
                    },
                    database,
                ),
            );
            return server;
        },
        saveOwners({isUserOwner, otherOwners = []}: SavedOwners = {isUserOwner: false}) {
            const owners = [...(isUserOwner ? [USER_OWNER] : []), ...otherOwners];
            const beneficialOwners = owners.map((owner) => ({
                uid: owner.id,
                fullName: `${owner.firstName} ${owner.lastName}`,
                ownershipPercentage: owner.ownershipPercentage,
            }));
            expectSuccess(
                nonUSDWriteHandlers[WRITE_COMMANDS.SAVE_ONBOARDING_BENEFICIAL_OWNERS](
                    {
                        ...getBankAccountParams(),
                        ownsMoreThan25Percent: isUserOwner,
                        anyIndividualOwn25PercentOrMore: otherOwners.length > 0,
                        beneficialOwners: JSON.stringify(beneficialOwners),
                    },
                    database,
                ),
            );
            return server;
        },
        saveDirector(signerFullName = 'Jane Director') {
            expectSuccess(nonUSDWriteHandlers[WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION]({...getBankAccountParams(), signerFullName, signerJobTitle: 'CEO'}, database));
            return server;
        },
        askForSigners(emails: {signerEmail?: string; secondSignerEmail?: string}) {
            expectSuccess(nonUSDWriteHandlers[WRITE_COMMANDS.ASK_FOR_SIGNER_INFORMATION]({...getBankAccountParams(), ...emails}, database));
            return server;
        },
        finish() {
            const documents =
                market === 'aud'
                    ? {
                          bankStatementName: 'statement.pdf',
                          achAuthorizationFormName: 'form.pdf',
                      }
                    : {};
            expectSuccess(nonUSDWriteHandlers[WRITE_COMMANDS.FINISH_GLOBAL_BANK_ACCOUNT_ONBOARDING]({...getBankAccountParams(), ...AGREEMENTS, ...documents}, database));
            return server;
        },

        /** What the open-page read returns: the row of the workspace without the server-only columns, or the empty account of a new setup */
        readAccount(): OnboardingAccount {
            const row = database.bankAccounts[policyID];
            if (!row) {
                return {
                    achData: {
                        policyID,
                        currentStep: SBO_CONST.USD.STEP.BANK_ACCOUNT,
                        subStep: '',
                    },
                };
            }
            return {achData: buildClientACHData(row)};
        },
        workspaces: database.workspaces,
    };
    return server;
}

type Server = ReturnType<typeof createServer>;

/** The bank inputs that the server described for a country, as the bank fields read stores them */
function getBankFields(country: string, currency: string): BankFields {
    return {
        bankCountry: country,
        bankCurrency: currency,
        formFields: getBankFormFields(country),
    };
}

type PlanOptions = {
    draft?: OnboardingDraft;

    /** The country of the bank fields that the client read last, or null while no read has finished */
    bankFieldsCountry?: string | null;

    /** The client stored the picklists of an earlier read */
    hasPicklists?: boolean;
};

function buildPlan(market: Market, server: Server, {draft, bankFieldsCountry = COUNTRY_OF_MARKET[market], hasPicklists = true}: PlanOptions = {}): FlowPlan {
    const data: FlowData = {
        draft,
        account: server.readAccount(),
        workspaces: server.workspaces,
        bankFields: bankFieldsCountry === null ? undefined : getBankFields(bankFieldsCountry, CURRENCY_OF_MARKET[market]),
        picklists: hasPicklists ? {picklists: {businessType: BUSINESS_TYPES}} : undefined,
        plaidLinkToken: undefined,
        onfidoToken: undefined,
    };
    return buildNonUSDPlan(data, {translate, policyID: market});
}

function position(stepID: StepID, pageID: PageID): FlowPosition {
    return {stepID, pageID, isEditing: false};
}

function getPageIDs(plan: FlowPlan, stepID: StepID): PageID[] {
    return findStep(plan, stepID)?.pages.map((page) => page.id) ?? [];
}

const AT_COUNTRY = position(PAGE_NAMES.COUNTRY, COUNTRY_SUB_PAGES.CONFIRM_CURRENCY);
const AT_BANK_DETAILS = position(PAGE_NAMES.BANK_INFO, BANK_INFO_SUB_PAGES.BANK_ACCOUNT_DETAILS);
const AT_BUSINESS_NAME = position(PAGE_NAMES.BUSINESS_INFO, BUSINESS_INFO_SUB_PAGES.NAME);
const AT_USER_OWNER_QUESTION = position(PAGE_NAMES.BENEFICIAL_OWNER_INFO, BENEFICIAL_OWNER_INFO_SUB_PAGES.IS_USER_BENEFICIAL_OWNER);
const AT_DIRECTOR_QUESTION = position(PAGE_NAMES.SIGNER_INFO, SIGNER_INFO_SUB_PAGES.IS_DIRECTOR);
const AT_ENTER_EMAIL = position(PAGE_NAMES.SIGNER_INFO, SIGNER_INFO_SUB_PAGES.ENTER_EMAIL);
const AT_HANG_TIGHT = position(PAGE_NAMES.SIGNER_INFO, SIGNER_INFO_SUB_PAGES.HANG_TIGHT);
const AT_AGREEMENTS = position(PAGE_NAMES.AGREEMENTS, AGREEMENTS_SUB_PAGES.CONFIRM_AGREEMENTS);
const AT_DOCUSIGN = position(PAGE_NAMES.DOCUSIGN, DOCUSIGN_SUB_PAGES.UPLOAD);
const AT_FINISH = position(PAGE_NAMES.FINISH, FINISH_SUB_PAGES.DONE);

type ResumeCase = [description: string, market: Market, prepareServer: (server: Server) => Server, options: PlanOptions, expectedPosition: FlowPosition];

describe('buildNonUSDPlan', () => {
    describe('resume position', () => {
        test.each<ResumeCase>([
            ['a new EUR setup on the country page', 'eur', (server) => server, {bankFieldsCountry: null}, AT_COUNTRY],
            ['a new AUD setup on the country page, because the default country is not a confirmed one', 'aud', (server) => server, {bankFieldsCountry: null}, AT_COUNTRY],
            ['a confirmed country on the bank page while its inputs load', 'eur', (server) => server, {draft: {country: SBO_CONST.COUNTRY.DE}, bankFieldsCountry: null}, AT_BANK_DETAILS],
            ['a confirmed country on the bank page once its inputs arrived', 'eur', (server) => server, {draft: {country: SBO_CONST.COUNTRY.DE}}, AT_BANK_DETAILS],
            ['a created EUR account on the business name', 'eur', (server) => server.createAccount(), {}, AT_BUSINESS_NAME],
            ['a created AUD account on the business name', 'aud', (server) => server.createAccount(), {}, AT_BUSINESS_NAME],
            ['a saved company on the first owner question', 'eur', (server) => server.createAccount().saveCompany(), {}, AT_USER_OWNER_QUESTION],
            ['saved owners on the director question', 'eur', (server) => server.createAccount().saveCompany().saveOwners(), {}, AT_DIRECTOR_QUESTION],
            [
                'an invited EUR director on the hang tight page',
                'eur',
                (server) => server.createAccount().saveCompany().saveOwners().askForSigners({signerEmail: 'director@acme.com'}),
                {},
                AT_HANG_TIGHT,
            ],
            ['a known EUR director on the agreements', 'eur', (server) => server.createAccount().saveCompany().saveOwners().saveDirector(), {}, AT_AGREEMENTS],
            ['a sent EUR setup on the finish page', 'eur', (server) => server.createAccount().saveCompany().saveOwners().saveDirector().finish(), {}, AT_FINISH],
            ['an AUD director without a second director on the email page', 'aud', (server) => server.createAccount().saveCompany().saveOwners().saveDirector(), {}, AT_ENTER_EMAIL],
            [
                'an AUD director with an invited second director on the hang tight page',
                'aud',
                (server) => server.createAccount().saveCompany().saveOwners().saveDirector().askForSigners({secondSignerEmail: 'second@acme.com'}),
                {},
                AT_HANG_TIGHT,
            ],
            [
                'an AUD user who invited two directors on the hang tight page',
                'aud',
                (server) =>
                    server.createAccount().saveCompany().saveOwners().askForSigners({
                        signerEmail: 'first@acme.com',
                        secondSignerEmail: 'second@acme.com',
                    }),
                {},
                AT_HANG_TIGHT,
            ],
            [
                'two known AUD directors on the agreements',
                'aud',
                (server) => server.createAccount().saveCompany().saveOwners().saveDirector().askForSigners({secondSignerEmail: 'second@acme.com'}).saveDirector('John Second'),
                {},
                AT_AGREEMENTS,
            ],
            [
                'two known AUD directors and accepted agreements on the docusign page',
                'aud',
                (server) => server.createAccount().saveCompany().saveOwners().saveDirector().askForSigners({secondSignerEmail: 'second@acme.com'}).saveDirector('John Second'),
                {draft: AUD_AGREEMENTS_DRAFT},
                AT_DOCUSIGN,
            ],
            [
                'a sent AUD setup on the finish page',
                'aud',
                (server) => server.createAccount().saveCompany().saveOwners().saveDirector().askForSigners({secondSignerEmail: 'second@acme.com'}).saveDirector('John Second').finish(),
                {},
                AT_FINISH,
            ],
        ])('resumes %s', (_, market, prepareServer, options, expectedPosition) => {
            // Given the account that the mock server returns after a sequence of requests, and the draft of the client
            const server = prepareServer(createServer(market));

            // When the flow opens without a position in the URL
            const plan = buildPlan(market, server, options);
            const resumePosition = getResumePosition(plan);

            // Then it opens the first page that still needs an answer, and that page is reachable
            expect(resumePosition).toEqual(expectedPosition);
            expect(isPositionReachable(plan, resumePosition)).toBe(true);
        });
    });

    describe('bank step', () => {
        test.each<[string, string | null]>([
            ['while no bank inputs were read', null],
            ['while the inputs of another country are stored', SBO_CONST.COUNTRY.FR],
        ])('reads the inputs of the confirmed country on its only page %s', (_, bankFieldsCountry) => {
            // Given a EUR user who confirmed Germany, and no bank inputs of Germany in the client
            const plan = buildPlan('eur', createServer('eur'), {
                draft: {country: SBO_CONST.COUNTRY.DE},
                bankFieldsCountry,
            });

            // When the bank step is read from the plan
            const pages = findStep(plan, PAGE_NAMES.BANK_INFO)?.pages ?? [];

            // Then the step is one page that waits for the read, so the inputs of another country never show, because
            // the server would reject them for this one
            expect(pages.map((page) => page.id)).toEqual([BANK_INFO_SUB_PAGES.BANK_ACCOUNT_DETAILS]);
            expect(pages.at(0)?.read?.key).toBe(getRequestKey(REQUEST_NAMES.GET_BANK_ACCOUNT_FIELDS));
            expect(pages.at(0)?.read?.isLoaded).toBe(false);
        });

        it('shows the inputs without a read once those of the confirmed country arrived', () => {
            // Given a EUR user who confirmed Germany, and the bank inputs of Germany in the client
            const plan = buildPlan('eur', createServer('eur'), {draft: {country: SBO_CONST.COUNTRY.DE}});

            // When the bank step is read from the plan
            const pages = findStep(plan, PAGE_NAMES.BANK_INFO)?.pages ?? [];

            // Then every page of the step shows, and none reads the inputs again, because the stored ones name their country
            expect(pages.map((page) => page.id)).toEqual([BANK_INFO_SUB_PAGES.BANK_ACCOUNT_DETAILS, BANK_INFO_SUB_PAGES.ACCOUNT_HOLDER_DETAILS, BANK_INFO_SUB_PAGES.CONFIRMATION]);
            expect(pages.every((page) => !page.read)).toBe(true);
        });

        it('opens the business step after the request that created the account', () => {
            // Given the plan before the bank request and the plan after the server created the account
            const server = createServer('eur');
            const draft: OnboardingDraft = {
                country: SBO_CONST.COUNTRY.DE,
                ...BANK_FIELD_VALUES.eur,
            };
            const previousPlan = buildPlan('eur', server, {draft});
            const plan = buildPlan('eur', server.createAccount(), {draft});

            // When the bank step is done
            const nextPosition = getNextStepPosition(plan, previousPlan, PAGE_NAMES.BANK_INFO);

            // Then the flow continues on the business step
            expect(nextPosition).toEqual(AT_BUSINESS_NAME);
        });
    });

    describe('business step', () => {
        it('reads the picklists only on the pages that show a business type', () => {
            // Given a created account
            const plan = buildPlan('eur', createServer('eur').createAccount());

            // When the business step is read from the plan
            const pages = findStep(plan, PAGE_NAMES.BUSINESS_INFO)?.pages ?? [];

            // Then the business type page and the confirmation read the picklists when they open, also while a list is
            // stored, because the stored list names no country and may belong to another one
            expect(pages.map((page) => [page.id, page.read?.key])).toEqual([
                [BUSINESS_INFO_SUB_PAGES.NAME, undefined],
                [BUSINESS_INFO_SUB_PAGES.BUSINESS_TYPE, getRequestKey(REQUEST_NAMES.GET_ONBOARDING_FIELDS)],
                [BUSINESS_INFO_SUB_PAGES.CONFIRMATION, getRequestKey(REQUEST_NAMES.GET_ONBOARDING_FIELDS)],
            ]);
        });

        test.each<[string, boolean, OnboardingDraft, boolean]>([
            ['waits while no picklists and no business type are stored', false, {}, false],
            ['shows the saved business type while no picklists are stored', false, {businessType: getFirst(BUSINESS_TYPES).id}, true],
            ['shows the stored picklists', true, {}, true],
        ])('%s', (_, hasPicklists, draft, expectedIsLoaded) => {
            // Given a created account, the picklists of an earlier read or none, and the business type of the draft
            const plan = buildPlan('eur', createServer('eur').createAccount(), {draft, hasPicklists});

            // When the business type page is read from the plan
            const businessTypePage = findStep(plan, PAGE_NAMES.BUSINESS_INFO)?.pages.find((page) => page.id === BUSINESS_INFO_SUB_PAGES.BUSINESS_TYPE);

            // Then the page waits only while it has no business type to show
            expect(businessTypePage?.read?.isLoaded).toBe(expectedIsLoaded);
        });
    });

    describe('docusign step', () => {
        test.each<[string, Market, boolean]>([
            ['is in the AUD plan, which needs a signed authorization form', 'aud', true],
            ['is not in the EUR plan', 'eur', false],
        ])('%s', (_, market, hasDocusignStep) => {
            // Given a new setup of the market
            const plan = buildPlan(market, createServer(market));

            // When the steps of the plan are listed
            const stepIDs = plan.steps.map((step) => step.id);

            // Then only the currency that needs the form has the step
            expect(stepIDs.includes(PAGE_NAMES.DOCUSIGN)).toBe(hasDocusignStep);
        });

        test.each<[string, Market, FlowPosition]>([
            ['the docusign page for AUD', 'aud', AT_DOCUSIGN],
            ['the finish page for EUR', 'eur', AT_FINISH],
        ])('goes forward from the agreements to %s', (_, market, expectedPosition) => {
            // Given a setup with known directors and accepted agreements
            const server = createServer(market).createAccount().saveCompany().saveOwners().saveDirector();
            if (market === 'aud') {
                server.askForSigners({secondSignerEmail: 'second@acme.com'}).saveDirector('John Second');
            }
            const previousPlan = buildPlan(market, server, {
                draft: AUD_AGREEMENTS_DRAFT,
            });
            if (market === 'eur') {
                server.finish();
            }
            const plan = buildPlan(market, server, {draft: AUD_AGREEMENTS_DRAFT});

            // When the agreements step is done
            const nextPosition = getNextStepPosition(plan, previousPlan, PAGE_NAMES.AGREEMENTS);

            // Then AUD collects the signed form before the final request, EUR already sent it with the agreements
            expect(nextPosition).toEqual(expectedPosition);
        });
    });

    describe('signer pages', () => {
        test.each<[string, Market, OnboardingDraft, PageID[]]>([
            ['only the director question before the answer', 'eur', {}, [SIGNER_INFO_SUB_PAGES.IS_DIRECTOR]],
            [
                'the invite pages for a EUR user who is no director',
                'eur',
                {isUserDirector: false},
                [SIGNER_INFO_SUB_PAGES.IS_DIRECTOR, SIGNER_INFO_SUB_PAGES.ENTER_EMAIL, SIGNER_INFO_SUB_PAGES.HANG_TIGHT],
            ],
            [
                'the director pages for a EUR director',
                'eur',
                {isUserDirector: true},
                [SIGNER_INFO_SUB_PAGES.IS_DIRECTOR, SIGNER_INFO_SUB_PAGES.NAME, SIGNER_INFO_SUB_PAGES.JOB_TITLE, SIGNER_INFO_SUB_PAGES.CONFIRMATION],
            ],
            [
                'the director pages and the invite of the second director for an AUD director',
                'aud',
                {isUserDirector: true},
                [
                    SIGNER_INFO_SUB_PAGES.IS_DIRECTOR,
                    SIGNER_INFO_SUB_PAGES.NAME,
                    SIGNER_INFO_SUB_PAGES.JOB_TITLE,
                    SIGNER_INFO_SUB_PAGES.CONFIRMATION,
                    SIGNER_INFO_SUB_PAGES.ENTER_EMAIL,
                    SIGNER_INFO_SUB_PAGES.HANG_TIGHT,
                ],
            ],
        ])('lists %s', (_, market, draft, expectedPageIDs) => {
            // Given saved owners where the user owns less than 25%, and the director answer of the draft
            const server = createServer(market).createAccount().saveCompany().saveOwners();

            // When the signer pages are listed
            const pageIDs = getPageIDs(buildPlan(market, server, {draft}), PAGE_NAMES.SIGNER_INFO);

            // Then the pages follow the director answer
            expect(pageIDs).toEqual(expectedPageIDs);
        });

        it('gives the hang tight page the reminder of its workspace', () => {
            // Given an invited director who has not answered yet
            const server = createServer('eur').createAccount().saveCompany().saveOwners().askForSigners({signerEmail: 'director@acme.com'});

            // When the hang tight page is read from the plan
            const hangTightPage = findStep(buildPlan('eur', server), PAGE_NAMES.SIGNER_INFO)?.pages.find((page) => page.id === SIGNER_INFO_SUB_PAGES.HANG_TIGHT);

            // Then the page sends the reminder that the plan names, so its button shares the guard and the status of that write
            expect(hangTightPage).toMatchObject({request: {key: getRequestKey(REQUEST_NAMES.SEND_SIGNER_REMINDER, {policyID: 'eur'})}});
        });
    });

    describe('own 25% answer of the draft against the saved one', () => {
        it('drops the signer name page when the draft makes the user an owner, because the owner step has the name', () => {
            // Given a server that saved the user as no owner and as the director, and a draft that makes the user an owner
            const server = createServer('eur').createAccount().saveCompany().saveOwners({isUserOwner: false}).saveDirector();
            const draft: OnboardingDraft = {
                ownsMoreThan25Percent: true,
                globalOwners: [USER_OWNER],
            };

            // When the plan is built
            const plan = buildPlan('eur', server, {draft});

            // Then the draft wins: the owner step asks for the owner details and the signer step no longer asks for the name
            expect(getPageIDs(plan, PAGE_NAMES.BENEFICIAL_OWNER_INFO)).toContain(BENEFICIAL_OWNER_INFO_SUB_PAGES.NAME);
            expect(getPageIDs(plan, PAGE_NAMES.SIGNER_INFO)).toEqual([SIGNER_INFO_SUB_PAGES.IS_DIRECTOR, SIGNER_INFO_SUB_PAGES.JOB_TITLE, SIGNER_INFO_SUB_PAGES.CONFIRMATION]);
        });

        it('adds the signer name page back when the draft takes the owner answer back', () => {
            // Given a server that saved the user as an owner and as the director, and a draft where the user owns less than 25%
            const server = createServer('eur').createAccount().saveCompany().saveOwners({isUserOwner: true}).saveDirector();
            const draft: OnboardingDraft = {
                ownsMoreThan25Percent: false,
                globalOwners: [],
            };

            // When the plan is built
            const plan = buildPlan('eur', server, {draft});

            // Then the draft wins: the owner details pages are gone and the signer step asks for the name again
            expect(getPageIDs(plan, PAGE_NAMES.BENEFICIAL_OWNER_INFO)).not.toContain(BENEFICIAL_OWNER_INFO_SUB_PAGES.NAME);
            expect(getPageIDs(plan, PAGE_NAMES.SIGNER_INFO)).toEqual([
                SIGNER_INFO_SUB_PAGES.IS_DIRECTOR,
                SIGNER_INFO_SUB_PAGES.NAME,
                SIGNER_INFO_SUB_PAGES.JOB_TITLE,
                SIGNER_INFO_SUB_PAGES.CONFIRMATION,
            ]);
        });

        it('follows the saved answer while the draft has none', () => {
            // Given a server that saved the user as an owner and as the director, and no draft, as on another device
            const server = createServer('eur').createAccount().saveCompany().saveOwners({isUserOwner: true}).saveDirector();

            // When the plan is built
            const plan = buildPlan('eur', server);

            // Then the signer step takes the name from the saved owner instead of asking for it
            expect(getPageIDs(plan, PAGE_NAMES.SIGNER_INFO)).not.toContain(SIGNER_INFO_SUB_PAGES.NAME);
        });

        // A user who answers "yes" to the own 25% question and leaves before confirming their owner details keeps the answer in the
        // draft without an owner in the list. The owner step counts as complete from the server, so the flow resumes on the signer
        // step, which must then ask for the name instead of sending an empty one that the server rejects.
        it('never resumes on director pages that have no name to send', () => {
            // Given owners saved without the user, a draft where the user just answered that they own 25% but has no owner details yet,
            // and a director answer
            const server = createServer('eur').createAccount().saveCompany().saveOwners({isUserOwner: false});
            const draft: OnboardingDraft = {
                ownsMoreThan25Percent: true,
                ownerBeingModifiedID: CURRENT_USER_KEY,
                isUserDirector: true,
            };

            // When the flow resumes
            const plan = buildPlan('eur', server, {draft});
            const resumePosition = getResumePosition(plan);

            // Then either the flow asks for the missing owner details first, or the signer step asks for the name itself
            const hasSignerNamePage = getPageIDs(plan, PAGE_NAMES.SIGNER_INFO).includes(SIGNER_INFO_SUB_PAGES.NAME);
            expect(resumePosition?.stepID !== PAGE_NAMES.SIGNER_INFO || hasSignerNamePage).toBe(true);
        });
    });
});
