/**
 * The name sub page of a signer. Both the signer step and the page of an invited director render it, each with its own
 * form, like the real flow where the two flows have their own copy of this page.
 */
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import SingleFieldStep from '@components/SubStepForms/SingleFieldStep';

import useLocalize from '@hooks/useLocalize';
import useStepFormSubmit from '@hooks/useStepFormSubmit';

import {getFieldRequiredErrors, isValidLegalName} from '@libs/ValidationUtils';

import type {SignerDetailsSubPageProps, SignerFormID} from '@pages/SimplifiedBankOnboarding/nonUSD/SignerInfo/types';
import useSignerDraftValue from '@pages/SimplifiedBankOnboarding/nonUSD/SignerInfo/useSignerDraftValue';
import {SIGNER_INPUT_IDS} from '@pages/SimplifiedBankOnboarding/types/form';

import CONST from '@src/CONST';

import React from 'react';

const STEP_FIELDS = [SIGNER_INPUT_IDS.SIGNER_FULL_NAME];

function Name({onNext, onMove, isEditing, formID}: SignerDetailsSubPageProps) {
    const {translate} = useLocalize();
    const defaultValue = useSignerDraftValue(formID, SIGNER_INPUT_IDS.SIGNER_FULL_NAME);

    const validate = (values: FormOnyxValues<SignerFormID>): FormInputErrors<SignerFormID> => {
        const errors = getFieldRequiredErrors(values, STEP_FIELDS, translate);
        if (values.signerFullName && !isValidLegalName(values.signerFullName)) {
            errors.signerFullName = translate('bankAccount.error.fullName');
        }
        return errors;
    };

    const handleSubmit = useStepFormSubmit<SignerFormID>({formId: formID, fieldIds: STEP_FIELDS, onNext, shouldSaveDraft: isEditing});

    return (
        <SingleFieldStep<SignerFormID>
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            formID={formID}
            formTitle={translate('signerInfoStep.whatsYourName')}
            validate={validate}
            onSubmit={handleSubmit}
            inputId={SIGNER_INPUT_IDS.SIGNER_FULL_NAME}
            inputLabel={translate('signerInfoStep.fullName')}
            inputMode={CONST.INPUT_MODE.TEXT}
            defaultValue={defaultValue}
            shouldShowHelpLinks={false}
            shouldDelayAutoFocus
        />
    );
}

export default Name;
