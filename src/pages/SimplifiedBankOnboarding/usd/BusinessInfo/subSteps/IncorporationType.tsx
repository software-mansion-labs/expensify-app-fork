/**
 * The company type sub page: a picklist that saves its value to the draft on change, like the business type picker of the
 * real step. The options are a short fixed list instead of the full list of the real step.
 */
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import PushRowWithModal from '@components/PushRowWithModal';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {getFieldRequiredErrors} from '@libs/ValidationUtils';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type BusinessInfoSubPageProps from '@pages/SimplifiedBankOnboarding/usd/BusinessInfo/types';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const STEP_FIELDS = [INPUT_IDS.INCORPORATION_TYPE];

const INCORPORATION_TYPE_OPTIONS: Record<string, string> = Object.fromEntries(
    Object.values(SBO_CONST.USD.INCORPORATION_TYPES).map((incorporationType) => [incorporationType, incorporationType]),
);

function IncorporationType({onNext, isEditing, values: stepValues}: BusinessInfoSubPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> =>
        getFieldRequiredErrors(values, STEP_FIELDS, translate);

    const handleSubmit = useOnboardingStepFormSubmit({fieldIds: STEP_FIELDS, onNext, shouldSaveDraft: isEditing});

    return (
        <FormProvider
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            submitButtonText={translate(isEditing ? 'common.confirm' : 'common.next')}
            validate={validate}
            onSubmit={handleSubmit}
            style={styles.flexGrow1}
            submitButtonStyles={[styles.ph5, styles.mb0]}
            shouldHideFixErrorsAlert
        >
            <Text style={[styles.textHeadlineLineHeightXXL, styles.ph5, styles.mb3]}>{translate('businessInfoStep.selectYourCompanyType')}</Text>
            <InputWrapper
                InputComponent={PushRowWithModal}
                optionsList={INCORPORATION_TYPE_OPTIONS}
                description={translate('businessInfoStep.companyType')}
                modalHeaderTitle={translate('businessInfoStep.companyType')}
                searchInputTitle={translate('businessInfoStep.companyType')}
                defaultValue={stepValues.incorporationType}
                inputID={INPUT_IDS.INCORPORATION_TYPE}
                shouldSaveDraft={!isEditing}
            />
        </FormProvider>
    );
}

export default IncorporationType;
