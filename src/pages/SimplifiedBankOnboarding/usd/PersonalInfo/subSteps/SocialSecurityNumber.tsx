/**
 * The SSN sub page: a one-field form with a validator that lives in the component.
 */
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import SingleFieldStep from '@components/SubStepForms/SingleFieldStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import type {SubPageProps} from '@hooks/useSubPage/types';

import {getFieldRequiredErrors, isValidSSNLastFour} from '@libs/ValidationUtils';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const STEP_FIELDS = [INPUT_IDS.SSN_LAST_4];

function SocialSecurityNumber({onNext, onMove, isEditing}: SubPageProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);

    const defaultSsnLast4 = account?.achData?.ssnLast4 ?? '';

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> => {
        const errors = getFieldRequiredErrors(values, STEP_FIELDS, translate);
        if (values.ssnLast4 && !isValidSSNLastFour(values.ssnLast4)) {
            errors.ssnLast4 = translate('bankAccount.error.ssnLast4');
        }
        return errors;
    };

    const handleSubmit = useOnboardingStepFormSubmit({fieldIds: STEP_FIELDS, onNext, shouldSaveDraft: isEditing});

    return (
        <SingleFieldStep<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            formTitle={translate('personalInfoStep.enterTheLast4')}
            formDisclaimer={`The mock server rejects ${SBO_CONST.MOCK.REJECTED_SSN_LAST_4}.`}
            validate={validate}
            onSubmit={handleSubmit}
            inputId={INPUT_IDS.SSN_LAST_4}
            inputLabel={translate('personalInfoStep.last4SSN')}
            inputMode={CONST.INPUT_MODE.NUMERIC}
            defaultValue={defaultSsnLast4}
            maxLength={SBO_CONST.SSN_LAST_4_LENGTH}
            shouldShowHelpLinks={false}
            enabledWhenOffline
            shouldDelayAutoFocus
        />
    );
}

export default SocialSecurityNumber;
