/**
 * The pages that collect the details of a signing director. The NonUSD signer step and the page of an invited director
 * both ask for them.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {isValidLegalName} from '@libs/ValidationUtils';

import TextField from '@pages/SimplifiedBankOnboarding/form/fields/TextField';
import getFormPage from '@pages/SimplifiedBankOnboarding/formConfig/getFormPage';
import type {ConfirmationPageConfig, ConfirmationRow, FormPageConfig, PageID} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import React from 'react';

type SignerPageIDs = {
    name: PageID;
    jobTitle: PageID;
    confirmation: PageID;
};

type SignerDetailsInput = {
    pageIDs: SignerPageIDs;
    fullName: string;
    jobTitle: string;

    /** False when the name is already known, such as the name of a user who is also an owner */
    shouldAskForName: boolean;

    /** The server saved the details, so the flow does not stop on the confirmation */
    isConfirmationComplete: boolean;
    translate: LocalizedTranslate;
};

type SignerDetailsPages = {
    /** The name page, when the name is asked for, and the job title page */
    formPages: FormPageConfig[];
    confirmation: ConfirmationPageConfig;
};

/**
 * The confirmation is returned on its own, so the caller can attach the request that saves the details, which differs
 * between the flow of the user and the page of an invited director.
 */
function getSignerDetailsPages({pageIDs, fullName, jobTitle, shouldAskForName, isConfirmationComplete, translate}: SignerDetailsInput): SignerDetailsPages {
    const answers = {signerFullName: fullName, signerJobTitle: jobTitle};

    const namePage = getFormPage(
        {
            id: pageIDs.name,
            title: translate('signerInfoStep.whatsYourName'),
            enabledWhenOffline: true,
            inputs: {
                [INPUT_IDS.SIGNER_FULL_NAME]: {
                    validate: (value) => (isValidLegalName(value) ? undefined : translate('bankAccount.error.fullName')),
                },
            },
            content: (
                <TextField
                    inputID={INPUT_IDS.SIGNER_FULL_NAME}
                    label={translate('signerInfoStep.fullName')}
                    defaultValue={fullName}
                />
            ),
        },
        answers,
        translate,
    );

    const jobTitlePage = getFormPage(
        {
            id: pageIDs.jobTitle,
            title: translate('signerInfoStep.whatsYourJobTitle'),
            enabledWhenOffline: true,
            inputs: {[INPUT_IDS.SIGNER_JOB_TITLE]: {}},
            content: (
                <TextField
                    inputID={INPUT_IDS.SIGNER_JOB_TITLE}
                    label={translate('signerInfoStep.jobTitle')}
                    defaultValue={jobTitle}
                />
            ),
        },
        answers,
        translate,
    );

    // The name row is left out when the name was not asked for, because the user could not edit it here
    const nameRows: ConfirmationRow[] = shouldAskForName
        ? [
              {
                  id: 'legalName',
                  label: translate('signerInfoStep.legalName'),
                  value: fullName,
                  editPageID: pageIDs.name,
              },
          ]
        : [];

    return {
        formPages: shouldAskForName ? [namePage, jobTitlePage] : [jobTitlePage],
        confirmation: {
            kind: 'confirmation',
            id: pageIDs.confirmation,
            isComplete: isConfirmationComplete,
            title: translate('signerInfoStep.letsDoubleCheck'),
            rows: [
                ...nameRows,
                {
                    id: 'jobTitle',
                    label: translate('signerInfoStep.jobTitle'),
                    value: jobTitle,
                    editPageID: pageIDs.jobTitle,
                },
            ],
        },
    };
}

export default getSignerDetailsPages;
export type {SignerDetailsInput, SignerDetailsPages, SignerPageIDs};
