import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {ACHData, CorpayData} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import getNonUSDResumeStep from '@pages/SimplifiedBankOnboarding/flows/nonUSD/getNonUSDResumeStep';

const {PAGE_NAMES, CURRENT_USER_KEY} = SBO_CONST.NON_USD;
const {EUR, AUD} = SBO_CONST.CURRENCY;
const CREATED = '2026-01-01';

/** The corpay data of a setup that the server saved up to the signer step */
const SAVED_UP_TO_SIGNER: CorpayData = {
    companyName: 'Acme',
    anyIndividualOwn25PercentOrMore: false,
    beneficialOwners: [{uid: CURRENT_USER_KEY, fullName: 'Ada Lovelace', ownershipPercentage: '50'}],
    signerFullName: 'Ada Lovelace',
};

const ALL_AGREEMENTS_CHECKED: OnboardingDraft = {authorizedToBindClientToAgreement: true, agreeToTermsAndConditions: true, consentToPrivacyNotice: true};

const BANK_STATEMENT: OnboardingDraft = {bankStatement: [{name: 'statement.pdf', uri: 'file://statement.pdf'}]};

function getStep(achData: ACHData | undefined, draft: OnboardingDraft | undefined, currency: string) {
    return getNonUSDResumeStep(achData ? {achData} : undefined, draft, currency);
}

describe('getNonUSDResumeStep', () => {
    it('opens the country step of a new setup', () => {
        // Given no account and no picked country
        // When the flow opens without a step in the URL
        const step = getStep(undefined, undefined, EUR);

        // Then it opens the first step, as the old flow page did for a URL without a step
        expect(step).toBe(PAGE_NAMES.COUNTRY);
    });

    it('opens the bank step once a country was picked and the account does not exist yet', () => {
        // Given a picked country in the draft and no account on the server (rule 1)
        // When the flow opens without a step in the URL
        const step = getStep(undefined, {country: 'DE'}, EUR);

        // Then it opens the bank step, the next step after the country
        expect(step).toBe(PAGE_NAMES.BANK_INFO);
    });

    it('opens business info once the account exists and the company was not saved', () => {
        // Given an account created by the bank step and no company name (rule 2)
        // When the flow opens without a step in the URL
        const step = getStep({created: CREATED, corpay: {}}, undefined, EUR);

        // Then it opens business info
        expect(step).toBe(PAGE_NAMES.BUSINESS_INFO);
    });

    it('opens the owners step once the company was saved and the owners were not', () => {
        // Given a saved company and no saved owners answer (rule 3)
        // When the flow opens without a step in the URL
        const step = getStep({created: CREATED, corpay: {companyName: 'Acme'}}, undefined, EUR);

        // Then it opens the owners step
        expect(step).toBe(PAGE_NAMES.BENEFICIAL_OWNER_INFO);
    });

    it('opens the signer step while no director is known', () => {
        // Given saved owners and no saved director (rule 4)
        // When the flow opens without a step in the URL
        const step = getStep({created: CREATED, corpay: {companyName: 'Acme', anyIndividualOwn25PercentOrMore: false}}, undefined, EUR);

        // Then it opens the signer step
        expect(step).toBe(PAGE_NAMES.SIGNER_INFO);
    });

    it('opens the signer step of an AUD setup while the second director is not known', () => {
        // Given an AUD setup with only the first director saved (rule 4, AUD needs both directors)
        // When the flow opens without a step in the URL
        const step = getStep({created: CREATED, corpay: SAVED_UP_TO_SIGNER}, undefined, AUD);

        // Then it opens the signer step, which waits for the second director
        expect(step).toBe(PAGE_NAMES.SIGNER_INFO);
    });

    it('opens the signer step when the agreements were saved but the setup was not sent', () => {
        // Given known directors and saved agreements, but a state that is not VERIFYING (rule 4, saved agreements)
        // When the flow opens without a step in the URL
        const step = getStep({created: CREATED, corpay: {...SAVED_UP_TO_SIGNER, authorizedToBindClientToAgreement: true}}, undefined, EUR);

        // Then it opens the signer step, as the real flow does
        expect(step).toBe(PAGE_NAMES.SIGNER_INFO);
    });

    it('opens the finish step once the setup was sent', () => {
        // Given a setup in VERIFYING, which counts as past the signer step (rule 5)
        // When the flow opens without a step in the URL
        const step = getStep({created: CREATED, state: SBO_CONST.STATE.VERIFYING, corpay: {companyName: 'Acme', anyIndividualOwn25PercentOrMore: false}}, undefined, EUR);

        // Then it opens the finish step
        expect(step).toBe(PAGE_NAMES.FINISH);
    });

    it('opens docusign when an AUD setup has the agreements checked and a bank statement picked', () => {
        // Given both AUD directors known, every agreement checked and a bank statement in the draft (rule 6)
        const achData: ACHData = {created: CREATED, corpay: {...SAVED_UP_TO_SIGNER, secondSignerFullName: 'Grace Hopper'}};

        // When the flow opens without a step in the URL
        const step = getStep(achData, {...ALL_AGREEMENTS_CHECKED, ...BANK_STATEMENT}, AUD);

        // Then it opens docusign, the step after the agreements
        expect(step).toBe(PAGE_NAMES.DOCUSIGN);
    });

    it('opens the agreements of an AUD setup without a picked bank statement', () => {
        // Given both AUD directors known and every agreement checked, but no bank statement (rule 7)
        const achData: ACHData = {created: CREATED, corpay: {...SAVED_UP_TO_SIGNER, secondSignerFullName: 'Grace Hopper'}};

        // When the flow opens without a step in the URL
        const step = getStep(achData, ALL_AGREEMENTS_CHECKED, AUD);

        // Then it opens the agreements, where the bank statement is picked
        expect(step).toBe(PAGE_NAMES.AGREEMENTS);
    });

    it('opens the agreements when a currency needs no docusign', () => {
        // Given a EUR setup with every agreement checked and a bank statement (rule 7, docusign is AUD only)
        // When the flow opens without a step in the URL
        const step = getStep({created: CREATED, corpay: SAVED_UP_TO_SIGNER}, {...ALL_AGREEMENTS_CHECKED, ...BANK_STATEMENT}, EUR);

        // Then it opens the agreements, because the flow has no docusign step
        expect(step).toBe(PAGE_NAMES.AGREEMENTS);
    });

    it('opens the agreements when one agreement is unchecked in the draft', () => {
        // Given an AUD setup whose draft unchecked an agreement that the server holds as checked (rule 6, draft first)
        const achData: ACHData = {created: CREATED, corpay: {...SAVED_UP_TO_SIGNER, secondSignerFullName: 'Grace Hopper'}};

        // When the flow opens without a step in the URL
        const step = getStep(achData, {...ALL_AGREEMENTS_CHECKED, ...BANK_STATEMENT, consentToPrivacyNotice: false}, AUD);

        // Then it opens the agreements, because the answer of the user wins over the saved one
        expect(step).toBe(PAGE_NAMES.AGREEMENTS);
    });
});
