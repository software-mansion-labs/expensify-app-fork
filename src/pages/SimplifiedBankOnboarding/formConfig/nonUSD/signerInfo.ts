/**
 * The signer step. A director gives their name and job title, an owner only the job title because the owner step has
 * the name. Other directors are invited by email and the step waits for them on the hang tight page. An AUD account
 * always needs a second director, so even a director invites one.
 */
import getSignerDetailsPages from '@pages/SimplifiedBankOnboarding/formConfig/signer/getSignerDetailsPages';
import type {FieldConfig, FormPageConfig, PageConfig, QuestionPageConfig, StepConfig, TextFieldConfig, TextInputID} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import isFormPageComplete from '@pages/SimplifiedBankOnboarding/formConfig/validation/isFormPageComplete';
import {findOwner} from '@pages/SimplifiedBankOnboarding/model/owners/ownerList';
import {getOwnerFullName} from '@pages/SimplifiedBankOnboarding/model/owners/ownerNames';
import {askForSignerInfo, saveDirectorInfo} from '@pages/SimplifiedBankOnboarding/requests/nonUSD/signerInfo';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import getRequestKey from '@pages/SimplifiedBankOnboarding/requests/requestKey';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import CONST from '@src/CONST';

import {Str} from 'expensify-common';

import type NonUSDStepInput from './types';

const SUB_PAGES = SBO_CONST.NON_USD.SIGNER_INFO_SUB_PAGES;

function getIsDirectorPage({answers, translate}: NonUSDStepInput): QuestionPageConfig {
    return {
        kind: 'question',
        id: SUB_PAGES.IS_DIRECTOR,
        isComplete: answers.isUserDirector !== undefined,
        fieldID: INPUT_IDS.IS_USER_DIRECTOR,
        title: translate('signerInfoStep.areYouDirector', answers.companyName),
        description: translate('signerInfoStep.regulationRequiresUs'),
        defaultValue: answers.isUserDirector ?? false,
    };
}

/**
 * A director who is also an owner signs with the name of the owner step. The answer "I own 25%" may still be only in the
 * draft, with no owner details saved, and then there is no owner name to take.
 */
function getUserOwnerName({answers}: NonUSDStepInput): string | undefined {
    if (!answers.ownsMoreThan25Percent) {
        return undefined;
    }
    const userOwner = findOwner(answers.owners, SBO_CONST.NON_USD.CURRENT_USER_KEY);
    return userOwner ? getOwnerFullName(userOwner) : undefined;
}

function getDirectorPages(input: NonUSDStepInput): PageConfig[] {
    const {answers, corpay, bankAccount, translate} = input;
    const userOwnerName = getUserOwnerName(input);
    const signerFullName = userOwnerName ?? answers.signerFullName;
    const {formPages, confirmation} = getSignerDetailsPages({
        pageIDs: {name: SUB_PAGES.NAME, jobTitle: SUB_PAGES.JOB_TITLE, confirmation: SUB_PAGES.CONFIRMATION},
        fullName: signerFullName,
        jobTitle: answers.signerJobTitle,
        shouldAskForName: !userOwnerName,
        isConfirmationComplete: !!corpay?.signerFullName,
        translate,
    });
    return [
        ...formPages,
        {
            ...confirmation,
            submit: () => saveDirectorInfo(bankAccount, {signerFullName, signerJobTitle: answers.signerJobTitle}),
            requestKey: getRequestKey(REQUEST_NAMES.SAVE_DIRECTOR_INFO, bankAccount),
        },
    ];
}

function getEmailField(id: TextInputID, label: string, defaultValue: string, input: NonUSDStepInput, mustDifferFrom?: TextInputID): TextFieldConfig {
    const {translate} = input;
    return {
        type: 'text',
        id,
        label,
        defaultValue,
        inputMode: CONST.INPUT_MODE.EMAIL,
        isRequired: true,
        validate: (value, values) => {
            if (!Str.isValidEmail(value)) {
                return translate('bankAccount.error.email');
            }
            if (mustDifferFrom && values[mustDifferFrom] === value) {
                return translate('signerInfoStep.error.emailsMustBeDifferent');
            }
            return undefined;
        },
    };
}

