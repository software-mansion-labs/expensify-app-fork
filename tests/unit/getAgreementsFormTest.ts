import getAgreementsForm, {getAgreementsParams, getAgreementsPrefill} from '@pages/ReimbursementAccount/NonUSD/Agreements/getAgreementsForm';

import CONST from '@src/CONST';

const AGREEMENT_KEYS = ['authorizedToBindClientToAgreement', 'provideTruthfulInformation', 'agreeToTermsAndConditions', 'consentToPrivacyNotice'];

describe('getAgreementsForm', () => {
    it('asks for a bank statement only for the currencies that need one', () => {
        // Given a currency whose bank account needs a statement and one whose account does not
        // When the schema is built for each
        const [cadPage] = getAgreementsForm(CONST.CURRENCY.CAD).pages;
        const [eurPage] = getAgreementsForm(CONST.CURRENCY.EUR).pages;

        // Then both ask for every agreement, and only the CAD account asks for the statement the Docusign step sends later
        const fieldKeys = (page: typeof cadPage) => page?.content.filter((item) => 'type' in item).map((item) => item.key);
        expect(fieldKeys(cadPage)).toEqual([...AGREEMENT_KEYS, 'bankStatement']);
        expect(fieldKeys(eurPage)).toEqual(AGREEMENT_KEYS);
    });

    it('explains why the agreements are needed only when the step finishes the onboarding', () => {
        // Given a currency signed through Docusign later and one finished on this step
        // When the schema is built for each
        const [cadPage] = getAgreementsForm(CONST.CURRENCY.CAD).pages;
        const [eurPage] = getAgreementsForm(CONST.CURRENCY.EUR).pages;

        // Then only the step that adds the bank account says the regulation requires the agreements, as the old step did
        expect(cadPage?.descriptionKey).toBeUndefined();
        expect(eurPage?.descriptionKey).toBe('agreementsStep.regulationRequiresUs');
    });

    it('sends every agreement as a boolean', () => {
        // Given answers where one agreement was never saved to the draft
        const answers = {authorizedToBindClientToAgreement: true, provideTruthfulInformation: true, agreeToTermsAndConditions: true};

        // When the request inputs are built
        const inputs = getAgreementsParams(answers);

        // Then a missing agreement is sent as false, since the API takes the four agreements as booleans
        expect(JSON.parse(inputs)).toEqual({
            provideTruthfulInformation: true,
            agreeToTermsAndConditions: true,
            consentToPrivacyNotice: false,
            authorizedToBindClientToAgreement: true,
        });
    });

    it('prefills the agreements the bank account already holds', () => {
        // Given a bank account that already accepted the agreements
        const corpay = {provideTruthfulInformation: true, agreeToTermsAndConditions: true, consentToPrivacyNotice: true, authorizedToBindClientToAgreement: true};

        // When the prefill is built
        const prefill = getAgreementsPrefill(corpay);

        // Then the checkboxes come back ticked when the user returns to the step
        expect(prefill).toEqual(corpay);
    });
});
