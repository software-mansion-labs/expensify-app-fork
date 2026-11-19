/**
 * The manual variant of the USD bank step: routing and account number with validators in the component. The default
 * values come from the draft first, then from the server. After a reload the draft holds the masked account number that
 * the server sent back, because the entry page copies server data into the draft. The real flow has the same lossy
 * prefill, so the validator accepts a masked number and the inputs lock once the account exists, like in the real step.
 */
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import FormHelpMessage from '@components/FormHelpMessage';
import Text from '@components/Text';
import TextInput from '@components/TextInput';

import useAutoFocusInput from '@hooks/useAutoFocusInput';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getFieldRequiredErrors} from '@libs/ValidationUtils';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type BankInfoSubStepProps from '@pages/SimplifiedBankOnboarding/usd/BankInfo/types';
import getSubStepValues from '@pages/SimplifiedBankOnboarding/utils/getSubStepValues';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const MANUAL_KEYS = {
    ROUTING_NUMBER: INPUT_IDS.ROUTING_NUMBER,
    ACCOUNT_NUMBER: INPUT_IDS.ACCOUNT_NUMBER,
};
const STEP_FIELDS = [INPUT_IDS.ROUTING_NUMBER, INPUT_IDS.ACCOUNT_NUMBER];
const ROUTING_NUMBER_PATTERN = /^\d{9}$/;

function Manual({onNext, isRequestPending, requestErrorMessage}: BankInfoSubStepProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {inputCallbackRef} = useAutoFocusInput();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const defaultValues = getSubStepValues(MANUAL_KEYS, draft, account);
    const hasBankAccountData = !!account?.achData?.bankAccountID;

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
        onNext({routingNumber: values.routingNumber?.trim(), accountNumber: values.accountNumber?.trim()});
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
                shouldUseDefaultValue={hasBankAccountData}
                disabled={hasBankAccountData}
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
                shouldUseDefaultValue={hasBankAccountData}
                disabled={hasBankAccountData}
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
