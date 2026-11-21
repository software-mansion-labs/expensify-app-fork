/**
 * The whole NonUSD flow as a plan, built from the draft, the server data and the server lists. It is the one place that
 * decides which steps and pages the NonUSD flow has. A form page only lists its fields from `form/fields`, and a step or
 * a page names the request that saves it.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {isValidCompanyName} from '@libs/ValidationUtils';

import createCheckboxField from '@pages/SimplifiedBankOnboarding/form/fields/createCheckboxField';
import createFileField from '@pages/SimplifiedBankOnboarding/form/fields/createFileField';
import createLegalNameField from '@pages/SimplifiedBankOnboarding/form/fields/createLegalNameField';
import createPicklistField from '@pages/SimplifiedBankOnboarding/form/fields/createPicklistField';
import type {PicklistOption} from '@pages/SimplifiedBankOnboarding/form/fields/createPicklistField';
import createReadOnlyField from '@pages/SimplifiedBankOnboarding/form/fields/createReadOnlyField';
import createTextField from '@pages/SimplifiedBankOnboarding/form/fields/createTextField';
import {areFieldsComplete} from '@pages/SimplifiedBankOnboarding/form/fields/fieldSet';
import type {Field} from '@pages/SimplifiedBankOnboarding/form/fields/types';
import areBankFieldsLoaded from '@pages/SimplifiedBankOnboarding/model/bankFields/areBankFieldsLoaded';
import getBankFieldRuleError from '@pages/SimplifiedBankOnboarding/model/bankFields/getBankFieldRuleError';
import {getAccountHolderDetailsFields, getBankAccountDetailsFields} from '@pages/SimplifiedBankOnboarding/model/bankFields/splitBankFields';
import getNonUSDFlowState from '@pages/SimplifiedBankOnboarding/model/getNonUSDFlowState';
import {canAddMoreGlobalOwners, isValidGlobalOwnerShare} from '@pages/SimplifiedBankOnboarding/model/owners/canAddMoreOwners';
import {GLOBAL_OWNER_DRAFT} from '@pages/SimplifiedBankOnboarding/model/owners/ownerBuffer';
import {findOwner, removeOwner} from '@pages/SimplifiedBankOnboarding/model/owners/ownerList';
import {getOwnerFullName} from '@pages/SimplifiedBankOnboarding/model/owners/ownerNames';
import {isConnected, isGlobalAccountCreated, isVerifying, requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/model/setupStatus';
import type FlowData from '@pages/SimplifiedBankOnboarding/model/types';
import getFinishOnboardingRequest from '@pages/SimplifiedBankOnboarding/requests/nonUSD/getFinishOnboardingRequest';
import getGlobalBankAccountRequest from '@pages/SimplifiedBankOnboarding/requests/nonUSD/getGlobalBankAccountRequest';
import getGlobalCompanyRequest from '@pages/SimplifiedBankOnboarding/requests/nonUSD/getGlobalCompanyRequest';
import getGlobalOwnersRequest from '@pages/SimplifiedBankOnboarding/requests/nonUSD/getGlobalOwnersRequest';
import {getDirectorInfoRequest, getSignerInvitationRequest} from '@pages/SimplifiedBankOnboarding/requests/nonUSD/signerInfo';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {GlobalOwnerDraft, TextInputID} from '@pages/SimplifiedBankOnboarding/types/form';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {ACHData, BankFormField} from '@pages/SimplifiedBankOnboarding/types/onyx';

import CONST from '@src/CONST';

import {Str} from 'expensify-common';

import type {FormPageDefinition} from './getFormPage';
import type {FlowPlan, PageConfig, PlanContext, StepConfig} from './types';

import getBaseStepInput from './getBaseStepInput';
import getFormPage from './getFormPage';
import getOwnerPages from './owners/getOwnerPages';
import getSignerDetailsPages from './signer/getSignerDetailsPages';

const {CURRENT_USER_KEY, PAGE_NAMES, STEP_INDEX} = SBO_CONST.NON_USD;

/** The last request went through: the server reviews the setup or already opened the account */
function isOnboardingSent(achData: ACHData | undefined): boolean {
    return isVerifying(achData) || isConnected(achData, true);
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
function createBankField(field: BankFormField): Field {
    if (field.valueSet) {
        return createPicklistField(field.id, {
            label: field.label,
            options: field.valueSet.map((option) => ({value: option.id, label: option.text})),
            isOptional: !field.isRequired,
        });
    }
    return createTextField(field.id, {
        label: field.label,
        isOptional: !field.isRequired,
        validate: (value) => getBankFieldRuleError(field, value),
    });
}

/** The list keeps the owners of answers that the user took back, so the list and the request show only the owners the answers still allow */
function getOwnersToSend(owners: GlobalOwnerDraft[], isUserOwner: boolean, hasOtherOwners: boolean | undefined): GlobalOwnerDraft[] {
    return owners.filter((owner) => (owner.id === CURRENT_USER_KEY ? isUserOwner : !!hasOtherOwners));
}

type EmailFieldOptions = {
    label: string;

    /** The input of the other email of the page, which this one may not repeat */
    mustDifferFrom?: TextInputID;
};

function createEmailField(inputID: TextInputID, {label, mustDifferFrom}: EmailFieldOptions, translate: LocalizedTranslate): Field {
    return createTextField(inputID, {
        label,
        inputMode: CONST.INPUT_MODE.EMAIL,
        validate: (value, values) => {
            if (!Str.isValidEmail(value)) {
                return translate('bankAccount.error.email');
            }
            if (mustDifferFrom && values[mustDifferFrom] === value) {
                return translate('signerInfoStep.error.emailsMustBeDifferent');
            }
            return undefined;
        },
    });
}

/** The docusign step is only in the plan for the currencies that need a signed form */
function buildNonUSDPlan(data: FlowData, {translate, policyID: urlPolicyID}: PlanContext): FlowPlan {
    const {draft, account, bankFields, picklists} = data;
    const {achData, bankAccount} = getBaseStepInput(account, urlPolicyID, translate);
    const {currency, answers} = getNonUSDFlowState(data, urlPolicyID);
    const buildFormPage = (definition: FormPageDefinition) => getFormPage(definition, answers, translate);
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
            buildFormPage({
                id: SBO_CONST.NON_USD.COUNTRY_SUB_PAGES.CONFIRM_CURRENCY,
                isComplete: isCountryConfirmed,
                title: translate('countryStep.confirmBusinessBank'),
                submitLabel: translate('common.confirm'),

                fields: [
                    createReadOnlyField(translate('common.currency'), currency),
                    createPicklistField(INPUT_IDS.COUNTRY, {
                        label: translate('common.country'),
                        options: getCountryOptions(currency, translate),
                        modalTitle: translate('countryStep.selectCountry'),
                        searchTitle: translate('countryStep.findCountry'),
                        isLocked: !canChangeCountry,
                    }),
                ],
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
                  ...bankFieldGroups.map(({pageID, title, fields}) => buildFormPage({id: pageID, title, fields: fields.map(createBankField)})),
                  {kind: 'confirmation', id: BANK_INFO.CONFIRMATION, isComplete: isBankAccountCreated, title: translate('bankInfoStep.letsDoubleCheck')},
              ]
            : [{kind: 'form', id: BANK_INFO.BANK_ACCOUNT_DETAILS, isComplete: false, isLoading: true, title: translate('bankInfoStep.whatAreYour'), fields: []}],

        request: getGlobalBankAccountRequest(bankAccount, {
            country: answers.country,
            currency,
            fields: Object.fromEntries((bankFields?.formFields ?? []).map((field) => [field.id, answers[field.id]])),
        }),
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
            buildFormPage({
                id: BUSINESS_INFO.NAME,
                title: translate('businessInfoStep.whatsTheBusinessName'),

                fields: [
                    createTextField(INPUT_IDS.COMPANY_NAME, {
                        label: translate('businessInfoStep.legalBusinessName'),
                        validate: (value) => (isValidCompanyName(value) ? undefined : translate('bankAccount.error.companyName')),
                    }),
                ],
            }),

            buildFormPage({
                id: BUSINESS_INFO.BUSINESS_TYPE,
                title: translate('businessInfoStep.whatTypeOfBusinessIsIt'),
                // The page waits for the business types, unless it already has a value to show
                isLoading: businessTypeOptions.length === 0 && !answers.businessType,

                fields: [
                    createPicklistField(INPUT_IDS.BUSINESS_TYPE, {
                        label: translate('businessInfoStep.businessType'),
                        options: businessTypeOptions,
                        modalTitle: translate('businessInfoStep.selectBusinessType'),
                        searchTitle: translate('businessInfoStep.findBusinessType'),
                    }),
                ],
            }),

            {kind: 'confirmation', id: BUSINESS_INFO.CONFIRMATION, isComplete: true, title: translate('businessInfoStep.letsDoubleCheck')},
        ],

        request: getGlobalCompanyRequest(bankAccount, answers),
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
            ownerDraft: GLOBAL_OWNER_DRAFT,
            canAddMoreOwners: canAddMoreGlobalOwners,
            userOwnerID: CURRENT_USER_KEY,

            detailsPages: [
                {
                    id: OWNERS.NAME,
                    title: translate(isUserEnteringOwnData ? 'ownershipInfoStep.whatsYourName' : 'ownershipInfoStep.whatsTheOwnersName'),
                    description: translate(isUserEnteringOwnData ? 'personalInfoStep.legalNameSubtitle' : 'beneficialOwnerInfoStep.legalNameSubtitle'),
                    fields: [createLegalNameField(INPUT_IDS.OWNER_FIRST_NAME, INPUT_IDS.OWNER_LAST_NAME)],
                },
                {
                    id: OWNERS.OWNERSHIP_PERCENTAGE,
                    title: translate('ownershipInfoStep.whatPercentage'),

                    fields: [
                        createTextField(INPUT_IDS.OWNER_OWNERSHIP_PERCENTAGE, {
                            label: translate('ownershipInfoStep.ownership'),
                            inputMode: CONST.INPUT_MODE.NUMERIC,
                            summaryLabel: translate('ownershipInfoStep.ownershipPercentage'),
                            formatSummaryValue: (value) => `${value}%`,
                            validate: (value) =>
                                isValidGlobalOwnerShare(value, answers.owners, answers.ownerBeingModifiedID) ? undefined : translate('bankAccount.error.ownershipPercentage'),
                        }),
                    ],
                },
            ],

            confirmationTitle: translate('ownershipInfoStep.letsDoubleCheck'),
            listRows: ownersToSend.map((owner) => ({id: owner.id, title: getOwnerFullName(owner), description: `${owner.ownershipPercentage}%`})),
            copy: {
                isUserOwnerTitle: translate('ownershipInfoStep.doYouOwn', answers.companyName),
                isAnyoneElseOwnerTitle: translate('ownershipInfoStep.doesAnyoneOwn', answers.companyName),
                areThereMoreOwnersTitle: translate('ownershipInfoStep.areThereOther', answers.companyName),
                description: translate('ownershipInfoStep.regulationsRequire'),
            },
            // An owner user enters their own details next, the user who is no owner leaves the list
            onUserOwnerAnswer: (values) =>
                values.ownsMoreThan25Percent
                    ? {
                          draftUpdate: {...values, ...GLOBAL_OWNER_DRAFT.getBuffer(findOwner(answers.owners, CURRENT_USER_KEY)), ownerBeingModifiedID: CURRENT_USER_KEY},
                          nextPageID: OWNERS.NAME,
                      }
                    : {draftUpdate: {...values, globalOwners: removeOwner(answers.owners, CURRENT_USER_KEY), ownerBeingModifiedID: null}},
            translate,
        }),

        request: getGlobalOwnersRequest(bankAccount, {ownsMoreThan25Percent: isUserOwner, owners: ownersToSend}),
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

        signerPages.push(
            ...getSignerDetailsPages({
                pageIDs: {name: SIGNER.NAME, jobTitle: SIGNER.JOB_TITLE, confirmation: SIGNER.CONFIRMATION},
                answers,
                shouldAskForName: !userOwnerName,
                isConfirmationComplete: !!corpay?.signerFullName,
                request: getDirectorInfoRequest(bankAccount, {signerFullName: userOwnerName ?? answers.signerFullName, signerJobTitle: answers.signerJobTitle}),
                translate,
            }),
        );
    }

    if (shouldInviteSigners) {
        // An AUD account needs two directors besides a user who is none, so that user gives two emails. A director of an
        // AUD account gives the second one only, any other user the one of the director.
        const shouldGatherBothEmails = isAUD && !answers.isUserDirector;
        const shouldGatherOnlySecondEmail = isAUD && !!answers.isUserDirector;
        const emailLabel = translate('common.email');
        const signerEmailFields = [
            ...(shouldGatherOnlySecondEmail ? [] : [createEmailField(INPUT_IDS.SIGNER_EMAIL, {label: shouldGatherBothEmails ? `${emailLabel} 1` : emailLabel}, translate)]),
            ...(isAUD
                ? [
                      createEmailField(
                          INPUT_IDS.SECOND_SIGNER_EMAIL,
                          {label: shouldGatherBothEmails ? `${emailLabel} 2` : emailLabel, mustDifferFrom: shouldGatherBothEmails ? INPUT_IDS.SIGNER_EMAIL : undefined},
                          translate,
                      ),
                  ]
                : []),
        ];

        // The first email is only checked when the page asks for it, and the second one only for AUD
        const areSignerEmailsSaved = (shouldGatherOnlySecondEmail || !!corpay?.signerEmail) && (!isAUD || !!corpay?.secondSignerEmail);

        signerPages.push(
            buildFormPage({
                id: SIGNER.ENTER_EMAIL,
                isComplete: areSignerEmailsSaved && areFieldsComplete(signerEmailFields, answers, translate),
                title: translate(shouldGatherBothEmails ? 'signerInfoStep.enterTwoEmails' : 'signerInfoStep.enterOneEmail', answers.companyName),
                description: shouldGatherBothEmails ? undefined : translate('signerInfoStep.regulationRequiresOneMoreDirector'),
                fields: signerEmailFields,

                request: getSignerInvitationRequest(
                    bankAccount,
                    shouldGatherOnlySecondEmail
                        ? {secondSignerEmail: answers.secondSignerEmail}
                        : {signerEmail: answers.signerEmail, secondSignerEmail: isAUD ? answers.secondSignerEmail : undefined},
                ),
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
    const agreementFields = [
        createCheckboxField(INPUT_IDS.AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT, {
            label: translate('agreementsStep.iAmAuthorized'),
            requiredErrorText: translate('agreementsStep.error.authorized'),
        }),
        createCheckboxField(INPUT_IDS.AGREE_TO_TERMS_AND_CONDITIONS, {
            label: translate('agreementsStep.iAcceptTheTermsAndConditionsAccessibility'),
            requiredErrorText: translate('common.error.acceptTerms'),
        }),
        createCheckboxField(INPUT_IDS.CONSENT_TO_PRIVACY_NOTICE, {
            label: translate('agreementsStep.iConsentToThePrivacyNoticeAccessibility'),
            requiredErrorText: translate('agreementsStep.error.consent'),
        }),
        ...(isAUD
            ? [
                  createFileField(INPUT_IDS.BANK_STATEMENT, {
                      label: translate('agreementsStep.bankStatement'),
                      description: translate('agreementsStep.bankStatementDescription'),
                  }),
              ]
            : []),
    ];
    const areAgreementsComplete = isSent || (isAUD && areFieldsComplete(agreementFields, answers, translate));

    steps.push({
        id: PAGE_NAMES.AGREEMENTS,
        title: translate('agreementsStep.agreements'),
        counterIndex: STEP_INDEX.AGREEMENTS,
        isComplete: areAgreementsComplete,

        pages: [
            buildFormPage({
                id: SBO_CONST.NON_USD.AGREEMENTS_SUB_PAGES.CONFIRM_AGREEMENTS,
                isComplete: areAgreementsComplete,
                title: translate('agreementsStep.pleaseConfirm'),
                submitLabel: translate(isAUD ? 'common.confirm' : 'agreementsStep.accept'),
                fields: agreementFields,
            }),
        ],

        request: isAUD ? undefined : getFinishOnboardingRequest(bankAccount, answers),
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
                buildFormPage({
                    id: SBO_CONST.NON_USD.DOCUSIGN_SUB_PAGES.UPLOAD,
                    isComplete: isSent,
                    title: translate('docusignStep.pleaseCompleteTheBusinessAccount'),
                    description: translate('docusignStep.pleaseUploadTheDirect'),
                    submitLabel: translate('common.submit'),
                    fields: [createFileField(INPUT_IDS.ACH_AUTHORIZATION_FORM, {label: translate('docusignStep.subheader')})],
                }),
            ],

            request: getFinishOnboardingRequest(bankAccount, {
                ...answers,
                bankStatementName: answers.bankStatement.at(0)?.name,
                achAuthorizationFormName: answers.achAuthorizationForm.at(0)?.name,
            }),
        });
    }

    // The last page shows the state of the review. It never counts as complete, so the flow resumes there once all is sent.
    steps.push({
        id: PAGE_NAMES.FINISH,
        title: translate('bankAccount.addBankAccount'),
        isComplete: false,

        pages: [{kind: 'custom', id: SBO_CONST.NON_USD.FINISH_SUB_PAGES.DONE, component: 'finish', isComplete: false, shouldExitOnBack: true}],
    });

    return {steps, answers};
}

export default buildNonUSDPlan;
