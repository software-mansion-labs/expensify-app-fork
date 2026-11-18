import getAddressInputKeys from '@components/DynamicForm/utils/getAddressInputKeys';

import {getMissingPersonalInfoPrefill, getPersonalInfoParams} from '@pages/ReimbursementAccount/USD/Requestor/PersonalInfo/personalInfoForm';

import type {RequestorStepProps} from '@src/types/form/ReimbursementAccountForm';

const SAVED: RequestorStepProps = {
    firstName: 'Alberta',
    lastName: 'Charleson',
    dob: '1990-01-01',
    ssnLast4: '1234',
    requestorAddressStreet: '1 Main Street',
    requestorAddressCity: 'Springfield',
    requestorAddressState: 'IL',
    requestorAddressZipCode: '62701',
    isOnfidoSetupComplete: false,
};

describe('personalInfoForm', () => {
    it('sends back what the bank account holds when the user changes nothing', () => {
        // Given a bank account with a saved personal info step and an empty draft
        // When the saved answers are copied to the draft and the draft is turned into API params
        const draft = getMissingPersonalInfoPrefill(SAVED, {});

        // Then the params equal what was saved, so the address parts survive the move under the street's key and back
        expect(getPersonalInfoParams(draft, SAVED.isOnfidoSetupComplete)).toEqual(SAVED);
    });

    it('keeps the answers the draft already has', () => {
        // Given a draft where the user retyped the first name and cleared the city
        const draft = {firstName: 'Bertha', [getAddressInputKeys('requestorAddressStreet').city]: ''};

        // When the saved answers are compared with the draft
        const missingPrefill = getMissingPersonalInfoPrefill(SAVED, draft);

        // Then neither is prefilled, since a key the draft holds is the user's newest answer
        expect(missingPrefill).not.toHaveProperty('firstName');
        expect(missingPrefill).not.toHaveProperty(getAddressInputKeys('requestorAddressStreet').city);
        expect(missingPrefill).toHaveProperty('lastName', 'Charleson');
    });
});
