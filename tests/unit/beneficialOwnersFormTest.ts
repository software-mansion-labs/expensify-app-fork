import getAddressInputKeys from '@components/DynamicForm/utils/getAddressInputKeys';

import {getBeneficialOwnersParams} from '@pages/ReimbursementAccount/USD/BeneficialOwnerInfo/beneficialOwnersForm';

const ADDRESS_KEYS = getAddressInputKeys('street');

const OWNER = {
    id: 'owner1',
    firstName: 'Alberta',
    lastName: 'Charleson',
    dob: '1980-01-31',
    ssnLast4: '1234',
    [ADDRESS_KEYS.street]: '1 Main Street',
    [ADDRESS_KEYS.city]: 'Springfield',
    [ADDRESS_KEYS.state]: 'IL',
    [ADDRESS_KEYS.zipCode]: '62701',
};

describe('beneficialOwnersForm', () => {
    it('sends each listed owner in the shape the old step sent, keyed by its entry ID', () => {
        // Given a user who owns part of the company and listed one other owner
        const answers = {ownsMoreThan25Percent: true, hasOtherBeneficialOwners: true, beneficialOwnerList: [OWNER]};

        // When the answers are turned into API params
        const params = getBeneficialOwnersParams(answers);

        // Then the API gets the owner's details with the address parts under their own keys, since the server reads that shape, and the entry ID as its key
        expect(params.ownsMoreThan25Percent).toBe(true);
        expect(JSON.parse(params.beneficialOwners ?? '')).toEqual([
            {firstName: 'Alberta', lastName: 'Charleson', dob: '1980-01-31', ssnLast4: '1234', street: '1 Main Street', city: 'Springfield', state: 'IL', zipCode: '62701'},
        ]);
        expect(params.beneficialOwnerKeys).toEqual(['owner1']);
    });

    it('sends no owners when the list was not asked', () => {
        // Given a user who said no one else owns 25%, so the list page was skipped and its answer left out
        const answers = {ownsMoreThan25Percent: false, hasOtherBeneficialOwners: false};

        // When the answers are turned into API params
        const params = getBeneficialOwnersParams(answers);

        // Then the API gets an empty owner list rather than owners listed on an earlier visit
        expect(params).toEqual({ownsMoreThan25Percent: false, beneficialOwners: '[]', beneficialOwnerKeys: []});
    });
});
