/**
 * The page that collects the emails of the directors who fill in their own data and invites them. Unlike the blocks of
 * the core, it keeps the emails out of the draft, as the real page does. They have no default value and go to the
 * request as its input, so the page has its own FormProvider.
 */
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxKeys, FormOnyxValues} from '@components/Form/types';
import Text from '@components/Text';
import TextInput from '@components/TextInput';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {getFieldRequiredErrors} from '@libs/ValidationUtils';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import {RequestErrorMessage, useOnboardingRequest, usePageNavigation} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import {Str} from 'expensify-common';
import React from 'react';

import type {SignerEmails} from './signerRequests';
import type {SignerEmailMode} from './signerRules';

import {signerInvitationRequest} from './signerRequests';

type MainFormID = typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM;

type SignerEmailPageProps = {
    mode: SignerEmailMode;

    /** Named in the title */
    companyName: string;
};

function getSignerEmails(mode: SignerEmailMode, values: FormOnyxValues<MainFormID>): SignerEmails {
    if (mode === 'secondOnly') {
        return {secondSignerEmail: values.secondSignerEmail};
    }
    return {
        signerEmail: values.signerEmail,
        secondSignerEmail: mode === 'two' ? values.secondSignerEmail : undefined,
    };
}

function SignerEmailPage({mode, companyName}: SignerEmailPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {goNextAfter} = usePageNavigation();
    const invitation = useOnboardingRequest(signerInvitationRequest);

    const shouldGatherBothEmails = mode === 'two';
    const primaryEmailInputID = mode === 'secondOnly' ? INPUT_IDS.SECOND_SIGNER_EMAIL : INPUT_IDS.SIGNER_EMAIL;
    const primaryEmailLabel = shouldGatherBothEmails ? `${translate('common.email')} 1` : translate('common.email');
    const secondEmailLabel = `${translate('common.email')} 2`;

    const validate = (values: FormOnyxValues<MainFormID>): FormInputErrors<MainFormID> => {
        const requiredInputIDs: Array<FormOnyxKeys<MainFormID>> = shouldGatherBothEmails ? [primaryEmailInputID, INPUT_IDS.SECOND_SIGNER_EMAIL] : [primaryEmailInputID];
        const errors = getFieldRequiredErrors(values, requiredInputIDs, translate);
        for (const inputID of requiredInputIDs) {
            const email = values[inputID];
            if (typeof email === 'string' && email && !Str.isValidEmail(email)) {
                errors[inputID] = translate('bankAccount.error.email');
            }
        }
        if (shouldGatherBothEmails && values.signerEmail === values.secondSignerEmail) {
            errors.secondSignerEmail = translate('signerInfoStep.error.emailsMustBeDifferent');
        }
        return errors;
    };

    const inviteSigners = (values: FormOnyxValues<MainFormID>) => {
        goNextAfter(invitation.send(getSignerEmails(mode, values)));
    };

    return (
        <FormProvider
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            submitButtonText={translate('common.next')}
            onSubmit={inviteSigners}
            isLoading={invitation.isPending}
            validate={validate}
            style={[styles.mh5, styles.flexGrow1]}
            shouldHideFixErrorsAlert={!shouldGatherBothEmails}
            footerContent={<RequestErrorMessage message={invitation.errorMessage} />}
            shouldRenderFooterAboveSubmit
        >
            <Text style={styles.textHeadlineLineHeightXXL}>{translate(shouldGatherBothEmails ? 'signerInfoStep.enterTwoEmails' : 'signerInfoStep.enterOneEmail', companyName)}</Text>
            {!shouldGatherBothEmails && <Text style={[styles.pv3, styles.textSupporting]}>{translate('signerInfoStep.regulationRequiresOneMoreDirector')}</Text>}
            <InputWrapper
                InputComponent={TextInput}
                label={primaryEmailLabel}
                aria-label={primaryEmailLabel}
                role={CONST.ROLE.PRESENTATION}
                inputID={primaryEmailInputID}
                inputMode={CONST.INPUT_MODE.EMAIL}
                containerStyles={[styles.mt6]}
                autoComplete="email"
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.EDIT_INPUT}
            />
            {shouldGatherBothEmails && (
                <InputWrapper
                    InputComponent={TextInput}
                    label={secondEmailLabel}
                    aria-label={secondEmailLabel}
                    role={CONST.ROLE.PRESENTATION}
                    inputID={INPUT_IDS.SECOND_SIGNER_EMAIL}
                    inputMode={CONST.INPUT_MODE.EMAIL}
                    containerStyles={[styles.mt6]}
                    autoComplete="email"
                    sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.EDIT_INPUT}
                />
            )}
        </FormProvider>
    );
}

export default SignerEmailPage;
export type {SignerEmailPageProps};
