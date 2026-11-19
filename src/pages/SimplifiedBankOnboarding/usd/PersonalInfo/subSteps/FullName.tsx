/**
 * The legal name sub page. Its default values come from the server data only, while the sibling sub pages also look at
 * the draft. The real flow has the same difference between sub pages of one step.
 */
import FullNameStep from '@components/SubStepForms/FullNameStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import type {SubPageProps} from '@hooks/useSubPage/types';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const STEP_FIELDS = [INPUT_IDS.FIRST_NAME, INPUT_IDS.LAST_NAME];

function FullName({onNext, onMove, isEditing}: SubPageProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);

    const defaultValues = {
        firstName: account?.achData?.firstName ?? '',
        lastName: account?.achData?.lastName ?? '',
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
