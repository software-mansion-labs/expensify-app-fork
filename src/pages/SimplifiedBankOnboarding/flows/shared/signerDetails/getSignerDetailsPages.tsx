/**
 * The sub pages of a director's details, shared by the NonUSD signer step and the invited director: the name page, the
 * job title page and the confirmation that sends the director request. The result is a list of page configs, so a step
 * puts it among its own pages and keeps one list of pages.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {isValidLegalName} from '@libs/ValidationUtils';

import {SIGNER_INPUT_IDS} from '@pages/SimplifiedBankOnboarding/contract/form';
import {ConfirmationSubPage, SingleFieldSubPage} from '@pages/SimplifiedBankOnboarding/core';
import type {ConfirmationRow, NEXT_STEP, OnboardingRequest, SubPageConfig} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';

import React from 'react';

import type {SignerDetailsPageName} from './signerDetailsPages';

import PAGES from './signerDetailsPages';

type SignerDetailsValues = {
    signerFullName: string;
    signerJobTitle: string;
};

/**
 * `TPageName` is the page names of the step around the details pages. The step passes it explicitly, because `next` and
 * `firstPageBack` do not infer it, so a typo in them fails the typecheck.
 */
type SignerDetailsPagesOptions<TPageName extends string> = {
    /** False leaves the name page out, and the confirmation then shows no name row */
    askForName: boolean;

    /** The defaults of the inputs and the values of the confirmation rows */
    values: SignerDetailsValues;

    /** Sent by the confirmation */
    request: OnboardingRequest;

    /** Where the confirmation goes after the request succeeded. Default: the next page in order. */
    next?: NoInfer<TPageName> | typeof NEXT_STEP;

    /** The page that Back opens from the first details page. Default: the previous page in order. */
    firstPageBack?: NoInfer<TPageName>;
};

function validateLegalName(name: string): TranslationPaths | undefined {
    return isValidLegalName(name) ? undefined : 'bankAccount.error.fullName';
}

function getSignerDetailsPages<TPageName extends string = never>(
    translate: LocalizedTranslate,
    {askForName, values, request, next, firstPageBack}: SignerDetailsPagesOptions<TPageName>,
): Array<SubPageConfig<SignerDetailsPageName | TPageName>> {
    const nameRow: ConfirmationRow = {label: translate('signerInfoStep.legalName'), value: values.signerFullName, page: PAGES.NAME};
    const jobTitleRow: ConfirmationRow = {label: translate('signerInfoStep.jobTitle'), value: values.signerJobTitle, page: PAGES.JOB_TITLE};

    const namePage: SubPageConfig<SignerDetailsPageName | TPageName> = {
        name: PAGES.NAME,
        back: firstPageBack,
        content: (
            <SingleFieldSubPage
                inputID={SIGNER_INPUT_IDS.SIGNER_FULL_NAME}
                title={translate('signerInfoStep.whatsYourName')}
                label={translate('signerInfoStep.fullName')}
                defaultValue={values.signerFullName}
                validate={validateLegalName}
                inputMode={CONST.INPUT_MODE.TEXT}
            />
        ),
    };
    const jobTitlePage: SubPageConfig<SignerDetailsPageName | TPageName> = {
        name: PAGES.JOB_TITLE,
        back: askForName ? undefined : firstPageBack,
        content: (
            <SingleFieldSubPage
                inputID={SIGNER_INPUT_IDS.SIGNER_JOB_TITLE}
                title={translate('signerInfoStep.whatsYourJobTitle')}
                label={translate('signerInfoStep.jobTitle')}
                defaultValue={values.signerJobTitle}
                inputMode={CONST.INPUT_MODE.TEXT}
            />
        ),
    };
    const confirmationPage: SubPageConfig<SignerDetailsPageName | TPageName> = {
        name: PAGES.CONFIRMATION,
        next,
        content: (
            <ConfirmationSubPage
                title={translate('signerInfoStep.letsDoubleCheck')}
                rows={askForName ? [nameRow, jobTitleRow] : [jobTitleRow]}
                request={request}
            />
        ),
    };

    return askForName ? [namePage, jobTitlePage, confirmationPage] : [jobTitlePage, confirmationPage];
}

export default getSignerDetailsPages;
export type {SignerDetailsPagesOptions, SignerDetailsValues};
