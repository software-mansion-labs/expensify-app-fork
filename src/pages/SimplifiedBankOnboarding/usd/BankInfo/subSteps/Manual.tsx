/**
 * The manual variant of the USD bank step: routing and account number with validators in the component. It shows the
 * values that the step resolved. Once the server holds the account it shows the masked account number that the server
 * sent back, so the validator accepts a masked number and the inputs lock, like in the real step.
 */
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import FormHelpMessage from '@components/FormHelpMessage';
import Text from '@components/Text';
import TextInput from '@components/TextInput';

import useAutoFocusInput from '@hooks/useAutoFocusInput';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {getFieldRequiredErrors} from '@libs/ValidationUtils';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type BankInfoSubStepProps from '@pages/SimplifiedBankOnboarding/usd/BankInfo/types';
import {toManualParams} from '@pages/SimplifiedBankOnboarding/values/codecs/usdBankAccount';
import type {ManualValues} from '@pages/SimplifiedBankOnboarding/values/codecs/usdBankAccount';
import type ResolvedValuesProps from '@pages/SimplifiedBankOnboarding/values/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

type ManualProps = BankInfoSubStepProps &
    ResolvedValuesProps<ManualValues> & {
        /** True once the server holds the bank account, which the user can then only replace by starting over */
        isLocked: boolean;
    };

const STEP_FIELDS = [INPUT_IDS.ROUTING_NUMBER, INPUT_IDS.ACCOUNT_NUMBER];
const ROUTING_NUMBER_PATTERN = /^\d{9}$/;

function Manual({onNext, isRequestPending, requestErrorMessage, values: defaultValues, isLocked}: ManualProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {inputCallbackRef} = useAutoFocusInput();

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> => {
        const errors = getFieldRequiredErrors(values, STEP_FIELDS, translate);
        const accountNumber = values.accountNumber?.trim();
        if (accountNumber && !CONST.BANK_ACCOUNT.REGEX.US_ACCOUNT_NUMBER.test(accountNumber) && !CONST.BANK_ACCOUNT.REGEX.MASKED_US_ACCOUNT_NUMBER.test(accountNumber)) {
            errors.accountNumber = translate('bankAccount.error.accountNumber');
        }
        if (values.routingNumber && !ROUTING_NUMBER_PATTERN.test(values.routingNumber.trim())) {
            errors.routingNumber = translate('bankAccount.error.routingNumber');
        }
        return errors;
    };

    const submit = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>) => {
        onNext(toManualParams(values));
    };

    return (
        <FormProvider
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            onSubmit={submit}
            validate={validate}
            submitButtonText={translate('common.next')}
            style={[styles.mh5, styles.flexGrow1]}
            isLoading={isRequestPending}
        >
            <Text style={[styles.textHeadlineLineHeightXXL, styles.mb3]}>{translate('bankAccount.manuallyAdd')}</Text>
            <Text style={[styles.mb5, styles.textSupporting]}>{translate('bankAccount.checkHelpLine')}</Text>
            <InputWrapper
                InputComponent={TextInput}
                ref={inputCallbackRef}
                inputID={INPUT_IDS.ROUTING_NUMBER}
                label={translate('bankAccount.routingNumber')}
                aria-label={translate('bankAccount.routingNumber')}
                role={CONST.ROLE.PRESENTATION}
                defaultValue={defaultValues.routingNumber}
                inputMode={CONST.INPUT_MODE.NUMERIC}
                shouldSaveDraft
                shouldUseDefaultValue={isLocked}
                disabled={isLocked}
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.EDIT_INPUT}
            />
            <InputWrapper
                InputComponent={TextInput}
                inputID={INPUT_IDS.ACCOUNT_NUMBER}
                containerStyles={[styles.mt6]}
                label={translate('bankAccount.accountNumber')}
                aria-label={translate('bankAccount.accountNumber')}
                role={CONST.ROLE.PRESENTATION}
                defaultValue={defaultValues.accountNumber}
                inputMode={CONST.INPUT_MODE.NUMERIC}
                shouldSaveDraft
                shouldUseDefaultValue={isLocked}
                disabled={isLocked}
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.EDIT_INPUT}
            />
            <FormHelpMessage
                style={styles.mt3}
                message={requestErrorMessage}
            />
        </FormProvider>
    );
}

export default Manual;
