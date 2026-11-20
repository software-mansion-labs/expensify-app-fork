import useLocalize from '@hooks/useLocalize';

import type {TextInputID} from '@pages/SimplifiedBankOnboarding/types/form';

import React from 'react';

import TextField from './TextField';

type LegalNameFieldsProps = {
    firstNameID: TextInputID;
    lastNameID: TextInputID;
    firstName: string;
    lastName: string;
};

/** The first and last name inputs of a person, such as the user or a beneficial owner. `getLegalNameInputs` holds their rules. */
function LegalNameFields({firstNameID, lastNameID, firstName, lastName}: LegalNameFieldsProps) {
    const {translate} = useLocalize();

    return (
        <>
            <TextField
                inputID={firstNameID}
                label={translate('personalInfoStep.legalFirstName')}
                defaultValue={firstName}
            />
            <TextField
                inputID={lastNameID}
                label={translate('personalInfoStep.legalLastName')}
                defaultValue={lastName}
            />
        </>
    );
}

export default LegalNameFields;
