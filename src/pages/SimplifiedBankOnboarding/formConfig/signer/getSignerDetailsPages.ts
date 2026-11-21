/**
 * The pages that collect the details of a signing director. The NonUSD signer step and the page of an invited director
 * both ask for them.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {isValidLegalName} from '@libs/ValidationUtils';

import createTextField from '@pages/SimplifiedBankOnboarding/form/fields/createTextField';
import getFormPage from '@pages/SimplifiedBankOnboarding/formConfig/getFormPage';
import type {PageConfig, PageID} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/requests/types';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

type SignerPageIDs = {
    name: PageID;
    jobTitle: PageID;
    confirmation: PageID;
};

type SignerDetailsInput = {
    pageIDs: SignerPageIDs;
    answers: OnboardingDraft;

    /** False when the name is already known, such as the name of a user who is also an owner */
    shouldAskForName: boolean;

    /** The server saved the details, so the flow does not stop on the confirmation */
    isConfirmationComplete: boolean;

    /** Saves the details from the confirmation. It differs between the flow of the user and the page of an invited director. */
    request: PlannedRequest;
    translate: LocalizedTranslate;
};

/** The confirmation leaves the name out when the name was not asked for, because the user could not edit it here */
function getSignerDetailsPages({pageIDs, answers, shouldAskForName, isConfirmationComplete, request, translate}: SignerDetailsInput): PageConfig[] {
    const namePage = getFormPage(
        {
            id: pageIDs.name,
            title: translate('signerInfoStep.whatsYourName'),
            fields: [
                createTextField(INPUT_IDS.SIGNER_FULL_NAME, {
                    label: translate('signerInfoStep.fullName'),
                    summaryLabel: translate('signerInfoStep.legalName'),
                    validate: (value) => (isValidLegalName(value) ? undefined : translate('bankAccount.error.fullName')),
                }),
            ],
        },
        answers,
        translate,
    );

    const jobTitlePage = getFormPage(
        {
            id: pageIDs.jobTitle,
            title: translate('signerInfoStep.whatsYourJobTitle'),
            fields: [createTextField(INPUT_IDS.SIGNER_JOB_TITLE, {label: translate('signerInfoStep.jobTitle')})],
        },
        answers,
        translate,
    );

    return [
        ...(shouldAskForName ? [namePage] : []),
        jobTitlePage,
        {
            kind: 'confirmation',
            id: pageIDs.confirmation,
            isComplete: isConfirmationComplete,
            title: translate('signerInfoStep.letsDoubleCheck'),
            request,
        },
    ];
}

export default getSignerDetailsPages;
export type {SignerDetailsInput, SignerPageIDs};
