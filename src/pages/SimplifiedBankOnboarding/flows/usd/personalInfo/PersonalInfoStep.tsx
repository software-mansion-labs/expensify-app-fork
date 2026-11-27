/**
 * The personal info step of the USD flow: legal name, date of birth and the last four SSN digits, then a confirmation.
 * After each input page the step saves all answers without waiting, and only the confirmation waits for the server.
 * While the server reviews the setup, the step always opens at the first page.
 */
import useLocalize from '@hooks/useLocalize';

import {isValidSSNLastFour} from '@libs/ValidationUtils';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {isVerifying} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';
import {ConfirmationSubPage, DateOfBirthSubPage, FullNameSubPage, OnboardingStep, SingleFieldSubPage, useFlowData} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';

import React from 'react';

import getPersonalInfoAnswers from './getPersonalInfoAnswers';
import PAGES from './personalInfoPages';
import {personalInfoProgressRequest, personalInfoRequest} from './personalInfoRequests';

function validateSSNLastFour(value: string): TranslationPaths | undefined {
    return isValidSSNLastFour(value) ? undefined : 'bankAccount.error.ssnLast4';
}

function PersonalInfoStep() {
    const {translate} = useLocalize();
    const data = useFlowData();
    const answers = getPersonalInfoAnswers(data);

    return (
        <OnboardingStep
            title={translate('personalInfoStep.personalInfo')}
            wrapperID="SimplifiedBankOnboardingPersonalInfo"
            startAt={isVerifying(data.account?.achData) ? PAGES.FULL_NAME : undefined}
            saveAfterEachPage={personalInfoProgressRequest}
            shouldEnableMaxHeight
            shouldEnablePickerAvoiding={false}
            pages={[
                {
                    name: PAGES.FULL_NAME,
                    isAnswered: !!answers.firstName && !!answers.lastName,
                    content: (
                        <FullNameSubPage
                            title={translate('personalInfoStep.enterYourLegalFirstAndLast')}
                            firstNameInputID={INPUT_IDS.FIRST_NAME}
                            lastNameInputID={INPUT_IDS.LAST_NAME}
                            defaultValues={{firstName: answers.firstName, lastName: answers.lastName}}
                        />
                    ),
                },
                {
                    name: PAGES.DATE_OF_BIRTH,
                    isAnswered: !!answers.dob,
                    content: (
                        <DateOfBirthSubPage
                            title={translate('personalInfoStep.enterYourDateOfBirth')}
                            inputID={INPUT_IDS.DOB}
                            defaultValue={answers.dob}
                        />
                    ),
                },
                {
                    name: PAGES.SSN,
                    isAnswered: !!answers.ssnLast4,
                    content: (
                        <SingleFieldSubPage
                            title={translate('personalInfoStep.enterTheLast4')}
                            label={translate('personalInfoStep.last4SSN')}
                            hint={`The mock server rejects ${SBO_CONST.MOCK.REJECTED_SSN_LAST_4}.`}
                            inputID={INPUT_IDS.SSN_LAST_4}
                            inputMode={CONST.INPUT_MODE.NUMERIC}
                            maxLength={SBO_CONST.SSN_LAST_4_LENGTH}
                            validate={validateSSNLastFour}
                            defaultValue={answers.ssnLast4}
                        />
                    ),
                },
                {
                    name: PAGES.CONFIRMATION,
                    content: (
                        <ConfirmationSubPage
                            title={translate('personalInfoStep.letsDoubleCheck')}
                            request={personalInfoRequest}
                            rows={[
                                {label: translate('personalInfoStep.legalName'), value: `${answers.firstName} ${answers.lastName}`, page: PAGES.FULL_NAME},
                                {label: translate('common.dob'), value: answers.dob, page: PAGES.DATE_OF_BIRTH},
                                {label: translate('personalInfoStep.last4SSN'), value: answers.ssnLast4, page: PAGES.SSN},
                            ]}
                        />
                    ),
                },
            ]}
        />
    );
}

export default PersonalInfoStep;