/**
 * An AUD account needs two directors besides a user who is none, so that user gives two emails. A director of an AUD
 * account gives the second one only, any other user the one of the director.
 */
function getEnterEmailPage(input: NonUSDStepInput, isUserDirector: boolean): FormPageConfig {
    const {answers, corpay, isAUD, bankAccount, translate} = input;
    const emailLabel = translate('common.email');
    const shouldGatherBothEmails = isAUD && !isUserDirector;
    const shouldGatherOnlySecondEmail = isAUD && isUserDirector;

    const getFields = (): FieldConfig[] => {
        if (shouldGatherBothEmails) {
            return [
                getEmailField(INPUT_IDS.SIGNER_EMAIL, `${emailLabel} 1`, answers.signerEmail, input),
                getEmailField(INPUT_IDS.SECOND_SIGNER_EMAIL, `${emailLabel} 2`, answers.secondSignerEmail, input, INPUT_IDS.SIGNER_EMAIL),
            ];
        }
        if (shouldGatherOnlySecondEmail) {
            return [getEmailField(INPUT_IDS.SECOND_SIGNER_EMAIL, emailLabel, answers.secondSignerEmail, input)];
        }
        return [getEmailField(INPUT_IDS.SIGNER_EMAIL, emailLabel, answers.signerEmail, input)];
    };

    const areEmailsSaved = () => {
        if (shouldGatherBothEmails) {
            return !!corpay?.signerEmail && !!corpay.secondSignerEmail;
        }
        return shouldGatherOnlySecondEmail ? !!corpay?.secondSignerEmail : !!corpay?.signerEmail;
    };

    const fields = getFields();
    return {
        kind: 'form',
        id: SUB_PAGES.ENTER_EMAIL,
        isComplete: areEmailsSaved() && isFormPageComplete(fields, translate),
        title: translate(shouldGatherBothEmails ? 'signerInfoStep.enterTwoEmails' : 'signerInfoStep.enterOneEmail', answers.companyName),
        description: shouldGatherBothEmails ? undefined : translate('signerInfoStep.regulationRequiresOneMoreDirector'),
        fields,
        enabledWhenOffline: false,
        submit: () =>
            askForSignerInfo(
                bankAccount,
                shouldGatherOnlySecondEmail
                    ? {secondSignerEmail: answers.secondSignerEmail}
                    : {signerEmail: answers.signerEmail, secondSignerEmail: isAUD ? answers.secondSignerEmail : undefined},
            ),
        requestKey: getRequestKey(REQUEST_NAMES.ASK_FOR_SIGNER_INFO, bankAccount),
    };
}

/** The invited directors filled in their details: the director, and for AUD also the second one */
function areSignersKnown({corpay, isAUD}: NonUSDStepInput): boolean {
    return !!corpay?.signerFullName && (!isAUD || !!corpay.secondSignerFullName);
}

function getInvitePages(input: NonUSDStepInput, isUserDirector: boolean): PageConfig[] {
    const signersKnown = areSignersKnown(input);
    return [getEnterEmailPage(input, isUserDirector), {kind: 'custom', id: SUB_PAGES.HANG_TIGHT, component: 'hangTight', isComplete: signersKnown, canComplete: signersKnown}];
}

/** The pages follow the director answer, so until it is given the step holds only the question */
function getPages(input: NonUSDStepInput): PageConfig[] {
    const {answers, isAUD} = input;
    const isDirectorPage = getIsDirectorPage(input);
    if (answers.isUserDirector === undefined) {
        return [isDirectorPage];
    }
    if (!answers.isUserDirector) {
        return [isDirectorPage, ...getInvitePages(input, false)];
    }
    return [isDirectorPage, ...getDirectorPages(input), ...(isAUD ? getInvitePages(input, true) : [])];
}

function getSignerInfoStep(input: NonUSDStepInput): StepConfig {
    return {
        id: SBO_CONST.NON_USD.PAGE_NAMES.SIGNER_INFO,
        title: input.translate('signerInfoStep.signerInfo'),
        counterIndex: SBO_CONST.NON_USD.STEP_INDEX.SIGNER_INFO,
        isComplete: areSignersKnown(input),
        pages: getPages(input),
    };
}

export default getSignerInfoStep;
