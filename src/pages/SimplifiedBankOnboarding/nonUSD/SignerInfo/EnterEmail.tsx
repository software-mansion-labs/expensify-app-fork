/**
 * The sub page that collects the emails of the directors who fill in their own data. Like the real one, the currency and
 * the answer to the director question decide the inputs: an AUD workspace always needs a second director, so a user who
 * is not the director gives two emails and a director gives only the second one.
 */
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxKeys, FormOnyxValues} from '@components/Form/types';
import Text from '@components/Text';
import TextInput from '@components/TextInput';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {getFieldRequiredErrors} from '@libs/ValidationUtils';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import {Str} from 'expensify-common';
import React from 'react';

type OnboardingFormID = typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM;

type EnterEmailProps = {
    onSubmit: (values: FormOnyxValues<OnboardingFormID>) => void;
    isUserDirector: boolean;
    currency: string;
    companyName: string;
    isLoading: boolean;
};

function EnterEmail({onSubmit, isUserDirector, currency, companyName, isLoading}: EnterEmailProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const isAUD = currency === SBO_CONST.CURRENCY.AUD;
    const shouldGatherBothEmails = isAUD && !isUserDirector;
    const shouldGatherOnlySecondSignerEmail = isAUD && isUserDirector;
    const primaryEmailField = shouldGatherOnlySecondSignerEmail ? INPUT_IDS.SECOND_SIGNER_EMAIL : INPUT_IDS.SIGNER_EMAIL;
    const emailLabel = shouldGatherBothEmails ? `${translate('common.email')} 1` : translate('common.email');

    const validate = (values: FormOnyxValues<OnboardingFormID>): FormInputErrors<OnboardingFormID> => {
        const requiredFields: Array<FormOnyxKeys<OnboardingFormID>> = shouldGatherBothEmails ? [primaryEmailField, INPUT_IDS.SECOND_SIGNER_EMAIL] : [primaryEmailField];
        const errors = getFieldRequiredErrors(values, requiredFields, translate);
        for (const field of requiredFields) {
            const email = values[field];
            if (typeof email === 'string' && email && !Str.isValidEmail(email)) {
                errors[field] = translate('bankAccount.error.email');
            }
        }
        if (shouldGatherBothEmails && values.signerEmail === values.secondSignerEmail) {
            errors.secondSignerEmail = translate('signerInfoStep.error.emailsMustBeDifferent');
        }
        return errors;
    };

    return (
        <FormProvider
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            submitButtonText={translate('common.next')}
            onSubmit={onSubmit}
            isLoading={isLoading}
            validate={validate}
            style={[styles.mh5, styles.flexGrow1]}
            shouldHideFixErrorsAlert={!shouldGatherBothEmails}
        >
            <Text style={styles.textHeadlineLineHeightXXL}>{translate(shouldGatherBothEmails ? 'signerInfoStep.enterTwoEmails' : 'signerInfoStep.enterOneEmail', companyName)}</Text>
            {!shouldGatherBothEmails && <Text style={[styles.pv3, styles.textSupporting]}>{translate('signerInfoStep.regulationRequiresOneMoreDirector')}</Text>}
            <InputWrapper
                InputComponent={TextInput}
                label={emailLabel}
                aria-label={emailLabel}
                role={CONST.ROLE.PRESENTATION}
                inputID={primaryEmailField}
                inputMode={CONST.INPUT_MODE.EMAIL}
                containerStyles={[styles.mt6]}
                autoComplete="email"
            />
            {shouldGatherBothEmails && (
                <InputWrapper
                    InputComponent={TextInput}
                    label={`${translate('common.email')} 2`}
                    aria-label={`${translate('common.email')} 2`}
                    role={CONST.ROLE.PRESENTATION}
                    inputID={INPUT_IDS.SECOND_SIGNER_EMAIL}
                    inputMode={CONST.INPUT_MODE.EMAIL}
                    containerStyles={[styles.mt6]}
                    autoComplete="email"
                />
            )}
        </FormProvider>
    );
}

export default EnterEmail;
