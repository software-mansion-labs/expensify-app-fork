/**
 * The whole NonUSD flow as a plan, built from the draft, the server data and the server lists. It is the one place that
 * decides which steps and pages the NonUSD flow has. Each form page lists the rules of its inputs and renders its
 * fields as JSX from `form/fields`.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {isValidCompanyName} from '@libs/ValidationUtils';

import CheckboxField from '@pages/SimplifiedBankOnboarding/form/fields/CheckboxField';
import FileField from '@pages/SimplifiedBankOnboarding/form/fields/FileField';
import FileFieldDescription from '@pages/SimplifiedBankOnboarding/form/fields/FileFieldDescription';
import LegalNameFields from '@pages/SimplifiedBankOnboarding/form/fields/LegalNameFields';
import PicklistField from '@pages/SimplifiedBankOnboarding/form/fields/PicklistField';
import type {PicklistOption} from '@pages/SimplifiedBankOnboarding/form/fields/PicklistField';
import ReadOnlyField from '@pages/SimplifiedBankOnboarding/form/fields/ReadOnlyField';
import TextField from '@pages/SimplifiedBankOnboarding/form/fields/TextField';
import type {NonUSDAnswers} from '@pages/SimplifiedBankOnboarding/model/answers/types';
import areBankFieldsLoaded from '@pages/SimplifiedBankOnboarding/model/bankFields/areBankFieldsLoaded';
import getBankFieldOptionLabel from '@pages/SimplifiedBankOnboarding/model/bankFields/getBankFieldOptionLabel';
import getBankFieldRuleError from '@pages/SimplifiedBankOnboarding/model/bankFields/getBankFieldRuleError';
import {getAccountHolderDetailsFields, getBankAccountDetailsFields} from '@pages/SimplifiedBankOnboarding/model/bankFields/splitBankFields';
import getNonUSDFlowState from '@pages/SimplifiedBankOnboarding/model/getNonUSDFlowState';
import {canAddMoreGlobalOwners, isValidGlobalOwnerShare} from '@pages/SimplifiedBankOnboarding/model/owners/canAddMoreOwners';
import {getGlobalOwnerBuffer, getGlobalOwnerFromBuffer} from '@pages/SimplifiedBankOnboarding/model/owners/ownerBuffer';
import {findOwner, removeOwner} from '@pages/SimplifiedBankOnboarding/model/owners/ownerList';
import {getOwnerFullName} from '@pages/SimplifiedBankOnboarding/model/owners/ownerNames';
import {isConnected, isGlobalAccountCreated, isVerifying, requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/model/setupStatus';
import type FlowData from '@pages/SimplifiedBankOnboarding/model/types';
import failRequest from '@pages/SimplifiedBankOnboarding/requests/failRequest';
import createGlobalBankAccount from '@pages/SimplifiedBankOnboarding/requests/nonUSD/createGlobalBankAccount';
import finishGlobalOnboarding from '@pages/SimplifiedBankOnboarding/requests/nonUSD/finishGlobalOnboarding';
import type {FinishDetails} from '@pages/SimplifiedBankOnboarding/requests/nonUSD/finishGlobalOnboarding';
import saveGlobalCompany from '@pages/SimplifiedBankOnboarding/requests/nonUSD/saveGlobalCompany';
import saveGlobalOwners from '@pages/SimplifiedBankOnboarding/requests/nonUSD/saveGlobalOwners';
import {askForSignerInfo, saveDirectorInfo} from '@pages/SimplifiedBankOnboarding/requests/nonUSD/signerInfo';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import getRequestKey from '@pages/SimplifiedBankOnboarding/requests/requestKey';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {GlobalOwnerDraft, TextInputID} from '@pages/SimplifiedBankOnboarding/types/form';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {ACHData, BankFormField} from '@pages/SimplifiedBankOnboarding/types/onyx';

import CONST from '@src/CONST';

import {Str} from 'expensify-common';
import React from 'react';

import type {FormPageDefinition} from './getFormPage';
import type {FlowPlan, PageConfig, PageInputs, PlanContext, StepConfig} from './types';

import getBaseStepInput from './getBaseStepInput';
import getFormPage from './getFormPage';
import getOwnerPages from './owners/getOwnerPages';
import getSignerDetailsPages from './signer/getSignerDetailsPages';
import areInputsComplete from './validation/areInputsComplete';
import getLegalNameInputs from './validation/getLegalNameInputs';

const {CURRENT_USER_KEY, PAGE_NAMES, STEP_INDEX} = SBO_CONST.NON_USD;

/** The last request went through: the server reviews the setup or already opened the account */
function isOnboardingSent(achData: ACHData | undefined): boolean {
    return isVerifying(achData) || isConnected(achData, true);
}

