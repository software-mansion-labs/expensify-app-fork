import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import getSignerStartPage from '@pages/SimplifiedBankOnboarding/flows/nonUSD/signer/getSignerStartPage';
import SIGNER_PAGES from '@pages/SimplifiedBankOnboarding/flows/nonUSD/signer/signerPages';

const {EUR, AUD} = SBO_CONST.CURRENCY;
const {IS_DIRECTOR, HANG_TIGHT} = SIGNER_PAGES;

describe('getSignerStartPage', () => {
    it('starts at the director question before anything was saved', () => {
        // Given no saved signer data
        // When the signer step opens
        // Then the user is asked whether they are a director, in any currency
        expect(getSignerStartPage(undefined, EUR)).toBe(IS_DIRECTOR);
        expect(getSignerStartPage({}, AUD)).toBe(IS_DIRECTOR);
    });

    it('waits for the invited director outside AUD', () => {
        // Given a server that holds the email of an invited director and no director name
        // When the signer step opens
        // Then it shows the waiting page
        expect(getSignerStartPage({signerEmail: 'director@example.com'}, EUR)).toBe(HANG_TIGHT);
    });

    it('asks the question again outside AUD once a director name is saved', () => {
        // Given a server that holds both the email and the name of the director
        // When the signer step opens
        // Then nobody is left to wait for, so the step starts at the question
        expect(getSignerStartPage({signerEmail: 'director@example.com', signerFullName: 'Director'}, EUR)).toBe(IS_DIRECTOR);
    });

    it('waits in AUD as soon as one invitation was saved', () => {
        // Given AUD servers that hold either email
        // When the signer step opens
        // Then it shows the waiting page, even when a director name is saved, because AUD needs a second director
        expect(getSignerStartPage({signerEmail: 'director@example.com'}, AUD)).toBe(HANG_TIGHT);
        expect(getSignerStartPage({secondSignerEmail: 'second@example.com', signerFullName: 'Director'}, AUD)).toBe(HANG_TIGHT);
    });
});
