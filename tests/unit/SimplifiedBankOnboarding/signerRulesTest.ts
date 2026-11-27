import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {getSignerEmailMode, getSignerFullName, shouldAskForSignerName} from '@pages/SimplifiedBankOnboarding/flows/nonUSD/signer/signerRules';

import {getTestFlowData} from '../../utils/BankOnboardingLabTestUtils';

const {EUR, AUD} = SBO_CONST.CURRENCY;
const {CURRENT_USER_KEY} = SBO_CONST.NON_USD;

/** A server that saved the user as an owner and the user as the director under another name */
const ACCOUNT_WITH_SAVED_OWNER: OnboardingAccount = {
    achData: {
        corpay: {
            ownsMoreThan25Percent: true,
            beneficialOwners: [{uid: CURRENT_USER_KEY, fullName: 'Saved Owner', ownershipPercentage: '50'}],
            signerFullName: 'Saved Director',
        },
    },
};

describe('signerRules', () => {
    describe('README scenario 6: the owner answer changes between two visits of the signer step', () => {
        it('asks for the name again after the user changed "I own 25% or more" to "No"', () => {
            // Given a server that saved the user as an owner, and a draft where the user changed the answer to "No"
            const data = getTestFlowData({draft: {ownsMoreThan25Percent: false}, account: ACCOUNT_WITH_SAVED_OWNER, currency: EUR});

            // When the signer step reads its rules
            // Then the new answer wins over the saved one, so the step asks for the name and sends the signer name
            expect(shouldAskForSignerName(data)).toBe(true);
            expect(getSignerFullName(data)).toBe('Saved Director');
        });

        it('takes the name of the owner step after the user changed the answer to "Yes"', () => {
            // Given a server without owners, and a draft where the user answered "Yes" and gave their name as an owner
            const account: OnboardingAccount = {achData: {corpay: {ownsMoreThan25Percent: false}}};
            const data = getTestFlowData({
                draft: {ownsMoreThan25Percent: true, globalOwners: [{id: CURRENT_USER_KEY, firstName: 'Typed', lastName: 'Owner', ownershipPercentage: '30'}]},
                account,
                currency: EUR,
            });

            // When the signer step reads its rules
            // Then the name page is left out and the director request sends the name of the owner step
            expect(shouldAskForSignerName(data)).toBe(false);
            expect(getSignerFullName(data)).toBe('Typed Owner');
        });

        it('asks for the name when the user is an owner without a name to send', () => {
            // Given an answer "Yes" whose owner entry of the user is missing
            const data = getTestFlowData({draft: {ownsMoreThan25Percent: true, globalOwners: []}, currency: EUR});

            // When the signer step reads its rules
            // Then the step asks for the name, so the director request never sends an empty name
            expect(shouldAskForSignerName(data)).toBe(true);
        });
    });

    describe('getSignerFullName', () => {
        it('reads the owner name that the server saved when the draft has no owners', () => {
            // Given a user who comes back to a setup whose owners step the server saved
            const data = getTestFlowData({account: ACCOUNT_WITH_SAVED_OWNER, currency: EUR});

            // When the director name is read
            // Then it is the name of the user's owner entry, not the saved director name
            expect(getSignerFullName(data)).toBe('Saved Owner');
        });

        it('uses the signer name when the user is not an owner', () => {
            // Given a user who is not an owner and typed a director name
            const data = getTestFlowData({draft: {ownsMoreThan25Percent: false, signerFullName: 'Typed Director'}, currency: EUR});

            // When the director name is read
            // Then the typed name is sent
            expect(getSignerFullName(data)).toBe('Typed Director');
        });
    });

    describe('the emails of the directors', () => {
        it('asks an AUD user who is not a director for two emails', () => {
            // Given an AUD workspace and a user who is not a director
            // When the email page picks its inputs
            // Then it asks for both directors, because AUD needs two
            expect(getSignerEmailMode(false, AUD)).toBe('two');
            expect(getSignerEmailMode(undefined, AUD)).toBe('two');
        });

        it('asks an AUD director for the second email only', () => {
            // Given an AUD workspace and a user who is a director
            // When the email page picks its inputs
            // Then it asks only for the second director, because the user is the first one
            expect(getSignerEmailMode(true, AUD)).toBe('secondOnly');
        });

        it('asks for one email outside AUD', () => {
            // Given a workspace in another currency
            // When the email page picks its inputs
            // Then one director is enough
            expect(getSignerEmailMode(false, EUR)).toBe('one');
        });
    });
});