/** The answers of the agreements step that the final request sends, from the agreements step or, for AUD, the docusign step */
function getAgreementDetails(answers: NonUSDAnswers): FinishDetails {
    return {
        authorizedToBindClientToAgreement: answers.authorizedToBindClientToAgreement,
        agreeToTermsAndConditions: answers.agreeToTermsAndConditions,
        consentToPrivacyNotice: answers.consentToPrivacyNotice,
    };
}

function getCountryOptions(currency: string, translate: LocalizedTranslate): PicklistOption[] {
    if (currency === SBO_CONST.CURRENCY.EUR) {
        return SBO_CONST.EUR_COUNTRIES.map((country) => ({value: country, label: translate(`allCountries.${country}`)}));
    }
    if (currency === SBO_CONST.CURRENCY.AUD) {
        return [{value: SBO_CONST.COUNTRY.AU, label: translate('allCountries.AU')}];
    }
    return [];
}

/** The server describes each bank input. An input with a value set is a picklist of those values, any other a text input checked by the server rules. */
function getBankFieldInputs(fields: BankFormField[]): PageInputs {
    const inputs: PageInputs = {};
    for (const field of fields) {
        inputs[field.id] = {
            isOptional: !field.isRequired,
            validate: field.valueSet ? undefined : (value) => getBankFieldRuleError(field, value),
        };
    }
    return inputs;
}

function renderBankField(field: BankFormField, defaultValue: string) {
    if (field.valueSet) {
        return (
            <PicklistField
                key={field.id}
                inputID={field.id}
                label={field.label}
                defaultValue={defaultValue}
                options={field.valueSet.map((option) => ({value: option.id, label: option.text}))}
            />
        );
    }
    return (
        <TextField
            key={field.id}
            inputID={field.id}
            label={field.label}
            defaultValue={defaultValue}
        />
    );
}

/** The list keeps the owners of answers that the user took back, so the list and the request show only the owners the answers still allow */
function getOwnersToSend(owners: GlobalOwnerDraft[], isUserOwner: boolean, hasOtherOwners: boolean | undefined): GlobalOwnerDraft[] {
    return owners.filter((owner) => (owner.id === CURRENT_USER_KEY ? isUserOwner : !!hasOtherOwners));
}

type EmailRule = {
    inputID: TextInputID;

    /** The input of the other email of the page, which this one may not repeat */
    mustDifferFrom?: TextInputID;
};

