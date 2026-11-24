/**
 * The personal info step of the USD flow: legal name, date of birth and the last four SSN digits, then a confirmation.
 * After each input page the step saves all answers without waiting, and only the confirmation waits for the server.
 * While the server reviews the setup, the step always opens at the first page.
 */
import useLocalize from '@hooks/useLocalize';

import {isValidSSNLastFour} from '@libs/ValidationUtils';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {ConfirmationSubPage, DateOfBirthSubPage, FullNameSubPage, OnboardingStep, SingleFieldSubPage} from '@pages/SimplifiedBankOnboarding/core';
import {useUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/usd/usdAnswers';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';

import React from 'react';

import {personalInfoProgressRequest, personalInfoRequest} from './personalInfoRequests';

const {PERSONAL_INFO_SUB_PAGES: PAGES} = SBO_CONST.USD;

function validateSSNLastFour(value: string): TranslationPaths | undefined {
    return isValidSSNLastFour(value) ? undefined : 'bankAccount.error.ssnLast4';
}

function PersonalInfoStep() {
    const {translate} = useLocalize();
    const answers = useUSDAnswers();

    return (
        <OnboardingStep
            title={translate('personalInfoStep.personalInfo')}
            wrapperID="SimplifiedBankOnboardingPersonalInfo"
            startAt={answers.isVerifying ? PAGES.FULL_NAME : undefined}
            saveAfterEachPage={personalInfoProgressRequest}
            shouldEnableMaxHeight
            shouldEnablePickerAvoiding={false}
        >
            <FullNameSubPage
                name={PAGES.FULL_NAME}
                isAnswered={!!answers.firstName && !!answers.lastName}
                title={translate('personalInfoStep.enterYourLegalFirstAndLast')}
                firstNameInputID={INPUT_IDS.FIRST_NAME}
                lastNameInputID={INPUT_IDS.LAST_NAME}
                defaultValues={{firstName: answers.firstName, lastName: answers.lastName}}
            />
            <DateOfBirthSubPage
                name={PAGES.DATE_OF_BIRTH}
                isAnswered={!!answers.dob}
                title={translate('personalInfoStep.enterYourDateOfBirth')}
                inputID={INPUT_IDS.DOB}
                defaultValue={answers.dob}
            />
            <SingleFieldSubPage
                name={PAGES.SSN}
                isAnswered={!!answers.ssnLast4}
                title={translate('personalInfoStep.enterTheLast4')}
                label={translate('personalInfoStep.last4SSN')}
                hint={`The mock server rejects ${SBO_CONST.MOCK.REJECTED_SSN_LAST_4}.`}
                inputID={INPUT_IDS.SSN_LAST_4}
                inputMode={CONST.INPUT_MODE.NUMERIC}
                maxLength={SBO_CONST.SSN_LAST_4_LENGTH}
                validate={validateSSNLastFour}
                defaultValue={answers.ssnLast4}
            />
            <ConfirmationSubPage
                name={PAGES.CONFIRMATION}
                title={translate('personalInfoStep.letsDoubleCheck')}
                request={personalInfoRequest}
                rows={[
                    {label: translate('personalInfoStep.legalName'), value: `${answers.firstName} ${answers.lastName}`, page: PAGES.FULL_NAME},
                    {label: translate('common.dob'), value: answers.dob, page: PAGES.DATE_OF_BIRTH},
                    {label: translate('personalInfoStep.last4SSN'), value: answers.ssnLast4, page: PAGES.SSN},
                ]}
            />
        </OnboardingStep>
    );
}

export default PersonalInfoStep;
