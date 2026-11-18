import {getPersonalInfoParams, getPersonalInfoPrefill} from '@pages/ReimbursementAccount/USD/Requestor/PersonalInfo/personalInfoForm';

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
        // Given a bank account with a saved personal info step
        // When its answers prefill the form and the form's answers are turned into API params
        const answers = getPersonalInfoPrefill(SAVED);

        // Then the params equal what was saved, so the address parts survive the move under the street's key and back
        expect(getPersonalInfoParams(answers, SAVED.isOnfidoSetupComplete)).toEqual(SAVED);
    });
});
