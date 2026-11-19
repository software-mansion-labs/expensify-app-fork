import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {CorpayData} from '@pages/SimplifiedBankOnboarding/types/onyx';
import getInitialSubPageForSignerInfo from '@pages/SimplifiedBankOnboarding/utils/getInitialSubPageForSignerInfo';

const {IS_DIRECTOR, HANG_TIGHT} = SBO_CONST.NON_USD.SIGNER_INFO_SUB_PAGES;
const {EUR, AUD} = SBO_CONST.CURRENCY;

describe('getInitialSubPageForSignerInfo', () => {
    test.each<[string, string, CorpayData | undefined, string]>([
        ['an AUD account without invited directors', AUD, undefined, IS_DIRECTOR],
        ['an AUD account with an invited first director', AUD, {signerEmail: 'director@example.com'}, HANG_TIGHT],
        ['an AUD account with an invited second director', AUD, {signerFullName: 'Jane Doe', secondSignerEmail: 'second@example.com'}, HANG_TIGHT],
        ['an EUR account without an invited signer', EUR, {}, IS_DIRECTOR],
        ['an EUR account waiting for the invited signer', EUR, {signerEmail: 'director@example.com'}, HANG_TIGHT],
        ['an EUR account whose invited signer answered', EUR, {signerEmail: 'director@example.com', signerFullName: 'Jane Doe'}, IS_DIRECTOR],
    ])('opens %s on the expected sub page', (_, currency, corpay, expectedSubPage) => {
        // Given what the server knows about the directors

        // When the signer step opens without a sub page
        const subPage = getInitialSubPageForSignerInfo(corpay, currency);

        // Then the user waits only while an invited director has not answered
        expect(subPage).toBe(expectedSubPage);
    });
});
