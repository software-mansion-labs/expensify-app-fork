import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import getAgreementsAnswers from '@pages/SimplifiedBankOnboarding/flows/nonUSD/agreements/getAgreementsAnswers';
import getBankInfoAnswers from '@pages/SimplifiedBankOnboarding/flows/nonUSD/bankInfo/getBankInfoAnswers';
import getOwnersAnswers from '@pages/SimplifiedBankOnboarding/flows/nonUSD/beneficialOwners/getOwnersAnswers';
import getBusinessInfoAnswers from '@pages/SimplifiedBankOnboarding/flows/nonUSD/businessInfo/getBusinessInfoAnswers';
import getCountryAnswers from '@pages/SimplifiedBankOnboarding/flows/nonUSD/country/getCountryAnswers';
import getSignerAnswers from '@pages/SimplifiedBankOnboarding/flows/nonUSD/signer/getSignerAnswers';

import {getTestFlowData} from '../../utils/BankOnboardingLabTestUtils';

const {EUR, AUD} = SBO_CONST.CURRENCY;
const {CURRENT_USER_KEY} = SBO_CONST.NON_USD;

describe('the answers of the NonUSD steps', () => {
    it('takes the draft over the server', () => {
        // Given a company that the global provider saved and a name that the user typed since (BC-08)
        const account: OnboardingAccount = {achData: {corpay: {companyName: 'Saved GmbH', businessType: 'llc', iban: 'DE00SAVED'}}};

        // When the answers are read
        const data = getTestFlowData({draft: {companyName: 'Typed GmbH', iban: 'DE00TYPED'}, account, currency: EUR});

        // Then the typed values win, and a field the user did not touch shows the saved value
        expect(getBusinessInfoAnswers(data)).toEqual({companyName: 'Typed GmbH', businessType: 'llc'});
        expect(getBankInfoAnswers(data).bankFieldValues.iban).toBe('DE00TYPED');
        expect(getBankInfoAnswers(data).bankFieldValues.bankName).toBe('');
    });

    it('keeps false in the draft over true on the server', () => {
        // Given agreements and an owner answer that the server saved as true and the user changed to false
        const account: OnboardingAccount = {achData: {corpay: {consentToPrivacyNotice: true, ownsMoreThan25Percent: true, signerFullName: 'Ada Lovelace'}}};

        // When the answers are read
        const data = getTestFlowData({draft: {consentToPrivacyNotice: false, ownsMoreThan25Percent: false, isUserDirector: false}, account, currency: EUR});

        // Then false stays false
        expect(getAgreementsAnswers(data).consentToPrivacyNotice).toBe(false);
        expect(getOwnersAnswers(data).ownsMoreThan25Percent).toBe(false);
        expect(getSignerAnswers(data).isUserDirector).toBe(false);
    });

    it('fixes the country of an AUD setup', () => {
        // Given an AUD setup whose draft names another country
        // When the answers are read
        const answers = getCountryAnswers(getTestFlowData({draft: {country: 'DE'}, currency: AUD}));

        // Then the country is Australia, the only country of AUD
        expect(answers.country).toBe(SBO_CONST.COUNTRY.AU);
    });

    it('reads the country from the draft, then from the server', () => {
        // Given a country that the server saved
        const account: OnboardingAccount = {achData: {country: 'FR'}};

        // When the answers are read with and without a picked country
        // Then the picked country wins and the saved one follows
        expect(getCountryAnswers(getTestFlowData({draft: {country: 'ES'}, account, currency: EUR})).country).toBe('ES');
        expect(getCountryAnswers(getTestFlowData({account, currency: EUR})).country).toBe('FR');
    });

    it('derives the director answer from the saved signer data', () => {
        // Given a saved director name, a saved invitation email only, and nothing saved
        const directorAccount: OnboardingAccount = {achData: {corpay: {signerFullName: 'Ada Lovelace'}}};
        const invitedAccount: OnboardingAccount = {achData: {corpay: {signerEmail: 'director@example.com'}}};

        // When the answers are read without a draft answer
        // Then a saved name means the user is the director, an email means the user invited one, and else there is no answer
        expect(getSignerAnswers(getTestFlowData({account: directorAccount, currency: EUR})).isUserDirector).toBe(true);
        expect(getSignerAnswers(getTestFlowData({account: invitedAccount, currency: EUR})).isUserDirector).toBe(false);
        expect(getSignerAnswers(getTestFlowData({currency: EUR})).isUserDirector).toBeUndefined();
    });

    it('reads the owners that the server saved while the draft has no list', () => {
        // Given saved owners whose full names include a middle name
        const account: OnboardingAccount = {
            achData: {corpay: {beneficialOwners: [{uid: CURRENT_USER_KEY, fullName: 'Ada King Lovelace', ownershipPercentage: '60'}]}},
        };

        // When the answers are read
        const answers = getOwnersAnswers(getTestFlowData({account, currency: EUR}));

        // Then the owner keeps its ID and the middle name stays in the last name (BC-09)
        expect(answers.owners).toEqual([{id: CURRENT_USER_KEY, firstName: 'Ada', lastName: 'King Lovelace', ownershipPercentage: '60'}]);
    });

    it('gives empty defaults without a draft and without server data', () => {
        // Given a new setup
        // When the answers are read
        const data = getTestFlowData({currency: EUR});

        // Then text is empty, checkboxes are unchecked, files are empty and the questions have no answer yet
        expect(getCountryAnswers(data).country).toBe('');
        expect(getSignerAnswers(data)).toEqual({isUserDirector: undefined, signerFullName: '', signerJobTitle: ''});
        expect(getAgreementsAnswers(data)).toEqual({
            authorizedToBindClientToAgreement: false,
            agreeToTermsAndConditions: false,
            consentToPrivacyNotice: false,
            bankStatement: [],
            achAuthorizationForm: [],
        });
        expect(getOwnersAnswers(data)).toEqual({ownsMoreThan25Percent: undefined, anyIndividualOwn25PercentOrMore: undefined, owners: []});
    });
});
