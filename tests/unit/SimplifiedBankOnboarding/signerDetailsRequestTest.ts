import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';
import invitedSignerDetailsRequest from '@pages/SimplifiedBankOnboarding/flows/enterSignerInfo/invitedSignerDetailsRequest';
import {signerDetailsRequest as nonUSDSignerDetailsRequest} from '@pages/SimplifiedBankOnboarding/flows/nonUSD/signer/signerRequests';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

const {EUR} = SBO_CONST.CURRENCY;
const {CURRENT_USER_KEY} = SBO_CONST.NON_USD;
const BANK_ACCOUNT = {policyID: '1', bankAccountID: 42};

function getSavedData(saved: Partial<FlowData>): FlowData {
    return {bankAccount: BANK_ACCOUNT, account: undefined, draft: {}, currency: EUR, ...saved};
}

describe('signerDetailsRequest', () => {
    it('sends the name of the owner step for a user who owns 25% or more', () => {
        // Given a user who gave their name as an owner and typed a job title
        const saved = getSavedData({
            draft: {
                ownsMoreThan25Percent: true,
                globalOwners: [{id: CURRENT_USER_KEY, firstName: 'Owner', lastName: 'Name', ownershipPercentage: '50'}],
                signerJobTitle: 'CEO',
            },
        });

        // When the signer step builds the director request
        const spec = nonUSDSignerDetailsRequest.build(saved);

        // Then the name page was skipped, so the request sends the owner name with the job title
        expect(spec).toMatchObject({
            type: 'write',
            command: WRITE_COMMANDS.SAVE_ONBOARDING_DIRECTOR_INFORMATION,
            params: {...BANK_ACCOUNT, signerFullName: 'Owner Name', signerJobTitle: 'CEO'},
        });
    });

    it('sends the typed name for a user who is not an owner', () => {
        // Given a user who is not an owner and typed a director name
        const saved = getSavedData({draft: {ownsMoreThan25Percent: false, signerFullName: 'Typed Director', signerJobTitle: 'CFO'}});

        // When the signer step builds the director request
        const spec = nonUSDSignerDetailsRequest.build(saved);

        // Then the typed name is sent
        expect(spec?.params).toMatchObject({signerFullName: 'Typed Director', signerJobTitle: 'CFO'});
    });

    it('sends the invited director form for the bank account of the link and clears that form after a success', () => {
        // Given the draft of the invited director form, saved for the bank account that the link names
        const saved = getSavedData({draft: {signerFullName: 'Invited Director', signerJobTitle: 'COO'}});

        // When the invited director page builds its request
        const spec = invitedSignerDetailsRequest.build(saved);

        // Then it sends the values of that form, and its success data clears the form draft, so no page writes to it
        // and the signer step never touches it (BC-16)
        expect(spec?.params).toEqual({...BANK_ACCOUNT, signerFullName: 'Invited Director', signerJobTitle: 'COO'});
        expect(spec?.onyxData?.successData).toEqual([{onyxMethod: Onyx.METHOD.SET, key: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT, value: null}]);
    });

    it('leaves the invited director form alone when the signer step saves the director', () => {
        // Given any data of the signer step
        const saved = getSavedData({draft: {signerFullName: 'Director', signerJobTitle: 'CEO'}});

        // When the signer step builds the director request
        const spec = nonUSDSignerDetailsRequest.build(saved);

        // Then none of its Onyx data writes to the invited director form, so that page is never moved by this request
        const updates = [...(spec?.onyxData?.optimisticData ?? []), ...(spec?.onyxData?.successData ?? []), ...(spec?.onyxData?.failureData ?? [])];
        expect(updates.some((update) => update.key === ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT)).toBe(false);
    });
});
