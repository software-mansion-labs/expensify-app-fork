import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {getNonUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/nonUSD/nonUSDAnswers';
import {getGlobalOwnersFromServer, getUSDOwnersFromServer, splitFullName} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/serverOwners';
import {getUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/usd/usdAnswers';

const {EUR, AUD} = SBO_CONST.CURRENCY;
const {CURRENT_USER_KEY} = SBO_CONST.NON_USD;

describe('getUSDAnswers', () => {
    it('takes the draft over the server', () => {
        // Given a name that the server saved and a different one that the user typed since
        const account: OnboardingAccount = {achData: {firstName: 'Saved', companyName: 'Saved Inc'}};

        // When the answers are read
        const answers = getUSDAnswers({firstName: 'Typed'}, account);

        // Then the typed name wins, and a field the user did not touch shows the saved value
        expect(answers.firstName).toBe('Typed');
        expect(answers.companyName).toBe('Saved Inc');
    });

    it('keeps false in the draft over true on the server', () => {
        // Given answers that the server saved as true and the user changed to false
        const account: OnboardingAccount = {achData: {ownsMoreThan25Percent: true, isAuthorizedToUseBankAccount: true}};

        // When the answers are read
        const answers = getUSDAnswers({ownsMoreThan25Percent: false, isAuthorizedToUseBankAccount: false}, account);

        // Then false stays false, because a missing answer is undefined and false is an answer
        expect(answers.ownsMoreThan25Percent).toBe(false);
        expect(answers.isAuthorizedToUseBankAccount).toBe(false);
    });

    it('gives empty defaults without a draft and without server data', () => {
        // Given a new setup
        // When the answers are read
        const answers = getUSDAnswers(undefined, undefined);

        // Then text is empty, checkboxes are unchecked and the yes or no questions have no answer yet
        expect(answers.routingNumber).toBe('');
        expect(answers.acceptTermsAndConditions).toBe(false);
        expect(answers.ownsMoreThan25Percent).toBeUndefined();
        expect(answers.hasOtherBeneficialOwners).toBeUndefined();
        expect(answers.setupType).toBeUndefined();
        expect(answers.owners).toEqual([]);
        expect(answers.kybFiles).toEqual({companyTaxIDDocument: [], companyAddressDocument: []});
    });

    it('reads the setup type from the draft, then from the server sub step', () => {
        // Given a server that saved a manual setup, and a server that saved none
        const manualAccount: OnboardingAccount = {achData: {subStep: SBO_CONST.SETUP_TYPE.MANUAL}};
        const emptyAccount: OnboardingAccount = {achData: {subStep: ''}};

        // When the answers are read with and without a picked option in the draft
        // Then the picked option wins, the saved one follows, and an empty sub step means no setup type
        expect(getUSDAnswers({setupType: SBO_CONST.SETUP_TYPE.PLAID}, manualAccount).setupType).toBe(SBO_CONST.SETUP_TYPE.PLAID);
        expect(getUSDAnswers(undefined, manualAccount).setupType).toBe(SBO_CONST.SETUP_TYPE.MANUAL);
        expect(getUSDAnswers(undefined, emptyAccount).setupType).toBeUndefined();
    });

    it('reads the owners that the server saved while the draft has no list', () => {
        // Given a saved owners step with one other owner
        const account: OnboardingAccount = {
            achData: {ownsMoreThan25Percent: false, beneficialOwners: [{firstName: 'Grace', lastName: 'Hopper', dob: '1906-12-09'}], beneficialOwnerKeys: ['owner-a']},
        };

        // When the answers are read
        const answers = getUSDAnswers(undefined, account);

        // Then the saved owner is in the list with its saved ID, and the saved step answers that someone else owns 25%
        expect(answers.owners).toEqual([{id: 'owner-a', firstName: 'Grace', lastName: 'Hopper', dob: '1906-12-09'}]);
        expect(answers.hasOtherBeneficialOwners).toBe(true);
    });

    it('answers no other owner when the saved owners step saved none', () => {
        // Given a saved owners step without other owners
        const account: OnboardingAccount = {achData: {ownsMoreThan25Percent: true, beneficialOwners: []}};

        // When the answers are read
        const answers = getUSDAnswers(undefined, account);

        // Then the question has the answer no, so the owners step can resume past it
        expect(answers.hasOtherBeneficialOwners).toBe(false);
    });

    it('takes the owner list of the draft over the saved owners', () => {
        // Given saved owners and a list that the user edited in the draft
        const account: OnboardingAccount = {achData: {ownsMoreThan25Percent: false, beneficialOwners: [{firstName: 'Grace', lastName: 'Hopper', dob: '1906-12-09'}]}};

        // When the answers are read with an empty list in the draft
        const answers = getUSDAnswers({usdOwners: []}, account);

        // Then the empty list wins, because the user removed the saved owner
        expect(answers.owners).toEqual([]);
    });
});

describe('getNonUSDAnswers', () => {
    it('takes the draft over the server', () => {
        // Given a company that the global provider saved and a name that the user typed since (BC-08)
        const account: OnboardingAccount = {achData: {corpay: {companyName: 'Saved GmbH', businessType: 'llc', iban: 'DE00SAVED'}}};

        // When the answers are read
        const answers = getNonUSDAnswers({companyName: 'Typed GmbH', iban: 'DE00TYPED'}, account, EUR);

        // Then the typed values win, and a field the user did not touch shows the saved value
        expect(answers.companyName).toBe('Typed GmbH');
        expect(answers.businessType).toBe('llc');
        expect(answers.bankFieldValues.iban).toBe('DE00TYPED');
        expect(answers.bankFieldValues.bankName).toBe('');
    });

    it('keeps false in the draft over true on the server', () => {
        // Given agreements and an owner answer that the server saved as true and the user changed to false
        const account: OnboardingAccount = {achData: {corpay: {consentToPrivacyNotice: true, ownsMoreThan25Percent: true, signerFullName: 'Ada Lovelace'}}};

        // When the answers are read
        const answers = getNonUSDAnswers({consentToPrivacyNotice: false, ownsMoreThan25Percent: false, isUserDirector: false}, account, EUR);

        // Then false stays false
        expect(answers.consentToPrivacyNotice).toBe(false);
        expect(answers.ownsMoreThan25Percent).toBe(false);
        expect(answers.isUserDirector).toBe(false);
    });

    it('fixes the country of an AUD setup', () => {
        // Given an AUD setup whose draft names another country
        // When the answers are read
        const answers = getNonUSDAnswers({country: 'DE'}, undefined, AUD);

        // Then the country is Australia, the only country of AUD
        expect(answers.country).toBe(SBO_CONST.COUNTRY.AU);
    });

    it('reads the country from the draft, then from the server', () => {
        // Given a country that the server saved
        const account: OnboardingAccount = {achData: {country: 'FR'}};

        // When the answers are read with and without a picked country
        // Then the picked country wins and the saved one follows
        expect(getNonUSDAnswers({country: 'ES'}, account, EUR).country).toBe('ES');
        expect(getNonUSDAnswers(undefined, account, EUR).country).toBe('FR');
    });

    it('derives the director answer from the saved signer data', () => {
        // Given a saved director name, a saved invitation email only, and nothing saved
        const directorAccount: OnboardingAccount = {achData: {corpay: {signerFullName: 'Ada Lovelace'}}};
        const invitedAccount: OnboardingAccount = {achData: {corpay: {signerEmail: 'director@example.com'}}};

        // When the answers are read without a draft answer
        // Then a saved name means the user is the director, an email means the user invited one, and else there is no answer
        expect(getNonUSDAnswers(undefined, directorAccount, EUR).isUserDirector).toBe(true);
        expect(getNonUSDAnswers(undefined, invitedAccount, EUR).isUserDirector).toBe(false);
        expect(getNonUSDAnswers(undefined, undefined, EUR).isUserDirector).toBeUndefined();
    });

    it('reads the owners that the server saved while the draft has no list', () => {
        // Given saved owners whose full names include a middle name
        const account: OnboardingAccount = {
            achData: {corpay: {beneficialOwners: [{uid: CURRENT_USER_KEY, fullName: 'Ada King Lovelace', ownershipPercentage: '60'}]}},
        };

        // When the answers are read
        const answers = getNonUSDAnswers(undefined, account, EUR);

        // Then the owner keeps its ID and the middle name stays in the last name (BC-09)
        expect(answers.owners).toEqual([{id: CURRENT_USER_KEY, firstName: 'Ada', lastName: 'King Lovelace', ownershipPercentage: '60'}]);
    });

    it('gives empty defaults without a draft and without server data', () => {
        // Given a new setup
        // When the answers are read
        const answers = getNonUSDAnswers(undefined, undefined, EUR);

        // Then text is empty, checkboxes are unchecked, files are empty and the questions have no answer yet
        expect(answers.currency).toBe(EUR);
        expect(answers.country).toBe('');
        expect(answers.signerFullName).toBe('');
        expect(answers.agreeToTermsAndConditions).toBe(false);
        expect(answers.anyIndividualOwn25PercentOrMore).toBeUndefined();
        expect(answers.bankStatement).toEqual([]);
        expect(answers.owners).toEqual([]);
    });
});

describe('serverOwners', () => {
    it('splits a full name at the first word', () => {
        // Given full names with one, two and three words, and extra spaces
        // When they are split
        // Then the first word is the first name and the rest is the last name
        expect(splitFullName('Ada')).toEqual({firstName: 'Ada', lastName: ''});
        expect(splitFullName('Ada Lovelace')).toEqual({firstName: 'Ada', lastName: 'Lovelace'});
        expect(splitFullName('  Ada  King   Lovelace ')).toEqual({firstName: 'Ada', lastName: 'King Lovelace'});
    });

    it('gives a USD owner without a saved key an ID from its position', () => {
        // Given two saved owners and a key for the first one only
        const owners = getUSDOwnersFromServer({
            beneficialOwners: [
                {firstName: 'Grace', lastName: 'Hopper', dob: '1906-12-09'},
                {firstName: 'Alan', lastName: 'Turing', dob: '1912-06-23'},
            ],
            beneficialOwnerKeys: ['owner-a'],
        });

        // When the list is read
        // Then each owner has an ID that stays the same for the same data, so a render does not change it
        expect(owners.map((owner) => owner.id)).toEqual(['owner-a', 'owner-1']);
    });

    it('reads no global owners without server data', () => {
        // Given no corpay data
        // When the list is read
        // Then the list is empty
        expect(getGlobalOwnersFromServer(undefined)).toEqual([]);
    });
});
