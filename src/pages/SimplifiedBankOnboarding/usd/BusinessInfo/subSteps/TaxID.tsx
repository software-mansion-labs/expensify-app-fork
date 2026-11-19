/**
 * The company tax ID sub page: a one-field form that accepts 9 digits, with or without separators, which the container
 * strips before it sends the value. The mock server rejects one tax ID so the error path can be tried.
 */
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import SingleFieldStep from '@components/SubStepForms/SingleFieldStep';

import useLocalize from '@hooks/useLocalize';

import {getFieldRequiredErrors, isValidTaxID} from '@libs/ValidationUtils';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type BusinessInfoSubPageProps from '@pages/SimplifiedBankOnboarding/usd/BusinessInfo/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const STEP_FIELDS = [INPUT_IDS.COMPANY_TAX_ID];

function TaxID({onNext, onMove, isEditing, values: stepValues, isLocked}: BusinessInfoSubPageProps) {
    const {translate} = useLocalize();

    const defaultCompanyTaxID = stepValues.companyTaxID;
    const shouldDisableCompanyTaxID = isLocked && !!defaultCompanyTaxID;

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> => {
        const errors = getFieldRequiredErrors(values, STEP_FIELDS, translate);
        if (values.companyTaxID && !isValidTaxID(values.companyTaxID)) {
            errors.companyTaxID = translate('bankAccount.error.taxID');
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
            formTitle={translate('businessInfoStep.enterYourCompanyTaxIdNumber')}
            formDisclaimer={`The mock server rejects ${SBO_CONST.MOCK.REJECTED_TAX_ID}.`}
            validate={validate}
            onSubmit={handleSubmit}
            inputId={INPUT_IDS.COMPANY_TAX_ID}
            inputLabel={translate('businessInfoStep.taxIDNumber')}
            defaultValue={defaultCompanyTaxID}
            shouldUseDefaultValue={shouldDisableCompanyTaxID}
            disabled={shouldDisableCompanyTaxID}
            placeholder={translate('businessInfoStep.taxIDNumberPlaceholder')}
            inputMode={CONST.INPUT_MODE.NUMERIC}
            shouldShowHelpLinks={false}
            shouldDelayAutoFocus
        />
    );
}

export default TaxID;
