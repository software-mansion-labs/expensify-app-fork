/**
 * The job title sub page of a signer, shared by the signer step and the page of an invited director like the name page.
 */
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import SingleFieldStep from '@components/SubStepForms/SingleFieldStep';

import useLocalize from '@hooks/useLocalize';
import useStepFormSubmit from '@hooks/useStepFormSubmit';

import {getFieldRequiredErrors} from '@libs/ValidationUtils';

import type {SignerDetailsSubPageProps, SignerFormID} from '@pages/SimplifiedBankOnboarding/nonUSD/SignerInfo/types';
import {SIGNER_INPUT_IDS} from '@pages/SimplifiedBankOnboarding/types/form';

import CONST from '@src/CONST';

import React from 'react';

const STEP_FIELDS = [SIGNER_INPUT_IDS.SIGNER_JOB_TITLE];

function JobTitle({onNext, onMove, isEditing, formID, values}: SignerDetailsSubPageProps) {
    const {translate} = useLocalize();

    const validate = (formValues: FormOnyxValues<SignerFormID>): FormInputErrors<SignerFormID> => getFieldRequiredErrors(formValues, STEP_FIELDS, translate);

    const handleSubmit = useStepFormSubmit<SignerFormID>({formId: formID, fieldIds: STEP_FIELDS, onNext, shouldSaveDraft: isEditing});

    return (
        <SingleFieldStep<SignerFormID>
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            formID={formID}
            formTitle={translate('signerInfoStep.whatsYourJobTitle')}
            validate={validate}
            onSubmit={handleSubmit}
            inputId={SIGNER_INPUT_IDS.SIGNER_JOB_TITLE}
            inputLabel={translate('signerInfoStep.jobTitle')}
            inputMode={CONST.INPUT_MODE.TEXT}
            defaultValue={values.signerJobTitle}
            shouldShowHelpLinks={false}
            shouldDelayAutoFocus
        />
    );
}

export default JobTitle;
