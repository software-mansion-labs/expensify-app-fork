/**
 * The whole USD flow as a plan, built from the draft and the server data. It is the one place that decides which steps
 * and pages the USD flow has, so the controller never skips a step on its own. Each form page lists the rules of its
 * inputs and renders its fields as JSX from `form/fields`.
 */
import {isValidCompanyName, isValidSSNLastFour, isValidTaxID} from '@libs/ValidationUtils';

import CheckboxField from '@pages/SimplifiedBankOnboarding/form/fields/CheckboxField';
import DateOfBirthField from '@pages/SimplifiedBankOnboarding/form/fields/DateOfBirthField';
import FileField from '@pages/SimplifiedBankOnboarding/form/fields/FileField';
import FileFieldDescription from '@pages/SimplifiedBankOnboarding/form/fields/FileFieldDescription';
import LegalNameFields from '@pages/SimplifiedBankOnboarding/form/fields/LegalNameFields';
import PicklistField from '@pages/SimplifiedBankOnboarding/form/fields/PicklistField';
import TextField from '@pages/SimplifiedBankOnboarding/form/fields/TextField';
import getUSDAnswers from '@pages/SimplifiedBankOnboarding/model/answers/getUSDAnswers';
import type {USDAnswers} from '@pages/SimplifiedBankOnboarding/model/answers/types';
import {canAddMoreUSDOwners} from '@pages/SimplifiedBankOnboarding/model/owners/canAddMoreOwners';
import {getUSDOwnerBuffer, getUSDOwnerFromBuffer} from '@pages/SimplifiedBankOnboarding/model/owners/ownerBuffer';
import {getOwnerFullName} from '@pages/SimplifiedBankOnboarding/model/owners/ownerNames';
import {areCompanyDetailsLocked, isPendingValidation} from '@pages/SimplifiedBankOnboarding/model/setupStatus';
import failRequest from '@pages/SimplifiedBankOnboarding/requests/failRequest';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import getRequestKey from '@pages/SimplifiedBankOnboarding/requests/requestKey';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/requests/types';
import acceptACHContract from '@pages/SimplifiedBankOnboarding/requests/usd/acceptACHContract';
import {connectBankAccountManually, connectBankAccountWithPlaid} from '@pages/SimplifiedBankOnboarding/requests/usd/connectBankAccount';
import {verifyIdentity} from '@pages/SimplifiedBankOnboarding/requests/usd/identityCheck';
import saveCompany from '@pages/SimplifiedBankOnboarding/requests/usd/saveCompany';
import saveOwners from '@pages/SimplifiedBankOnboarding/requests/usd/saveOwners';
import savePersonalInfo from '@pages/SimplifiedBankOnboarding/requests/usd/savePersonalInfo';
import uploadKYBDocuments from '@pages/SimplifiedBankOnboarding/requests/usd/uploadKYBDocuments';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {OnboardingDraft, OnboardingForm, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/types/form';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {ACHData, KYBDocumentType, OnboardingAccount, USDStep} from '@pages/SimplifiedBankOnboarding/types/onyx';

import CONST from '@src/CONST';

import type {OnyxEntry} from 'react-native-onyx';

import React from 'react';

import type {BaseStepInput} from './getBaseStepInput';
import type {OwnerDetailsPage, OwnersStepDefinition} from './owners/types';
import type {FlowPlan, ListRow, PageConfig, PageInputs, PageTransition, PlanContext, StepConfig} from './types';

import getBaseStepInput from './getBaseStepInput';
import getFormPage from './getFormPage';
import getOwnerPages from './owners/getOwnerPages';
import getDateOfBirthError from './validation/getDateOfBirthError';
import getLegalNameInputs from './validation/getLegalNameInputs';

const {PAGE_NAMES, STEP, STEP_INDEX} = SBO_CONST.USD;

/** What every USD step reads, computed once per plan */
type USDStepInput = BaseStepInput & {
    answers: USDAnswers;
};

const SERVER_STEP_ORDER: USDStep[] = [STEP.COUNTRY, STEP.BANK_ACCOUNT, STEP.REQUESTOR, STEP.COMPANY, STEP.BENEFICIAL_OWNERS, STEP.ACH_CONTRACT, STEP.KYB_DOCS, STEP.VALIDATION, STEP.ENABLE];

/** The server moves `currentStep` forward after each saved step, so a later current step means the step was saved */
function hasPassedServerStep(achData: ACHData | undefined, step: USDStep): boolean {
    const currentStepIndex = SERVER_STEP_ORDER.indexOf(achData?.currentStep ?? STEP.COUNTRY);
    return currentStepIndex > SERVER_STEP_ORDER.indexOf(step);
}

/** The USD flow only supports the United States, so the step only confirms the country. Nothing is sent to the server. */
function getCountryStep({answers, achData, translate}: USDStepInput): StepConfig {
    const isConfirmed = !!answers.country || !!achData?.accountNumber;
    return {
        id: PAGE_NAMES.COUNTRY,
        title: translate('countryStep.confirmCurrency'),
        counterIndex: STEP_INDEX.COUNTRY,
        isComplete: isConfirmed,
        pages: [
            getFormPage(
                {
                    id: SBO_CONST.USD.COUNTRY_SUB_PAGES.CONFIRM_CURRENCY,
                    isComplete: isConfirmed,
                    title: translate('countryStep.confirmCurrency'),
                    description: translate('countryStep.confirmBusinessBank'),
                    submitLabel: translate('common.confirm'),
                    enabledWhenOffline: true,
                    inputs: {[INPUT_IDS.COUNTRY]: {}},
                    content: (
                        <PicklistField
                            inputID={INPUT_IDS.COUNTRY}
                            label={translate('common.country')}
                            defaultValue={SBO_CONST.COUNTRY.US}
                            options={[
                                {
                                    value: SBO_CONST.COUNTRY.US,
                                    label: translate('allCountries.US'),
                                },
                            ]}
                            isLocked
                        />
                    ),
                },
                answers,
                translate,
            ),
        ],
    };
}

const ROUTING_NUMBER_PATTERN = /^\d{9}$/;

/** The entry page saved the setup type, which decides between the Plaid page and the manual form */
function getBankPage({answers, achData, translate}: USDStepInput): PageConfig {
    if (answers.setupType === SBO_CONST.SETUP_TYPE.PLAID) {
        // The bank step sends the picked account, so the page cannot be completed before the user picks one
        return {
            kind: 'custom',
            id: SBO_CONST.USD.BANK_INFO_SUB_PAGES.PLAID,
            component: 'plaid',
            isComplete: !!achData?.bankAccountID,
            canComplete: !!answers.plaidAccountID,
        };
    }
    const isLocked = !!achData?.bankAccountID;
    return getFormPage(
        {
            id: SBO_CONST.USD.BANK_INFO_SUB_PAGES.MANUAL,
            title: translate('bankAccount.manuallyAdd'),
            description: translate('bankAccount.checkHelpLine'),
            inputs: {
                [INPUT_IDS.ROUTING_NUMBER]: {
                    validate: (value) => (ROUTING_NUMBER_PATTERN.test(value.trim()) ? undefined : translate('bankAccount.error.routingNumber')),
                },
                [INPUT_IDS.ACCOUNT_NUMBER]: {
                    validate: (value) => {
                        const accountNumber = value.trim();
                        const isValid = CONST.BANK_ACCOUNT.REGEX.US_ACCOUNT_NUMBER.test(accountNumber) || CONST.BANK_ACCOUNT.REGEX.MASKED_US_ACCOUNT_NUMBER.test(accountNumber);
                        return isValid ? undefined : translate('bankAccount.error.accountNumber');
                    },
                },
            },
            content: (
                <>
                    <TextField
                        inputID={INPUT_IDS.ROUTING_NUMBER}
                        label={translate('bankAccount.routingNumber')}
                        defaultValue={answers.routingNumber}
                        inputMode={CONST.INPUT_MODE.NUMERIC}
                        isLocked={isLocked}
                    />
                    <TextField
                        inputID={INPUT_IDS.ACCOUNT_NUMBER}
                        label={translate('bankAccount.accountNumber')}
                        defaultValue={answers.accountNumber}
                        inputMode={CONST.INPUT_MODE.NUMERIC}
                        isLocked={isLocked}
                    />
                </>
            ),
        },
        answers,
        translate,
    );
}

/** The entry opens a flow with a workspace and the Plaid page blocks Next until an account is picked, so the failures are only a guard */
function submitBankAccount({answers, policyID, bankAccount}: USDStepInput): Promise<RequestOutcome> {
    if (!policyID) {
        return failRequest(getRequestKey(REQUEST_NAMES.CONNECT_BANK_ACCOUNT, bankAccount));
    }
    if (answers.setupType === SBO_CONST.SETUP_TYPE.PLAID) {
        if (!answers.plaidAccountID) {
            return failRequest(getRequestKey(REQUEST_NAMES.CONNECT_BANK_ACCOUNT, bankAccount));
        }
        return connectBankAccountWithPlaid({
            policyID,
            plaidAccountID: answers.plaidAccountID,
        });
    }
    return connectBankAccountManually({
        policyID,
        routingNumber: answers.routingNumber.trim(),
        accountNumber: answers.accountNumber.trim(),
    });
}

/** The bank account details, typed by hand or picked from the bank through Plaid, as the user chose on the entry page */
function getBankAccountStep(input: USDStepInput): StepConfig {
    return {
        id: PAGE_NAMES.BANK_ACCOUNT,
        title: input.translate('bankAccount.bankInfo'),
        counterIndex: STEP_INDEX.BANK_ACCOUNT,
        isComplete: hasPassedServerStep(input.achData, STEP.BANK_ACCOUNT),
        pages: [getBankPage(input)],
        submit: () => submitBankAccount(input),
        requestKey: getRequestKey(REQUEST_NAMES.CONNECT_BANK_ACCOUNT, input.bankAccount),
    };
}

/** The user's legal name, date of birth and the last four digits of the SSN, sent together after the confirmation */
function getPersonalInfoStep({answers, achData, bankAccount, translate}: USDStepInput): StepConfig {
    const SUB_PAGES = SBO_CONST.USD.PERSONAL_INFO_SUB_PAGES;
    const hasServerPersonalInfo = !!achData?.firstName && !!achData.lastName && !!achData.dob && !!achData.ssnLast4;

    return {
        id: PAGE_NAMES.REQUESTOR,
        title: translate('personalInfoStep.personalInfo'),
        counterIndex: STEP_INDEX.PERSONAL_INFO,
        isComplete: hasPassedServerStep(achData, STEP.REQUESTOR) || hasServerPersonalInfo,
        pages: [
            getFormPage(
                {
                    id: SUB_PAGES.FULL_NAME,
                    title: translate('personalInfoStep.enterYourLegalFirstAndLast'),
                    enabledWhenOffline: true,
                    inputs: getLegalNameInputs(INPUT_IDS.FIRST_NAME, INPUT_IDS.LAST_NAME, translate),
                    content: (
                        <LegalNameFields
                            firstNameID={INPUT_IDS.FIRST_NAME}
                            lastNameID={INPUT_IDS.LAST_NAME}
                            firstName={answers.firstName}
                            lastName={answers.lastName}
                        />
                    ),
                },
                answers,
                translate,
            ),
            getFormPage(
                {
                    id: SUB_PAGES.DATE_OF_BIRTH,
                    title: translate('personalInfoStep.enterYourDateOfBirth'),
                    enabledWhenOffline: true,
                    inputs: {
                        [INPUT_IDS.DOB]: {
                            validate: (value) => getDateOfBirthError(value, translate),
                        },
                    },
                    content: (
                        <DateOfBirthField
                            inputID={INPUT_IDS.DOB}
                            defaultValue={answers.dob}
                        />
                    ),
                },
                answers,
                translate,
            ),
            getFormPage(
                {
                    id: SUB_PAGES.SSN,
                    title: translate('personalInfoStep.enterTheLast4'),
                    enabledWhenOffline: true,
                    inputs: {
                        [INPUT_IDS.SSN_LAST_4]: {
                            validate: (value) => (isValidSSNLastFour(value) ? undefined : translate('bankAccount.error.ssnLast4')),
                        },
                    },
                    content: (
                        <TextField
                            inputID={INPUT_IDS.SSN_LAST_4}
                            label={translate('personalInfoStep.last4SSN')}
                            defaultValue={answers.ssnLast4}
                            inputMode={CONST.INPUT_MODE.NUMERIC}
                            maxLength={SBO_CONST.SSN_LAST_4_LENGTH}
                            hint={`The mock server rejects ${SBO_CONST.MOCK.REJECTED_SSN_LAST_4}.`}
                        />
                    ),
                },
                answers,
                translate,
            ),
            {
                kind: 'confirmation',
                id: SUB_PAGES.CONFIRMATION,
                isComplete: true,
                title: translate('personalInfoStep.letsDoubleCheck'),
                rows: [
                    {
                        id: 'legalName',
                        label: translate('personalInfoStep.legalName'),
                        value: getOwnerFullName(answers),
                        editPageID: SUB_PAGES.FULL_NAME,
                    },
                    {
                        id: 'dob',
                        label: translate('common.dob'),
                        value: answers.dob,
                        editPageID: SUB_PAGES.DATE_OF_BIRTH,
                    },
                    {
                        id: 'ssnLast4',
                        label: translate('personalInfoStep.last4SSN'),
                        value: answers.ssnLast4,
                        editPageID: SUB_PAGES.SSN,
                    },
                ],
            },
        ],
        submit: () =>
            savePersonalInfo(
                bankAccount,
                {
                    firstName: answers.firstName,
                    lastName: answers.lastName,
                    dob: answers.dob,
                    ssnLast4: answers.ssnLast4,
                },
                true,
            ),
        requestKey: getRequestKey(REQUEST_NAMES.SAVE_PERSONAL_INFO, bankAccount),
    };
}

/** The mock stands in for the result that the Onfido widget returns */
const MOCK_ONFIDO_DATA = 'mock-onfido-data';

/** The identity check. The plan only holds it while the server has not finished the check. */
function getVerifyIdentityStep({bankAccount, translate}: USDStepInput): StepConfig {
    return {
        id: PAGE_NAMES.VERIFY_IDENTITY,
        title: translate('onfidoStep.verifyIdentity'),
        counterIndex: STEP_INDEX.PERSONAL_INFO,
        isComplete: false,
        pages: [
            {
                kind: 'custom',
                id: SBO_CONST.USD.VERIFY_IDENTITY_SUB_PAGES.IDENTITY_CHECK,
                component: 'onfido',
                isComplete: false,
            },
        ],
        submit: () => verifyIdentity(bankAccount, MOCK_ONFIDO_DATA),
        requestKey: getRequestKey(REQUEST_NAMES.VERIFY_IDENTITY, bankAccount),
    };
}

/** The company name, tax ID and type. Once the server checked the company, the name and the tax ID are locked. */
function getBusinessInfoStep({answers, achData, bankAccount, translate}: USDStepInput): StepConfig {
    const SUB_PAGES = SBO_CONST.USD.BUSINESS_INFO_SUB_PAGES;
    const isLocked = areCompanyDetailsLocked(achData);

    return {
        id: PAGE_NAMES.COMPANY,
        title: translate('businessInfoStep.businessInfo'),
        counterIndex: STEP_INDEX.BUSINESS_INFO,
        isComplete: hasPassedServerStep(achData, STEP.COMPANY),
        pages: [
            getFormPage(
                {
                    id: SUB_PAGES.NAME,
                    title: translate('businessInfoStep.enterTheNameOfYourBusiness'),
                    inputs: {
                        [INPUT_IDS.COMPANY_NAME]: {
                            validate: (value) => (isValidCompanyName(value) ? undefined : translate('bankAccount.error.companyName')),
                        },
                    },
                    content: (
                        <TextField
                            inputID={INPUT_IDS.COMPANY_NAME}
                            label={translate('businessInfoStep.businessName')}
                            defaultValue={answers.companyName}
                            isLocked={isLocked}
                        />
                    ),
                },
                answers,
                translate,
            ),
            getFormPage(
                {
                    id: SUB_PAGES.TAX_ID,
                    title: translate('businessInfoStep.enterYourCompanyTaxIdNumber'),
                    inputs: {
                        [INPUT_IDS.COMPANY_TAX_ID]: {
                            validate: (value) => (isValidTaxID(value) ? undefined : translate('bankAccount.error.taxID')),
                        },
                    },
                    content: (
                        <TextField
                            inputID={INPUT_IDS.COMPANY_TAX_ID}
                            label={translate('businessInfoStep.taxIDNumber')}
                            defaultValue={answers.companyTaxID}
                            placeholder={translate('businessInfoStep.taxIDNumberPlaceholder')}
                            inputMode={CONST.INPUT_MODE.NUMERIC}
                            hint={`The mock server rejects ${SBO_CONST.MOCK.REJECTED_TAX_ID}.`}
                            isLocked={isLocked}
                        />
                    ),
                },
                answers,
                translate,
            ),
            getFormPage(
                {
                    id: SUB_PAGES.INCORPORATION_TYPE,
                    title: translate('businessInfoStep.selectYourCompanyType'),
                    inputs: {[INPUT_IDS.INCORPORATION_TYPE]: {}},
                    content: (
                        <PicklistField
                            inputID={INPUT_IDS.INCORPORATION_TYPE}
                            label={translate('businessInfoStep.companyType')}
                            defaultValue={answers.incorporationType}
                            options={Object.values(SBO_CONST.USD.INCORPORATION_TYPES).map((incorporationType) => ({
                                value: incorporationType,
                                label: incorporationType,
                            }))}
                        />
                    ),
                },
                answers,
                translate,
            ),
            {
                kind: 'confirmation',
                id: SUB_PAGES.CONFIRMATION,
                isComplete: true,
                title: translate('businessInfoStep.letsDoubleCheck'),
                rows: [
                    {
                        id: 'companyName',
                        label: translate('businessInfoStep.businessName'),
                        value: answers.companyName,
                        editPageID: SUB_PAGES.NAME,
                    },
                    {
                        id: 'companyTaxID',
                        label: translate('businessInfoStep.taxIDNumber'),
                        value: answers.companyTaxID,
                        editPageID: SUB_PAGES.TAX_ID,
                    },
                    {
                        id: 'incorporationType',
                        label: translate('businessInfoStep.companyType'),
                        value: answers.incorporationType,
                        editPageID: SUB_PAGES.INCORPORATION_TYPE,
                    },
                ],
            },
        ],
        submit: () =>
            saveCompany(bankAccount, {
                companyName: answers.companyName,
                companyTaxID: answers.companyTaxID.replaceAll(CONST.REGEX.NON_NUMERIC, ''),
                incorporationType: answers.incorporationType,
            }),
        requestKey: getRequestKey(REQUEST_NAMES.SAVE_COMPANY, bankAccount),
    };
}

const OWNER_SUB_PAGES = SBO_CONST.USD.BENEFICIAL_OWNERS_SUB_PAGES;

/** The row of the user. The user's details belong to the personal info step, so the row cannot be opened here. */
const REQUESTOR_ROW_ID = 'requestor';

/** A USD owner is a legal name and a date of birth, both kept in the owner buffer until the confirmation */
function getOwnerDetailsPages({answers, translate}: USDStepInput): [OwnerDetailsPage, ...OwnerDetailsPage[]] {
    return [
        {
            kind: 'form',
            id: OWNER_SUB_PAGES.LEGAL_NAME,
            title: translate('beneficialOwnerInfoStep.enterLegalFirstAndLastName'),
            description: translate('beneficialOwnerInfoStep.legalNameSubtitle'),
            enabledWhenOffline: true,
            inputs: getLegalNameInputs(INPUT_IDS.OWNER_FIRST_NAME, INPUT_IDS.OWNER_LAST_NAME, translate),
            content: (
                <LegalNameFields
                    firstNameID={INPUT_IDS.OWNER_FIRST_NAME}
                    lastNameID={INPUT_IDS.OWNER_LAST_NAME}
                    firstName={answers.ownerFirstName}
                    lastName={answers.ownerLastName}
                />
            ),
        },
        {
            kind: 'form',
            id: OWNER_SUB_PAGES.DATE_OF_BIRTH,
            title: translate('beneficialOwnerInfoStep.enterTheDateOfBirthOfTheOwner'),
            enabledWhenOffline: true,
            inputs: {
                [INPUT_IDS.OWNER_DOB]: {
                    validate: (value) => getDateOfBirthError(value, translate),
                },
            },
            content: (
                <DateOfBirthField
                    inputID={INPUT_IDS.OWNER_DOB}
                    defaultValue={answers.ownerDob}
                />
            ),
        },
    ];
}

function getOwnerListRows({answers}: USDStepInput, isUserOwner: boolean, hasOtherOwners: boolean | undefined): ListRow[] {
    const requestorRows: ListRow[] = isUserOwner
        ? [
              {
                  id: REQUESTOR_ROW_ID,
                  title: getOwnerFullName(answers),
                  description: answers.dob,
                  isReadOnly: true,
              },
          ]
        : [];
    const ownerRows: ListRow[] = hasOtherOwners
        ? answers.owners.map((owner) => ({
              id: owner.id,
              title: getOwnerFullName(owner),
              description: owner.dob,
          }))
        : [];
    return [...requestorRows, ...ownerRows];
}

/** The user takes one of the places, so the last owner who no longer fits is dropped */
function getUserOwnerTransition({answers}: USDStepInput, values: OnboardingDraft): PageTransition {
    if (values.ownsMoreThan25Percent && answers.owners.length >= SBO_CONST.USD.MAX_NUMBER_OF_UBOS) {
        return {
            draftUpdate: {
                ...values,
                usdOwners: answers.owners.slice(0, SBO_CONST.USD.MAX_NUMBER_OF_UBOS - 1),
            },
        };
    }
    return {};
}

function getOwnersDefinition(input: USDStepInput, isUserOwner: boolean, hasOtherOwners: boolean | undefined): OwnersStepDefinition<USDOwnerDraft> {
    const {answers, translate} = input;
    return {
        subPages: {
            isUserOwner: OWNER_SUB_PAGES.IS_USER_UBO,
            isAnyoneElseOwner: OWNER_SUB_PAGES.IS_ANYONE_ELSE_UBO,
            confirmation: OWNER_SUB_PAGES.CONFIRMATION,
            areThereMoreOwners: OWNER_SUB_PAGES.ARE_THERE_MORE_UBOS,
            ownersList: OWNER_SUB_PAGES.UBOS_LIST,
        },
        answers,
        isUserOwner,
        hasOtherOwners,
        shouldShowOwnerPages: !!hasOtherOwners,
        canAddMoreOwners: (owners) => canAddMoreUSDOwners(owners, isUserOwner),
        detailsPages: getOwnerDetailsPages(input),
        confirmationTitle: translate('beneficialOwnerInfoStep.letsDoubleCheck'),
        confirmationRows: [
            {
                id: 'legalName',
                label: translate('beneficialOwnerInfoStep.legalName'),
                value: getOwnerFullName({
                    firstName: answers.ownerFirstName,
                    lastName: answers.ownerLastName,
                }),
                editPageID: OWNER_SUB_PAGES.LEGAL_NAME,
            },
            {
                id: 'dob',
                label: translate('common.dob'),
                value: answers.ownerDob,
                editPageID: OWNER_SUB_PAGES.DATE_OF_BIRTH,
            },
        ],
        listRows: getOwnerListRows(input, isUserOwner, hasOtherOwners),
        copy: {
            isUserOwnerTitle: translate('beneficialOwnerInfoStep.doYouOwn25percent', answers.companyName),
            isAnyoneElseOwnerTitle: translate('beneficialOwnerInfoStep.doAnyIndividualOwn25percent', answers.companyName),
            areThereMoreOwnersTitle: translate('beneficialOwnerInfoStep.areThereMoreIndividualsWhoOwn25percent', answers.companyName),
            description: translate('beneficialOwnerInfoStep.regulationRequiresUsToVerifyTheIdentity'),
        },
        getOwnerBuffer: getUSDOwnerBuffer,
        getOwnerFromBuffer: getUSDOwnerFromBuffer,
        getOwnersDraftUpdate: (owners) => ({usdOwners: owners}),
        onUserOwnerAnswer: (values) => getUserOwnerTransition(input, values),
        translate,
    };
}

/** The user is the requestor and stays out of the list, so the owner pages exist only once someone else owns 25% or more */
function getBeneficialOwnersStep(input: USDStepInput): StepConfig {
    const {answers, achData, bankAccount, translate} = input;
    const isUserOwner = answers.ownsMoreThan25Percent ?? false;
    const hasOtherOwners = answers.hasOtherBeneficialOwners;

    return {
        id: PAGE_NAMES.BENEFICIAL_OWNERS,
        title: translate('beneficialOwnerInfoStep.companyOwner'),
        counterIndex: STEP_INDEX.BENEFICIAL_OWNERS,
        isComplete: hasPassedServerStep(achData, STEP.BENEFICIAL_OWNERS),
        pages: getOwnerPages(getOwnersDefinition(input, isUserOwner, hasOtherOwners)),
        submit: () =>
            saveOwners(bankAccount, {
                ownsMoreThan25Percent: isUserOwner,
                owners: hasOtherOwners ? answers.owners : [],
            }),
        requestKey: getRequestKey(REQUEST_NAMES.SAVE_OWNERS, bankAccount),
    };
}

/** The three agreements that the user must accept before the server reviews the setup */
function getCompleteVerificationStep({answers, achData, bankAccount, translate}: USDStepInput): StepConfig {
    return {
        id: PAGE_NAMES.ACH_CONTRACT,
        title: translate('completeVerificationStep.completeVerification'),
        counterIndex: STEP_INDEX.COMPLETE_VERIFICATION,
        isComplete: hasPassedServerStep(achData, STEP.ACH_CONTRACT),
        pages: [
            getFormPage(
                {
                    id: SBO_CONST.USD.COMPLETE_VERIFICATION_SUB_PAGES.CONFIRM_AGREEMENTS,
                    title: translate('completeVerificationStep.confirmAgreements'),
                    submitLabel: translate('common.saveAndContinue'),
                    inputs: {
                        [INPUT_IDS.IS_AUTHORIZED_TO_USE_BANK_ACCOUNT]: {
                            requiredErrorText: translate('completeVerificationStep.isAuthorizedToUseBankAccountError'),
                        },
                        [INPUT_IDS.CERTIFY_TRUE_INFORMATION]: {
                            requiredErrorText: translate('completeVerificationStep.certifyTrueAndAccurateError'),
                        },
                        [INPUT_IDS.ACCEPT_TERMS_AND_CONDITIONS]: {
                            requiredErrorText: translate('common.error.acceptTerms'),
                        },
                    },
                    content: (
                        <>
                            <CheckboxField
                                inputID={INPUT_IDS.IS_AUTHORIZED_TO_USE_BANK_ACCOUNT}
                                label={translate('completeVerificationStep.isAuthorizedToUseBankAccount')}
                                defaultValue={answers.isAuthorizedToUseBankAccount}
                            />
                            <CheckboxField
                                inputID={INPUT_IDS.CERTIFY_TRUE_INFORMATION}
                                label={translate('completeVerificationStep.certifyTrueAndAccurate')}
                                defaultValue={answers.certifyTrueInformation}
                            />
                            <CheckboxField
                                inputID={INPUT_IDS.ACCEPT_TERMS_AND_CONDITIONS}
                                label={`${translate('common.iAcceptThe')} ${translate('completeVerificationStep.termsAndConditions')}`}
                                defaultValue={answers.acceptTermsAndConditions}
                            />
                        </>
                    ),
                },
                answers,
                translate,
            ),
        ],
        submit: () =>
            acceptACHContract(bankAccount, {
                isAuthorizedToUseBankAccount: answers.isAuthorizedToUseBankAccount,
                certifyTrueInformation: answers.certifyTrueInformation,
                acceptTermsAndConditions: answers.acceptTermsAndConditions,
            }),
        requestKey: getRequestKey(REQUEST_NAMES.ACCEPT_ACH_CONTRACT, bankAccount),
    };
}

type KYBDocument = {
    inputID: typeof INPUT_IDS.COMPANY_TAX_ID_DOCUMENT | typeof INPUT_IDS.COMPANY_ADDRESS_DOCUMENT;
    label: string;
    description: string;
    files: OnboardingForm[typeof INPUT_IDS.COMPANY_TAX_ID_DOCUMENT];
};

function getKYBDocument(documentType: KYBDocumentType, {answers, translate}: USDStepInput): KYBDocument {
    if (documentType === SBO_CONST.USD.KYB_DOCUMENT_TYPES.COMPANY_TAX_ID) {
        return {
            inputID: INPUT_IDS.COMPANY_TAX_ID_DOCUMENT,
            label: translate('documentsStep.taxIDVerification'),
            description: translate('documentsStep.taxIDVerificationDescription'),
            files: answers.companyTaxIDDocument,
        };
    }
    return {
        inputID: INPUT_IDS.COMPANY_ADDRESS_DOCUMENT,
        label: translate('documentsStep.companyAddressVerification'),
        description: translate('documentsStep.companyAddressVerificationDescription'),
        files: answers.companyAddressDocument,
    };
}

/**
 * The documents that the automatic checks could not verify. The server asks for documents only when its checks fail,
 * so the plan holds this step only while the account lists required documents.
 */
function getKYBDocumentsStep(input: USDStepInput, requiredDocuments: KYBDocumentType[]): StepConfig {
    const {answers, achData, bankAccount, translate} = input;
    const documents = requiredDocuments.map((documentType) => getKYBDocument(documentType, input));
    const inputs: PageInputs = {};
    for (const document of documents) {
        inputs[document.inputID] = {};
    }

    return {
        id: PAGE_NAMES.KYB_DOCS,
        title: translate('documentsStep.subheader'),
        isComplete: hasPassedServerStep(achData, STEP.KYB_DOCS),
        pages: [
            getFormPage(
                {
                    id: SBO_CONST.USD.KYB_DOCUMENTS_SUB_PAGES.UPLOAD,
                    title: translate('documentsStep.beforeYouGo'),
                    description: translate('documentsStep.verificationFailed'),
                    submitLabel: translate('common.verify'),
                    inputs,
                    content: documents.map((document) => (
                        <FileField
                            key={document.inputID}
                            inputID={document.inputID}
                            label={document.label}
                            defaultValue={document.files}
                        >
                            <FileFieldDescription>{document.description}</FileFieldDescription>
                        </FileField>
                    )),
                },
                answers,
                translate,
            ),
        ],
        submit: () => {
            const documentNames = documents.map((document) => document.files.at(0)?.name ?? '').filter((documentName) => !!documentName);
            return uploadKYBDocuments(bankAccount, documentNames);
        },
        requestKey: getRequestKey(REQUEST_NAMES.UPLOAD_KYB_DOCUMENTS, bankAccount),
    };
}

/**
 * The last step: the review, the test deposits and the connected account. Its custom page sends its own requests, so
 * the step has no submit. While the account waits for the deposits, Back leaves the flow, because the earlier steps
 * are already sent.
 */
function getValidationStep({achData, bankAccount, translate}: USDStepInput): StepConfig {
    const isPending = isPendingValidation(achData);
    return {
        id: PAGE_NAMES.VALIDATION,
        title: isPending ? translate('connectBankAccountStep.validateYourBankAccount') : translate('bankAccount.addBankAccount'),
        counterIndex: STEP_INDEX.VALIDATION,
        isComplete: hasPassedServerStep(achData, STEP.VALIDATION),
        pages: [
            {
                kind: 'custom',
                id: SBO_CONST.USD.VALIDATION_SUB_PAGES.VALIDATE,
                component: 'validation',
                isComplete: false,
                shouldExitOnBack: isPending,
            },
        ],
        requestKey: getRequestKey(REQUEST_NAMES.VALIDATE_BANK_ACCOUNT, bankAccount),
    };
}

/** The identity check and the documents step are only in the plan while the server asks for them, so no transition has to skip them */
function buildUSDPlan(draft: OnboardingDraft | undefined, account: OnyxEntry<OnboardingAccount>, {translate, policyID}: PlanContext): FlowPlan {
    const input: USDStepInput = {
        ...getBaseStepInput(account, policyID, translate),
        answers: getUSDAnswers(draft, account),
    };
    const requiredDocuments = input.achData?.requiredKYBDocuments ?? [];

    return {
        steps: [
            getCountryStep(input),
            getBankAccountStep(input),
            getPersonalInfoStep(input),
            ...(input.achData?.isOnfidoSetupComplete ? [] : [getVerifyIdentityStep(input)]),
            getBusinessInfoStep(input),
            getBeneficialOwnersStep(input),
            getCompleteVerificationStep(input),
            ...(requiredDocuments.length > 0 ? [getKYBDocumentsStep(input, requiredDocuments)] : []),
            getValidationStep(input),
        ],
    };
}

export default buildUSDPlan;
