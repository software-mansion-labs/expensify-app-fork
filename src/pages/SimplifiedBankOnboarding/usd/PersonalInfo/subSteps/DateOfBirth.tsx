/**
 * The date of birth sub page. It shows the value that the step resolved.
 */
import DateOfBirthStep from '@components/SubStepForms/DateOfBirthStep';

import useLocalize from '@hooks/useLocalize';
import type {SubPageProps} from '@hooks/useSubPage/types';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {PersonalInfoValues} from '@pages/SimplifiedBankOnboarding/values/codecs/usdPersonalInfo';
import type ResolvedValuesProps from '@pages/SimplifiedBankOnboarding/values/types';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const STEP_FIELDS = [INPUT_IDS.DOB];

function DateOfBirth({onNext, onMove, isEditing, values}: SubPageProps & ResolvedValuesProps<PersonalInfoValues>) {
    const {translate} = useLocalize();

    const handleSubmit = useOnboardingStepFormSubmit({fieldIds: STEP_FIELDS, onNext, shouldSaveDraft: isEditing});

    return (
        <DateOfBirthStep<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            formTitle={translate('personalInfoStep.enterYourDateOfBirth')}
            onSubmit={handleSubmit}
            stepFields={STEP_FIELDS}
            dobInputID={INPUT_IDS.DOB}
            dobDefaultValue={values.dob}
        />
    );
}

export default DateOfBirth;
