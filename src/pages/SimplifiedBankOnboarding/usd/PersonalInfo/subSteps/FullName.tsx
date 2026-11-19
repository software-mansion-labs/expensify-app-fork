/**
 * The legal name sub page. It shows the values that the step resolved.
 */
import FullNameStep from '@components/SubStepForms/FullNameStep';

import useLocalize from '@hooks/useLocalize';
import type {SubPageProps} from '@hooks/useSubPage/types';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {PersonalInfoValues} from '@pages/SimplifiedBankOnboarding/values/codecs/usdPersonalInfo';
import type ResolvedValuesProps from '@pages/SimplifiedBankOnboarding/values/types';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const STEP_FIELDS = [INPUT_IDS.FIRST_NAME, INPUT_IDS.LAST_NAME];

function FullName({onNext, onMove, isEditing, values}: SubPageProps & ResolvedValuesProps<PersonalInfoValues>) {
    const {translate} = useLocalize();

    const defaultValues = {
        firstName: values.firstName,
        lastName: values.lastName,
    };

    const handleSubmit = useOnboardingStepFormSubmit({fieldIds: STEP_FIELDS, onNext, shouldSaveDraft: isEditing});

    return (
        <FullNameStep<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            formTitle={translate('personalInfoStep.enterYourLegalFirstAndLast')}
            onSubmit={handleSubmit}
            stepFields={STEP_FIELDS}
            firstNameInputID={INPUT_IDS.FIRST_NAME}
            lastNameInputID={INPUT_IDS.LAST_NAME}
            defaultValues={defaultValues}
            shouldShowHelpLinks={false}
        />
    );
}

export default FullName;