function getEmailInputs(rules: EmailRule[], translate: LocalizedTranslate): PageInputs {
    const inputs: PageInputs = {};
    for (const {inputID, mustDifferFrom} of rules) {
        inputs[inputID] = {
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
    return inputs;
}

/** The docusign step is only in the plan for the currencies that need a signed form */
function buildNonUSDPlan(data: FlowData, {translate, policyID: urlPolicyID}: PlanContext): FlowPlan {
    const {draft, account, bankFields, picklists} = data;
    const {achData, policyID, bankAccount} = getBaseStepInput(account, urlPolicyID, translate);
    const {currency, answers} = getNonUSDFlowState(data, urlPolicyID);
    const formPage = (definition: FormPageDefinition) => getFormPage(definition, answers, translate);
    const corpay = achData?.corpay;
    const isAUD = currency === SBO_CONST.CURRENCY.AUD;
    const isSent = isOnboardingSent(achData);

    const steps: StepConfig[] = [];

    // The currency of the workspace decides the countries: a EUR workspace picks one of its countries and an AUD
    // workspace gets its only country locked. The country is locked once the account exists, because the account
    // belongs to that country. Confirm only keeps the country in the draft, the server receives it with the bank account.
    // The default country of AUD does not count, only a country that the user confirmed or the server already has
    const isCountryConfirmed = !!(draft?.country ?? achData?.country);
    const canChangeCountry = currency === SBO_CONST.CURRENCY.EUR && !achData?.created;

    steps.push({
        id: PAGE_NAMES.COUNTRY,
        title: translate('countryStep.confirmCurrency'),
        counterIndex: STEP_INDEX.COUNTRY,
        isComplete: isCountryConfirmed,

        pages: [
            formPage({
                id: SBO_CONST.NON_USD.COUNTRY_SUB_PAGES.CONFIRM_CURRENCY,
                isComplete: isCountryConfirmed,
                title: translate('countryStep.confirmBusinessBank'),
                submitLabel: translate('common.confirm'),
                enabledWhenOffline: true,

                inputs: {[INPUT_IDS.COUNTRY]: {}},
                content: (
                    <>
                        <ReadOnlyField
                            label={translate('common.currency')}
                            value={currency}
                        />
                        <PicklistField
                            inputID={INPUT_IDS.COUNTRY}
                            label={translate('common.country')}
                            defaultValue={answers.country}
                            options={getCountryOptions(currency, translate)}
                            modalTitle={translate('countryStep.selectCountry')}
                            searchTitle={translate('countryStep.findCountry')}
                            isLocked={!canChangeCountry}
                        />
                    </>
                ),
            }),
        ],
    });

    // The server describes the bank inputs for the country and the currency. Until they arrive, the bank page stands
    // alone and waits for them. The request at the end creates the bank account.
    const BANK_INFO = SBO_CONST.NON_USD.BANK_INFO_SUB_PAGES;
    const isBankAccountCreated = isGlobalAccountCreated(achData);

    // A group without inputs has no page
    const bankFieldGroups = [
        {pageID: BANK_INFO.BANK_ACCOUNT_DETAILS, title: translate('bankInfoStep.whatAreYour'), fields: getBankAccountDetailsFields(bankFields)},
        {pageID: BANK_INFO.ACCOUNT_HOLDER_DETAILS, title: translate('addPersonalBankAccount.accountHolderInformationStepHeader'), fields: getAccountHolderDetailsFields(bankFields)},
    ].filter((group) => group.fields.length > 0);

    steps.push({
        id: PAGE_NAMES.BANK_INFO,
        title: translate('bankAccount.bankInfo'),
        counterIndex: STEP_INDEX.BANK_INFO,
        isComplete: isBankAccountCreated,

        pages: areBankFieldsLoaded(bankFields, answers.country, currency)
            ? [
                  ...bankFieldGroups.map(({pageID, title, fields}) =>
                      formPage({
                          id: pageID,
                          title,
                          enabledWhenOffline: true,

                          inputs: getBankFieldInputs(fields),
                          content: fields.map((field) => renderBankField(field, answers[field.id])),
                      }),
                  ),
                  {
                      kind: 'confirmation',
                      id: BANK_INFO.CONFIRMATION,
                      isComplete: isBankAccountCreated,
                      title: translate('bankInfoStep.letsDoubleCheck'),
                      rows: bankFieldGroups.flatMap(({pageID, fields}) =>
                          fields.map((field) => ({id: field.id, label: field.label, value: getBankFieldOptionLabel(field, answers[field.id]), editPageID: pageID})),
                      ),
                  },
              ]
            : [{kind: 'form', id: BANK_INFO.BANK_ACCOUNT_DETAILS, isComplete: false, isLoading: true, title: translate('bankInfoStep.whatAreYour'), inputs: {}, content: null}],

        submit: () => {
            // The account belongs to a workspace, so a flow opened without one cannot create it. The entry always opens
            // the flow with a workspace, so the page shows an error instead of a Next that does nothing.
            if (!policyID) {
                return failRequest(getRequestKey(REQUEST_NAMES.CREATE_GLOBAL_BANK_ACCOUNT, bankAccount));
            }
            return createGlobalBankAccount({
                policyID,
                country: answers.country,
                currency,
                fields: Object.fromEntries((bankFields?.formFields ?? []).map((field) => [field.id, answers[field.id]])),
            });
        },
        requestKey: getRequestKey(REQUEST_NAMES.CREATE_GLOBAL_BANK_ACCOUNT, bankAccount),
    });

    // The business types come from the server picklists of the country
    const BUSINESS_INFO = SBO_CONST.NON_USD.BUSINESS_INFO_SUB_PAGES;
    const businessTypeOptions = (picklists?.picklists?.businessType ?? []).map((businessType) => ({value: businessType.id, label: businessType.name}));

    steps.push({
        id: PAGE_NAMES.BUSINESS_INFO,
        title: translate('businessInfoStep.businessInfoTitle'),
        counterIndex: STEP_INDEX.BUSINESS_INFO,
        isComplete: !!corpay?.companyName && !!corpay.businessType,

        pages: [
            formPage({
                id: BUSINESS_INFO.NAME,
                title: translate('businessInfoStep.whatsTheBusinessName'),
                enabledWhenOffline: true,

                inputs: {[INPUT_IDS.COMPANY_NAME]: {validate: (value) => (isValidCompanyName(value) ? undefined : translate('bankAccount.error.companyName'))}},
                content: (
                    <TextField
                        inputID={INPUT_IDS.COMPANY_NAME}
                        label={translate('businessInfoStep.legalBusinessName')}
                        defaultValue={answers.companyName}
                    />
                ),
            }),

            formPage({
                id: BUSINESS_INFO.BUSINESS_TYPE,
                title: translate('businessInfoStep.whatTypeOfBusinessIsIt'),
                enabledWhenOffline: true,
                // The page waits for the business types, unless it already has a value to show
                isLoading: businessTypeOptions.length === 0 && !answers.businessType,

                inputs: {[INPUT_IDS.BUSINESS_TYPE]: {}},
                content: (
                    <PicklistField
                        inputID={INPUT_IDS.BUSINESS_TYPE}
                        label={translate('businessInfoStep.businessType')}
                        defaultValue={answers.businessType}
                        options={businessTypeOptions}
                        modalTitle={translate('businessInfoStep.selectBusinessType')}
                        searchTitle={translate('businessInfoStep.findBusinessType')}
                    />
                ),
            }),

            {
                kind: 'confirmation',
                id: BUSINESS_INFO.CONFIRMATION,
                isComplete: true,
                title: translate('businessInfoStep.letsDoubleCheck'),
                rows: [
                    {id: 'companyName', label: translate('businessInfoStep.legalBusinessName'), value: answers.companyName, editPageID: BUSINESS_INFO.NAME},
                    {
                        id: 'businessType',
                        label: translate('businessInfoStep.businessType'),
                        value: businessTypeOptions.find((option) => option.value === answers.businessType)?.label ?? answers.businessType,
                        editPageID: BUSINESS_INFO.BUSINESS_TYPE,
                    },
                ],
            },
        ],

        submit: () => saveGlobalCompany(bankAccount, {companyName: answers.companyName, businessType: answers.businessType}),
        requestKey: getRequestKey(REQUEST_NAMES.SAVE_GLOBAL_COMPANY, bankAccount),
    });

    // The user is an owner in the list under a fixed ID, so a user who owns 25% or more enters their own name and
    // share first. The shares of all owners may not exceed 100%.
    const OWNERS = SBO_CONST.NON_USD.BENEFICIAL_OWNER_INFO_SUB_PAGES;
    const isUserOwner = answers.ownsMoreThan25Percent ?? false;
    const hasOtherOwners = answers.hasOtherBeneficialOwners;
    const ownersToSend = getOwnersToSend(answers.owners, isUserOwner, hasOtherOwners);
    const isUserEnteringOwnData = answers.ownerBeingModifiedID === CURRENT_USER_KEY;

    steps.push({
        id: PAGE_NAMES.BENEFICIAL_OWNER_INFO,
        title: translate('ownershipInfoStep.ownerInfo'),
        counterIndex: STEP_INDEX.BENEFICIAL_OWNERS,
        isComplete: corpay?.anyIndividualOwn25PercentOrMore !== undefined,

        pages: getOwnerPages({
            subPages: {
                isUserOwner: OWNERS.IS_USER_BENEFICIAL_OWNER,
                isAnyoneElseOwner: OWNERS.IS_ANYONE_ELSE_BENEFICIAL_OWNER,
                confirmation: OWNERS.CONFIRMATION,
                areThereMoreOwners: OWNERS.ARE_THERE_MORE_BENEFICIAL_OWNERS,
                ownersList: OWNERS.BENEFICIAL_OWNERS_LIST,
            },
            answers,
            isUserOwner,
            hasOtherOwners,
            shouldShowOwnerPages: isUserOwner || !!hasOtherOwners,
            canAddMoreOwners: canAddMoreGlobalOwners,
            userOwnerID: CURRENT_USER_KEY,
            detailsPages: [
                {
                    kind: 'form',
                    id: OWNERS.NAME,
                    title: translate(isUserEnteringOwnData ? 'ownershipInfoStep.whatsYourName' : 'ownershipInfoStep.whatsTheOwnersName'),
                    description: translate(isUserEnteringOwnData ? 'personalInfoStep.legalNameSubtitle' : 'beneficialOwnerInfoStep.legalNameSubtitle'),
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
                    id: OWNERS.OWNERSHIP_PERCENTAGE,
                    title: translate('ownershipInfoStep.whatPercentage'),
                    enabledWhenOffline: true,

                    inputs: {
                        [INPUT_IDS.OWNER_OWNERSHIP_PERCENTAGE]: {
                            validate: (value) =>
                                isValidGlobalOwnerShare(value, answers.owners, answers.ownerBeingModifiedID) ? undefined : translate('bankAccount.error.ownershipPercentage'),
                        },
                    },

                    content: (
                        <TextField
                            inputID={INPUT_IDS.OWNER_OWNERSHIP_PERCENTAGE}
                            label={translate('ownershipInfoStep.ownership')}
                            defaultValue={answers.ownerOwnershipPercentage}
                            inputMode={CONST.INPUT_MODE.NUMERIC}
                        />
                    ),
                },
            ],
            confirmationTitle: translate('ownershipInfoStep.letsDoubleCheck'),
            confirmationRows: [
                {
                    id: 'legalName',
                    label: translate('ownershipInfoStep.legalName'),
                    value: getOwnerFullName({firstName: answers.ownerFirstName, lastName: answers.ownerLastName}),
                    editPageID: OWNERS.NAME,
                },

                {
                    id: 'ownershipPercentage',
                    label: translate('ownershipInfoStep.ownershipPercentage'),
                    value: `${answers.ownerOwnershipPercentage}%`,
                    editPageID: OWNERS.OWNERSHIP_PERCENTAGE,
                },
            ],
            listRows: ownersToSend.map((owner) => ({id: owner.id, title: getOwnerFullName(owner), description: `${owner.ownershipPercentage}%`})),
            copy: {
                isUserOwnerTitle: translate('ownershipInfoStep.doYouOwn', answers.companyName),
                isAnyoneElseOwnerTitle: translate('ownershipInfoStep.doesAnyoneOwn', answers.companyName),
                areThereMoreOwnersTitle: translate('ownershipInfoStep.areThereOther', answers.companyName),
                description: translate('ownershipInfoStep.regulationsRequire'),
            },
            getOwnerBuffer: getGlobalOwnerBuffer,
            getOwnerFromBuffer: getGlobalOwnerFromBuffer,
            getOwnersDraftUpdate: (owners) => ({globalOwners: owners}),
            // An owner user enters their own details next, the user who is no owner leaves the list
            onUserOwnerAnswer: (values) =>
                values.ownsMoreThan25Percent
                    ? {
                          draftUpdate: {...values, ...getGlobalOwnerBuffer(findOwner(answers.owners, CURRENT_USER_KEY)), ownerBeingModifiedID: CURRENT_USER_KEY},
                          nextPageID: OWNERS.NAME,
                      }
                    : {draftUpdate: {...values, globalOwners: removeOwner(answers.owners, CURRENT_USER_KEY), ownerBeingModifiedID: null}},
            translate,
        }),

        submit: () => saveGlobalOwners(bankAccount, {ownsMoreThan25Percent: isUserOwner, owners: ownersToSend}),
        requestKey: getRequestKey(REQUEST_NAMES.SAVE_GLOBAL_OWNERS, bankAccount),
    });

    // The pages follow the director answer, so until it is given the step holds only the question. A director gives
    // their name and job title, an owner only the job title because the owner step has the name. Other directors are
    // invited by email and the step waits for them on the hang tight page.
    const SIGNER = SBO_CONST.NON_USD.SIGNER_INFO_SUB_PAGES;

    // Other directors are invited by email. An AUD account always needs a second director, so even a director invites one.
    const shouldInviteSigners = answers.isUserDirector === false || (answers.isUserDirector === true && isAUD);

    // The invited directors filled in their details: the director, and for AUD also the second one
    const areSignersKnown = !!corpay?.signerFullName && (!isAUD || !!corpay.secondSignerFullName);

    const signerPages: PageConfig[] = [
        {
            kind: 'question',
            id: SIGNER.IS_DIRECTOR,
            isComplete: answers.isUserDirector !== undefined,
            fieldID: INPUT_IDS.IS_USER_DIRECTOR,
            title: translate('signerInfoStep.areYouDirector', answers.companyName),
            description: translate('signerInfoStep.regulationRequiresUs'),
            defaultValue: answers.isUserDirector ?? false,
        },
    ];

    if (answers.isUserDirector) {
        // A director who is also an owner signs with the name of the owner step. The answer "I own 25%" may still be only
        // in the draft, with no owner details saved, and then there is no owner name to take.
        const userOwner = answers.ownsMoreThan25Percent ? findOwner(answers.owners, CURRENT_USER_KEY) : undefined;
        const userOwnerName = userOwner ? getOwnerFullName(userOwner) : undefined;
        const signerFullName = userOwnerName ?? answers.signerFullName;
        const directorPages = getSignerDetailsPages({
            pageIDs: {name: SIGNER.NAME, jobTitle: SIGNER.JOB_TITLE, confirmation: SIGNER.CONFIRMATION},
            fullName: signerFullName,
            jobTitle: answers.signerJobTitle,
            shouldAskForName: !userOwnerName,
            isConfirmationComplete: !!corpay?.signerFullName,
            translate,
        });

        signerPages.push(...directorPages.formPages, {
            ...directorPages.confirmation,

            submit: () => saveDirectorInfo(bankAccount, {signerFullName, signerJobTitle: answers.signerJobTitle}),
            requestKey: getRequestKey(REQUEST_NAMES.SAVE_DIRECTOR_INFO, bankAccount),
        });
    }

    if (shouldInviteSigners) {
        // An AUD account needs two directors besides a user who is none, so that user gives two emails. A director of an
        // AUD account gives the second one only, any other user the one of the director.
        const shouldGatherBothEmails = isAUD && !answers.isUserDirector;
        const shouldGatherOnlySecondEmail = isAUD && !!answers.isUserDirector;
        const emailLabel = translate('common.email');
        const signerEmailInputs = getEmailInputs(
            [
                ...(shouldGatherOnlySecondEmail ? [] : [{inputID: INPUT_IDS.SIGNER_EMAIL}]),
                ...(isAUD ? [{inputID: INPUT_IDS.SECOND_SIGNER_EMAIL, mustDifferFrom: shouldGatherBothEmails ? INPUT_IDS.SIGNER_EMAIL : undefined}] : []),
            ],
            translate,
        );

        // The first email is only checked when the page asks for it, and the second one only for AUD
        const areSignerEmailsSaved = (shouldGatherOnlySecondEmail || !!corpay?.signerEmail) && (!isAUD || !!corpay?.secondSignerEmail);

        signerPages.push(
            formPage({
                id: SIGNER.ENTER_EMAIL,
                isComplete: areSignerEmailsSaved && areInputsComplete(signerEmailInputs, answers, translate),
                title: translate(shouldGatherBothEmails ? 'signerInfoStep.enterTwoEmails' : 'signerInfoStep.enterOneEmail', answers.companyName),
                description: shouldGatherBothEmails ? undefined : translate('signerInfoStep.regulationRequiresOneMoreDirector'),
                enabledWhenOffline: false,

                inputs: signerEmailInputs,
                content: (
                    <>
                        {!shouldGatherOnlySecondEmail && (
                            <TextField
                                inputID={INPUT_IDS.SIGNER_EMAIL}
                                label={shouldGatherBothEmails ? `${emailLabel} 1` : emailLabel}
                                defaultValue={answers.signerEmail}
                                inputMode={CONST.INPUT_MODE.EMAIL}
                            />
                        )}
                        {isAUD && (
                            <TextField
                                inputID={INPUT_IDS.SECOND_SIGNER_EMAIL}
                                label={shouldGatherBothEmails ? `${emailLabel} 2` : emailLabel}
                                defaultValue={answers.secondSignerEmail}
                                inputMode={CONST.INPUT_MODE.EMAIL}
                            />
                        )}
                    </>
                ),

                submit: () =>
                    askForSignerInfo(
                        bankAccount,
                        shouldGatherOnlySecondEmail
                            ? {secondSignerEmail: answers.secondSignerEmail}
                            : {signerEmail: answers.signerEmail, secondSignerEmail: isAUD ? answers.secondSignerEmail : undefined},
                    ),
                requestKey: getRequestKey(REQUEST_NAMES.ASK_FOR_SIGNER_INFO, bankAccount),
            }),
            {kind: 'custom', id: SIGNER.HANG_TIGHT, component: 'hangTight', isComplete: areSignersKnown, canComplete: areSignersKnown},
        );
    }

    steps.push({
        id: PAGE_NAMES.SIGNER_INFO,
        title: translate('signerInfoStep.signerInfo'),
        counterIndex: STEP_INDEX.SIGNER_INFO,
        isComplete: areSignersKnown,

        pages: signerPages,
    });

    // Without a docusign step after it, the agreements step sends the final request itself. For AUD it also collects
    // the bank statement, and the docusign step sends both together with the signed form.
    const agreementInputs: PageInputs = {
        [INPUT_IDS.AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT]: {requiredErrorText: translate('agreementsStep.error.authorized')},
        [INPUT_IDS.AGREE_TO_TERMS_AND_CONDITIONS]: {requiredErrorText: translate('common.error.acceptTerms')},
        [INPUT_IDS.CONSENT_TO_PRIVACY_NOTICE]: {requiredErrorText: translate('agreementsStep.error.consent')},
        ...(isAUD ? {[INPUT_IDS.BANK_STATEMENT]: {}} : {}),
    };
    const areAgreementsComplete = isSent || (isAUD && areInputsComplete(agreementInputs, answers, translate));

    steps.push({
        id: PAGE_NAMES.AGREEMENTS,
        title: translate('agreementsStep.agreements'),
        counterIndex: STEP_INDEX.AGREEMENTS,
        isComplete: areAgreementsComplete,

        pages: [
            formPage({
                id: SBO_CONST.NON_USD.AGREEMENTS_SUB_PAGES.CONFIRM_AGREEMENTS,
                isComplete: areAgreementsComplete,
                title: translate('agreementsStep.pleaseConfirm'),
                submitLabel: translate(isAUD ? 'common.confirm' : 'agreementsStep.accept'),
                enabledWhenOffline: false,

                inputs: agreementInputs,
                content: (
                    <>
                        <CheckboxField
                            inputID={INPUT_IDS.AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT}
                            label={translate('agreementsStep.iAmAuthorized')}
                            defaultValue={answers.authorizedToBindClientToAgreement}
                        />
                        <CheckboxField
                            inputID={INPUT_IDS.AGREE_TO_TERMS_AND_CONDITIONS}
                            label={translate('agreementsStep.iAcceptTheTermsAndConditionsAccessibility')}
                            defaultValue={answers.agreeToTermsAndConditions}
                        />
                        <CheckboxField
                            inputID={INPUT_IDS.CONSENT_TO_PRIVACY_NOTICE}
                            label={translate('agreementsStep.iConsentToThePrivacyNoticeAccessibility')}
                            defaultValue={answers.consentToPrivacyNotice}
                        />
                        {isAUD && (
                            <FileField
                                inputID={INPUT_IDS.BANK_STATEMENT}
                                label={translate('agreementsStep.bankStatement')}
                                defaultValue={answers.bankStatement}
                            >
                                <FileFieldDescription>{translate('agreementsStep.bankStatementDescription')}</FileFieldDescription>
                            </FileField>
                        )}
                    </>
                ),
            }),
        ],
        ...(isAUD
            ? {}
            : {
                  submit: () => finishGlobalOnboarding(bankAccount, getAgreementDetails(answers)),
                  requestKey: getRequestKey(REQUEST_NAMES.FINISH_GLOBAL_ONBOARDING, bankAccount),
              }),
    });

    // Only for currencies that need a signed authorization form. It sends the final request with the agreements and
    // the bank statement of the previous step. The mock server receives only the names of the files.
    if (requiresDocusignStep(currency)) {
        steps.push({
            id: PAGE_NAMES.DOCUSIGN,
            title: translate('docusignStep.subheader'),
            counterIndex: STEP_INDEX.DOCUSIGN,
            isComplete: isSent,

            pages: [
                formPage({
                    id: SBO_CONST.NON_USD.DOCUSIGN_SUB_PAGES.UPLOAD,
                    isComplete: isSent,
                    title: translate('docusignStep.pleaseCompleteTheBusinessAccount'),
                    description: translate('docusignStep.pleaseUploadTheDirect'),
                    submitLabel: translate('common.submit'),
                    enabledWhenOffline: false,

                    inputs: {[INPUT_IDS.ACH_AUTHORIZATION_FORM]: {}},
                    content: (
                        <FileField
                            inputID={INPUT_IDS.ACH_AUTHORIZATION_FORM}
                            label={translate('docusignStep.subheader')}
                            defaultValue={answers.achAuthorizationForm}
                        />
                    ),
                }),
            ],

            submit: () =>
                finishGlobalOnboarding(bankAccount, {
                    ...getAgreementDetails(answers),
                    bankStatementName: answers.bankStatement.at(0)?.name,
                    achAuthorizationFormName: answers.achAuthorizationForm.at(0)?.name,
                }),
            requestKey: getRequestKey(REQUEST_NAMES.FINISH_GLOBAL_ONBOARDING, bankAccount),
        });
    }

    // The last page shows the state of the review. It never counts as complete, so the flow resumes there once all is sent.
    steps.push({
        id: PAGE_NAMES.FINISH,
        title: translate('bankAccount.addBankAccount'),
        isComplete: false,

        pages: [{kind: 'custom', id: SBO_CONST.NON_USD.FINISH_SUB_PAGES.DONE, component: 'finish', isComplete: false, shouldExitOnBack: true}],
    });

    return {steps};
}

export default buildNonUSDPlan;
