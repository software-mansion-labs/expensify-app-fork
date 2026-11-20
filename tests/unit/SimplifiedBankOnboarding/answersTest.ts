import getNonUSDAnswers from '@pages/SimplifiedBankOnboarding/model/answers/getNonUSDAnswers';
import getUSDAnswers from '@pages/SimplifiedBankOnboarding/model/answers/getUSDAnswers';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {GlobalOwnerDraft, OnboardingDraft, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/types/form';
import type {CorpayData, OnboardingAccount} from '@pages/SimplifiedBankOnboarding/types/onyx';

const {CURRENT_USER_KEY} = SBO_CONST.NON_USD;

const USD_ACCOUNT: OnboardingAccount = {
    achData: {
        policyID: 'usd',
        bankAccountID: 1001,
        state: SBO_CONST.STATE.SETUP,
        currentStep: SBO_CONST.USD.STEP.ACH_CONTRACT,
        subStep: SBO_CONST.SETUP_TYPE.PLAID,
        country: SBO_CONST.COUNTRY.US,
        firstName: 'Server',
        lastName: 'Name',
        companyName: 'Server Company',
        isOnfidoSetupComplete: true,
        ownsMoreThan25Percent: false,
        beneficialOwners: [
            {firstName: 'Anna', lastName: 'Owner', dob: '1980-01-01'},
            {firstName: 'Ben', lastName: 'Owner', dob: '1981-01-01'},
        ],
        beneficialOwnerKeys: ['anna-id'],
    },
};

function globalAccount(corpay: CorpayData, country?: string): OnboardingAccount {
    return {
        achData: {
            policyID: 'eur',
            bankAccountID: 1001,
            state: SBO_CONST.STATE.SETUP,
            created: '2026-01-01T00:00:00.000Z',
            country,
            corpay,
        },
    };
}

const SAVED_CORPAY: CorpayData = {
    companyName: 'Server Company',
    ownsMoreThan25Percent: true,
    anyIndividualOwn25PercentOrMore: false,
    beneficialOwners: [
        {
            uid: CURRENT_USER_KEY,
            fullName: 'Mary Ann Smith',
            ownershipPercentage: '40',
        },
    ],
};

describe('answers', () => {
    describe('getUSDAnswers', () => {
        it('takes a draft value over the saved one, and the saved one over the empty default', () => {
            // Given a saved account and a draft that changed only the company name
            const draft: OnboardingDraft = {companyName: 'Draft Company'};

            // When the answers are built
            const answers = getUSDAnswers(draft, USD_ACCOUNT);

            // Then the edit wins, the untouched values come from the server and the rest fall back to empty values
            expect(answers).toMatchObject({
                companyName: 'Draft Company',
                firstName: 'Server',
                setupType: SBO_CONST.SETUP_TYPE.PLAID,
                ssnLast4: '',
                isAuthorizedToUseBankAccount: false,
            });
        });

        it('keeps a false draft answer over a true saved one', () => {
            // Given a saved passed identity check and a draft that holds false
            const draft: OnboardingDraft = {isOnfidoSetupComplete: false};

            // When the answers are built
            const answers = getUSDAnswers(draft, USD_ACCOUNT);

            // Then only undefined falls back to the server, so a false answer of the user is not lost
            expect(answers.isOnfidoSetupComplete).toBe(false);
        });

        it('builds the owners from the server with the saved IDs, and IDs from the position where the server has none', () => {
            // Given saved owners with an ID for the first one only, and no owner list in the draft
            // When the answers are built
            const answers = getUSDAnswers(undefined, USD_ACCOUNT);

            // Then every owner has an ID, so the list rows can be opened
            expect(answers.owners).toEqual<USDOwnerDraft[]>([
                {
                    id: 'anna-id',
                    firstName: 'Anna',
                    lastName: 'Owner',
                    dob: '1980-01-01',
                },
                {
                    id: 'owner-1',
                    firstName: 'Ben',
                    lastName: 'Owner',
                    dob: '1981-01-01',
                },
            ]);
        });

        it('takes the owner list of the draft, even an empty one, over the saved one', () => {
            // Given saved owners and a draft where the user removed all of them
            const draft: OnboardingDraft = {usdOwners: []};

            // When the answers are built
            const answers = getUSDAnswers(draft, USD_ACCOUNT);

            // Then the list of the draft wins, so the removed owners do not come back
            expect(answers.owners).toEqual([]);
        });

        test.each<[string, OnboardingAccount, OnboardingDraft | undefined, boolean | undefined]>([
            ['is unknown before the owners step was saved', {achData: {policyID: 'usd'}}, undefined, undefined],
            ['comes from the saved owners once the owners step was saved', USD_ACCOUNT, undefined, true],
            [
                'is false when the saved step has no owners',
                {
                    achData: {
                        policyID: 'usd',
                        ownsMoreThan25Percent: true,
                        beneficialOwners: [],
                    },
                },
                undefined,
                false,
            ],
            ['comes from the draft over the saved owners', USD_ACCOUNT, {hasOtherBeneficialOwners: false}, false],
        ])('the answer about other owners %s', (_, account, draft, expected) => {
            // Given the saved account and the draft
            // When the answers are built
            const answers = getUSDAnswers(draft, account);

            // Then the server, which stores no such answer, answers it with the saved list once the step was saved
            expect(answers.hasOtherBeneficialOwners).toBe(expected);
        });
    });

    describe('getNonUSDAnswers', () => {
        it('takes a draft value over the saved one, and the saved one over the empty default', () => {
            // Given saved company details and a draft that changed the company name
            const draft: OnboardingDraft = {companyName: 'Draft Company'};

            // When the answers are built
            const answers = getNonUSDAnswers(draft, globalAccount(SAVED_CORPAY), SBO_CONST.CURRENCY.EUR);

            // Then the edit wins, the untouched values come from the server and the rest fall back to empty values
            expect(answers).toMatchObject({
                companyName: 'Draft Company',
                ownsMoreThan25Percent: true,
                hasOtherBeneficialOwners: false,
                signerFullName: '',
                consentToPrivacyNotice: false,
            });
        });

        it('keeps a false draft answer about the 25% over a true saved one', () => {
            // Given a saved owner user and a draft where the user takes the answer back
            const draft: OnboardingDraft = {ownsMoreThan25Percent: false};

            // When the answers are built
            const answers = getNonUSDAnswers(draft, globalAccount(SAVED_CORPAY), SBO_CONST.CURRENCY.EUR);

            // Then the draft wins, so the owner and signer pages follow the new answer
            expect(answers.ownsMoreThan25Percent).toBe(false);
        });

        it('builds the owners from the server and splits the saved full name', () => {
            // Given a saved owner whose full name has a middle name, and no owner list in the draft
            // When the answers are built
            const answers = getNonUSDAnswers(undefined, globalAccount(SAVED_CORPAY), SBO_CONST.CURRENCY.EUR);

            // Then the server name fills the two inputs with its first and last word
            expect(answers.owners).toEqual<GlobalOwnerDraft[]>([
                {
                    id: CURRENT_USER_KEY,
                    firstName: 'Mary',
                    lastName: 'Smith',
                    ownershipPercentage: '40',
                },
            ]);
        });

        it('takes the owner list of the draft over the saved one', () => {
            // Given saved owners and a draft list with another owner
            const draftOwners: GlobalOwnerDraft[] = [
                {
                    id: 'other',
                    firstName: 'Other',
                    lastName: 'Owner',
                    ownershipPercentage: '30',
                },
            ];

            // When the answers are built
            const answers = getNonUSDAnswers({globalOwners: draftOwners}, globalAccount(SAVED_CORPAY), SBO_CONST.CURRENCY.EUR);

            // Then the list of the draft wins
            expect(answers.owners).toEqual(draftOwners);
        });

        test.each<[string, OnboardingDraft | undefined, string | undefined, string, string]>([
            ['the country of the draft first', {country: SBO_CONST.COUNTRY.FR}, SBO_CONST.COUNTRY.DE, SBO_CONST.CURRENCY.EUR, SBO_CONST.COUNTRY.FR],
            ['the saved country without a draft one', undefined, SBO_CONST.COUNTRY.DE, SBO_CONST.CURRENCY.EUR, SBO_CONST.COUNTRY.DE],
            ['Australia for AUD without a chosen country', undefined, undefined, SBO_CONST.CURRENCY.AUD, SBO_CONST.COUNTRY.AU],
            ['no country for EUR without a chosen country', undefined, undefined, SBO_CONST.CURRENCY.EUR, ''],
        ])('takes %s', (_, draft, savedCountry, currency, expectedCountry) => {
            // Given the draft, the saved country and the currency of the workspace
            // When the answers are built
            const answers = getNonUSDAnswers(draft, globalAccount({}, savedCountry), currency);

            // Then AUD has its only country before the user picks one, EUR waits for the choice
            expect(answers.country).toBe(expectedCountry);
        });

        test.each<[string, CorpayData, boolean | undefined]>([
            ['unknown before any signer was saved', {}, undefined],
            ['true once the user signed as the director', {signerFullName: 'Jane Doe'}, true],
            ['false once the user invited a director', {signerEmail: 'director@acme.com'}, false],
            ['false when an invited director signed after the invite', {signerEmail: 'director@acme.com', signerFullName: 'John Director'}, false],
        ])('derives the director answer from the server as %s', (_, corpay, expected) => {
            // Given the saved signer data and no draft answer
            // When the answers are built
            const answers = getNonUSDAnswers(undefined, globalAccount(corpay), SBO_CONST.CURRENCY.EUR);

            // Then a saved email means the user invited someone, a saved name alone means the user signed
            expect(answers.isUserDirector).toBe(expected);
        });

        it('takes the director answer of the draft over the derived one', () => {
            // Given a user who signed as the director and a draft that changed the answer
            const draft: OnboardingDraft = {isUserDirector: false};

            // When the answers are built
            const answers = getNonUSDAnswers(draft, globalAccount({signerFullName: 'Jane Doe'}), SBO_CONST.CURRENCY.EUR);

            // Then the draft wins
            expect(answers.isUserDirector).toBe(false);
        });
    });
});
