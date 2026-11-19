/**
 * The date of birth sub page. It prefers the server data over the draft, the opposite of what the confirmation page does.
 */
import DateOfBirthStep from '@components/SubStepForms/DateOfBirthStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import type {SubPageProps} from '@hooks/useSubPage/types';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const STEP_FIELDS = [INPUT_IDS.DOB];

function DateOfBirth({onNext, onMove, isEditing}: SubPageProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const dobDefaultValue = account?.achData?.dob ?? draft?.dob ?? '';

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
            dobDefaultValue={dobDefaultValue}
        />
    );
}

export default DateOfBirth;
