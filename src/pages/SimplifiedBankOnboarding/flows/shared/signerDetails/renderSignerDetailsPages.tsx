/**
 * The sub pages of a director's details, shared by the NonUSD signer step and the invited director: the name page, the
 * job title page and the confirmation that sends the director request. The result is an array of sub page elements, so
 * a step spreads it among its own children and keeps one list of pages.
 */
import {isValidLegalName} from '@libs/ValidationUtils';

import {SIGNER_INPUT_IDS} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {PageID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import {ConfirmationSubPage, SingleFieldSubPage} from '@pages/SimplifiedBankOnboarding/core';
import type {ConfirmationRow, OnboardingRequest, PageTarget} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';

import React from 'react';

import PAGES from './signerDetailsPages';

type SignerDetailsValues = {
    signerFullName: string;
    signerJobTitle: string;
};

type SignerDetailsPagesOptions = {
    /** False leaves the name page out, and the confirmation then shows no name row */
    askForName: boolean;

    /** The defaults of the inputs and the values of the confirmation rows */
    values: SignerDetailsValues;

    /** Sent by the confirmation */
    request: OnboardingRequest;

    /** Where the confirmation goes after the request succeeded. Default: the next page in order. */
    next?: PageTarget;

    /** The page that Back opens from the first details page. Default: the previous page in order. */
    firstPageBack?: PageID;
};

type Translate = (path: TranslationPaths) => string;

function validateLegalName(name: string): TranslationPaths | undefined {
    return isValidLegalName(name) ? undefined : 'bankAccount.error.fullName';
}

function renderSignerDetailsPages(translate: Translate, {askForName, values, request, next, firstPageBack}: SignerDetailsPagesOptions): React.ReactElement[] {
    const nameRow: ConfirmationRow = {label: translate('signerInfoStep.legalName'), value: values.signerFullName, page: PAGES.NAME};
    const jobTitleRow: ConfirmationRow = {label: translate('signerInfoStep.jobTitle'), value: values.signerJobTitle, page: PAGES.JOB_TITLE};

    const namePage = (
        <SingleFieldSubPage
            key={PAGES.NAME}
            name={PAGES.NAME}
            back={firstPageBack}
            inputID={SIGNER_INPUT_IDS.SIGNER_FULL_NAME}
            title={translate('signerInfoStep.whatsYourName')}
            label={translate('signerInfoStep.fullName')}
            defaultValue={values.signerFullName}
            validate={validateLegalName}
            inputMode={CONST.INPUT_MODE.TEXT}
        />
    );
    const jobTitlePage = (
        <SingleFieldSubPage
            key={PAGES.JOB_TITLE}
            name={PAGES.JOB_TITLE}
            back={askForName ? undefined : firstPageBack}
            inputID={SIGNER_INPUT_IDS.SIGNER_JOB_TITLE}
            title={translate('signerInfoStep.whatsYourJobTitle')}
            label={translate('signerInfoStep.jobTitle')}
            defaultValue={values.signerJobTitle}
            inputMode={CONST.INPUT_MODE.TEXT}
        />
    );
    const confirmationPage = (
        <ConfirmationSubPage
            key={PAGES.CONFIRMATION}
            name={PAGES.CONFIRMATION}
            next={next}
            title={translate('signerInfoStep.letsDoubleCheck')}
            rows={askForName ? [nameRow, jobTitleRow] : [jobTitleRow]}
            request={request}
        />
    );

    return askForName ? [namePage, jobTitlePage, confirmationPage] : [jobTitlePage, confirmationPage];
}

export default renderSignerDetailsPages;
export type {SignerDetailsPagesOptions, SignerDetailsValues};
