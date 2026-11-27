/**
 * The whole USD flow as a plan, built from the draft and the server data. It is the one place that decides which steps
 * and pages the USD flow has, so the controller never skips a step on its own. A form page only lists its fields from
 * `core/form/fields`, a step names the request that saves it, a widget page names the read of its token, and a custom
 * page names the request that it sends itself.
 */
import {isValidCompanyName, isValidSSNLastFour, isValidTaxID} from '@libs/ValidationUtils';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {ACHData, USDStep} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import {getOwnerFullName} from '@pages/SimplifiedBankOnboarding/contract/ownerNames';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {areCompanyDetailsLocked, isPendingValidation} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';
import type {PlanContext} from '@pages/SimplifiedBankOnboarding/core';
import {createCheckboxField, createDateOfBirthField, createFileField, createLegalNameField, createPicklistField, createTextField, getFormPage} from '@pages/SimplifiedBankOnboarding/core';
import type FlowData from '@pages/SimplifiedBankOnboarding/flows/shared/flowData/types';
import getBaseStepInput from '@pages/SimplifiedBankOnboarding/flows/shared/getBaseStepInput';
import {canAddMoreUSDOwners} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/canAddMoreOwners';
import getOwnerPages from '@pages/SimplifiedBankOnboarding/flows/shared/owners/getOwnerPages';
import {USD_OWNER_DRAFT} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerBuffer';
import type {FlowPlan, FormPageDefinition, StepConfig} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';

import CONST from '@src/CONST';

import getUSDAnswers from './answers/getUSDAnswers';
import {getManualBankAccountRequest, getPlaidBankAccountRequest} from './requests/connectBankAccount';
import getACHContractRequest from './requests/getACHContractRequest';
import getCompanyRequest from './requests/getCompanyRequest';
import getKYBDocumentsRequest from './requests/getKYBDocumentsRequest';
import getOwnersRequest from './requests/getOwnersRequest';
import getPersonalInfoRequest from './requests/getPersonalInfoRequest';
import getValidateBankAccountRequest from './requests/getValidateBankAccountRequest';
import {getIdentityCheckRead, getVerifyIdentityRequest} from './requests/identityCheck';
import {getPlaidBankAccountsRequest, getPlaidLinkTokenRead} from './requests/plaid';

const {PAGE_NAMES, STEP} = SBO_CONST.USD;
const SERVER_STEP_ORDER: USDStep[] = [STEP.COUNTRY, STEP.BANK_ACCOUNT, STEP.REQUESTOR, STEP.COMPANY, STEP.BENEFICIAL_OWNERS, STEP.ACH_CONTRACT, STEP.KYB_DOCS, STEP.VALIDATION, STEP.ENABLE];
const ROUTING_NUMBER_PATTERN = /^\d{9}$/;

/** The mock stands in for the result that the Onfido widget returns */
const MOCK_ONFIDO_DATA = 'mock-onfido-data';

/** The row of the user in the owner list. The user's details belong to the personal info step, so the row cannot be opened. */
const REQUESTOR_ROW_ID = 'requestor';

/** The server moves `currentStep` forward after each saved step, so a later current step means the step was saved */
function hasPassedServerStep(achData: ACHData | undefined, step: USDStep): boolean {
    const currentStepIndex = SERVER_STEP_ORDER.indexOf(achData?.currentStep ?? STEP.COUNTRY);
    return currentStepIndex > SERVER_STEP_ORDER.indexOf(step);
}

function isValidAccountNumber(value: string): boolean {
    const accountNumber = value.trim();
    return CONST.BANK_ACCOUNT.REGEX.US_ACCOUNT_NUMBER.test(accountNumber) || CONST.BANK_ACCOUNT.REGEX.MASKED_US_ACCOUNT_NUMBER.test(accountNumber);
}

/**
 * The identity check and the documents step are only in the plan while the server asks for them, so no transition has
 * to skip them.
 */
function buildUSDPlan({draft, account, plaidLinkToken, onfidoToken}: FlowData, {translate, policyID: urlPolicyID}: PlanContext): FlowPlan {
    const {achData, bankAccount} = getBaseStepInput(account, urlPolicyID, translate);
    const answers = getUSDAnswers(draft, account);
    const buildFormPage = (definition: FormPageDefinition) => getFormPage(definition, answers, translate);

    const steps: StepConfig[] = [];

    // The USD flow only supports the United States, so the step only confirms the country. Nothing is sent to the server.
    // The country that the row shows before the user confirmed it does not count as an answer.
    const isCountryConfirmed = !!answers.country || !!achData?.accountNumber;

    steps.push({
        id: PAGE_NAMES.COUNTRY,
        title: translate('countryStep.confirmCurrency'),
        isComplete: isCountryConfirmed,

        pages: [
            buildFormPage({
                id: SBO_CONST.USD.COUNTRY_SUB_PAGES.CONFIRM_CURRENCY,
                isComplete: isCountryConfirmed,
                title: translate('countryStep.confirmCurrency'),
                description: translate('countryStep.confirmBusinessBank'),
                submitLabel: translate('common.confirm'),

                fields: [
                    createPicklistField(INPUT_IDS.COUNTRY, {
                        label: translate('common.country'),
                        options: [{value: SBO_CONST.COUNTRY.US, label: translate('allCountries.US')}],
                        defaultValue: SBO_CONST.COUNTRY.US,
                        isLocked: true,
                    }),
                ],
            }),
        ],
    });

    // The setup type that the entry page saved decides between the Plaid page and the manual form
    const isPlaidSetup = answers.setupType === SBO_CONST.SETUP_TYPE.PLAID;
    const hasServerBankAccount = !!achData?.bankAccountID;
    const connectBankAccountRequest = isPlaidSetup ? getPlaidBankAccountRequest(bankAccount, answers.plaidAccountID) : getManualBankAccountRequest(bankAccount, answers);

    steps.push({
        id: PAGE_NAMES.BANK_ACCOUNT,
        title: translate('bankAccount.bankInfo'),
        isComplete: hasPassedServerStep(achData, STEP.BANK_ACCOUNT),

        pages: [
            // The bank step sends the picked account, so the Plaid page cannot be completed before the user picks one
            isPlaidSetup
                ? {
                      kind: 'custom',
                      id: SBO_CONST.USD.BANK_INFO_SUB_PAGES.PLAID,
                      component: 'plaid',
                      isComplete: hasServerBankAccount,
                      canComplete: !!answers.plaidAccountID,
                      read: getPlaidLinkTokenRead(!!plaidLinkToken),
                      request: getPlaidBankAccountsRequest(),
                  }
                : buildFormPage({
                      id: SBO_CONST.USD.BANK_INFO_SUB_PAGES.MANUAL,
                      title: translate('bankAccount.manuallyAdd'),
                      description: translate('bankAccount.checkHelpLine'),

                      fields: [
                          createTextField(INPUT_IDS.ROUTING_NUMBER, {
                              label: translate('bankAccount.routingNumber'),
                              inputMode: CONST.INPUT_MODE.NUMERIC,
                              isLocked: hasServerBankAccount,
                              isSensitive: true,
                              validate: (value) => (ROUTING_NUMBER_PATTERN.test(value.trim()) ? undefined : translate('bankAccount.error.routingNumber')),
                          }),
                          createTextField(INPUT_IDS.ACCOUNT_NUMBER, {
                              label: translate('bankAccount.accountNumber'),
                              inputMode: CONST.INPUT_MODE.NUMERIC,
                              isLocked: hasServerBankAccount,
                              isSensitive: true,
                              validate: (value) => (isValidAccountNumber(value) ? undefined : translate('bankAccount.error.accountNumber')),
                          }),
                      ],
                  }),
        ],

        // Once the server created the account, Next only moves on. A second send would move the server back to the personal
        // info step, and the manual one would also store the masked number from the locked fields as the real number.
        request: hasServerBankAccount ? undefined : connectBankAccountRequest,
    });

    // The user's legal name, date of birth and the last four digits of the SSN, sent together after the confirmation
    const PERSONAL_INFO = SBO_CONST.USD.PERSONAL_INFO_SUB_PAGES;
    const hasServerPersonalInfo = !!achData?.firstName && !!achData.lastName && !!achData.dob && !!achData.ssnLast4;

    steps.push({
        id: PAGE_NAMES.REQUESTOR,
        title: translate('personalInfoStep.personalInfo'),
        isComplete: hasPassedServerStep(achData, STEP.REQUESTOR) || hasServerPersonalInfo,

        pages: [
            buildFormPage({
                id: PERSONAL_INFO.FULL_NAME,
                title: translate('personalInfoStep.enterYourLegalFirstAndLast'),
                fields: [createLegalNameField(INPUT_IDS.FIRST_NAME, INPUT_IDS.LAST_NAME)],
            }),

            buildFormPage({
                id: PERSONAL_INFO.DATE_OF_BIRTH,
                title: translate('personalInfoStep.enterYourDateOfBirth'),
                fields: [createDateOfBirthField(INPUT_IDS.DOB)],
            }),

            buildFormPage({
                id: PERSONAL_INFO.SSN,
                title: translate('personalInfoStep.enterTheLast4'),

                fields: [
                    createTextField(INPUT_IDS.SSN_LAST_4, {
                        label: translate('personalInfoStep.last4SSN'),
                        inputMode: CONST.INPUT_MODE.NUMERIC,
                        maxLength: SBO_CONST.SSN_LAST_4_LENGTH,
                        hint: `The mock server rejects ${SBO_CONST.MOCK.REJECTED_SSN_LAST_4}.`,
                        isSensitive: true,
                        validate: (value) => (isValidSSNLastFour(value) ? undefined : translate('bankAccount.error.ssnLast4')),
                    }),
                ],
            }),

            {kind: 'confirmation', id: PERSONAL_INFO.CONFIRMATION, isComplete: true, title: translate('personalInfoStep.letsDoubleCheck')},
        ],

        request: getPersonalInfoRequest(bankAccount, answers),
    });

    // The identity check stays in the plan only while the server has not finished it. The counter shows it as part of the
    // personal info step.
    if (!achData?.isOnfidoSetupComplete) {
        steps.push({
            id: PAGE_NAMES.VERIFY_IDENTITY,
            title: translate('onfidoStep.verifyIdentity'),
            counter: 'shared',
            isComplete: false,

            pages: [
                {kind: 'custom', id: SBO_CONST.USD.VERIFY_IDENTITY_SUB_PAGES.IDENTITY_CHECK, component: 'onfido', isComplete: false, read: getIdentityCheckRead(bankAccount, !!onfidoToken)},
            ],
            request: getVerifyIdentityRequest(bankAccount, MOCK_ONFIDO_DATA),
        });
    }

    // Once the server checked the company, the name and the tax ID are locked
    const BUSINESS_INFO = SBO_CONST.USD.BUSINESS_INFO_SUB_PAGES;
    const areCompanyNumbersLocked = areCompanyDetailsLocked(achData);

    steps.push({
        id: PAGE_NAMES.COMPANY,
        title: translate('businessInfoStep.businessInfo'),
        isComplete: hasPassedServerStep(achData, STEP.COMPANY),

        pages: [
            buildFormPage({
                id: BUSINESS_INFO.NAME,
                title: translate('businessInfoStep.enterTheNameOfYourBusiness'),

                fields: [
                    createTextField(INPUT_IDS.COMPANY_NAME, {
                        label: translate('businessInfoStep.businessName'),
                        isLocked: areCompanyNumbersLocked,
                        validate: (value) => (isValidCompanyName(value) ? undefined : translate('bankAccount.error.companyName')),
                    }),
                ],
            }),

            buildFormPage({
                id: BUSINESS_INFO.TAX_ID,
                title: translate('businessInfoStep.enterYourCompanyTaxIdNumber'),

                fields: [
                    createTextField(INPUT_IDS.COMPANY_TAX_ID, {
                        label: translate('businessInfoStep.taxIDNumber'),
                        placeholder: translate('businessInfoStep.taxIDNumberPlaceholder'),
                        inputMode: CONST.INPUT_MODE.NUMERIC,
                        hint: `The mock server rejects ${SBO_CONST.MOCK.REJECTED_TAX_ID}.`,
                        isLocked: areCompanyNumbersLocked,
                        isSensitive: true,
                        validate: (value) => (isValidTaxID(value) ? undefined : translate('bankAccount.error.taxID')),
                    }),
                ],
            }),

            buildFormPage({
                id: BUSINESS_INFO.INCORPORATION_TYPE,
                title: translate('businessInfoStep.selectYourCompanyType'),

                fields: [
                    createPicklistField(INPUT_IDS.INCORPORATION_TYPE, {
                        label: translate('businessInfoStep.companyType'),
                        options: Object.values(SBO_CONST.USD.INCORPORATION_TYPES).map((incorporationType) => ({value: incorporationType, label: incorporationType})),
                    }),
                ],
            }),

            {kind: 'confirmation', id: BUSINESS_INFO.CONFIRMATION, isComplete: true, title: translate('businessInfoStep.letsDoubleCheck')},
        ],

        request: getCompanyRequest(bankAccount, answers),
    });

    // The user is the requestor and stays out of the list, so the owner pages exist only once someone else owns 25% or more
    const OWNERS = SBO_CONST.USD.BENEFICIAL_OWNERS_SUB_PAGES;
    const isUserOwner = answers.ownsMoreThan25Percent ?? false;
    const hasOtherOwners = answers.hasOtherBeneficialOwners;

    steps.push({
        id: PAGE_NAMES.BENEFICIAL_OWNERS,
        title: translate('beneficialOwnerInfoStep.companyOwner'),
        isComplete: hasPassedServerStep(achData, STEP.BENEFICIAL_OWNERS),

        pages: getOwnerPages({
            subPages: {
                isUserOwner: OWNERS.IS_USER_UBO,
                isAnyoneElseOwner: OWNERS.IS_ANYONE_ELSE_UBO,
                confirmation: OWNERS.CONFIRMATION,
                areThereMoreOwners: OWNERS.ARE_THERE_MORE_UBOS,
                ownersList: OWNERS.UBOS_LIST,
            },
            answers,
            ownerDraft: USD_OWNER_DRAFT,
            canAddMoreOwners: (owners) => canAddMoreUSDOwners(owners, isUserOwner),

            detailsPages: [
                {
                    id: OWNERS.LEGAL_NAME,
                    title: translate('beneficialOwnerInfoStep.enterLegalFirstAndLastName'),
                    description: translate('beneficialOwnerInfoStep.legalNameSubtitle'),
                    fields: [createLegalNameField(INPUT_IDS.OWNER_FIRST_NAME, INPUT_IDS.OWNER_LAST_NAME)],
                },
                {
                    id: OWNERS.DATE_OF_BIRTH,
                    title: translate('beneficialOwnerInfoStep.enterTheDateOfBirthOfTheOwner'),
                    fields: [createDateOfBirthField(INPUT_IDS.OWNER_DOB)],
                },
            ],

            confirmationTitle: translate('beneficialOwnerInfoStep.letsDoubleCheck'),
            listRows: [
                ...(isUserOwner ? [{id: REQUESTOR_ROW_ID, title: getOwnerFullName(answers), description: answers.dob, isReadOnly: true}] : []),
                ...(hasOtherOwners ? answers.owners.map((owner) => ({id: owner.id, title: getOwnerFullName(owner), description: owner.dob})) : []),
            ],
            copy: {
                isUserOwnerTitle: translate('beneficialOwnerInfoStep.doYouOwn25percent', answers.companyName),
                isAnyoneElseOwnerTitle: translate('beneficialOwnerInfoStep.doAnyIndividualOwn25percent', answers.companyName),
                areThereMoreOwnersTitle: translate('beneficialOwnerInfoStep.areThereMoreIndividualsWhoOwn25percent', answers.companyName),
                description: translate('beneficialOwnerInfoStep.regulationRequiresUsToVerifyTheIdentity'),
            },
            // The user takes one of the places, so the last owner who no longer fits is dropped
            onUserOwnerAnswer: (values) =>
                values.ownsMoreThan25Percent && answers.owners.length >= SBO_CONST.USD.MAX_NUMBER_OF_UBOS
                    ? {draftUpdate: {...values, usdOwners: answers.owners.slice(0, SBO_CONST.USD.MAX_NUMBER_OF_UBOS - 1)}}
                    : {},
            translate,
        }),

        request: getOwnersRequest(bankAccount, {ownsMoreThan25Percent: isUserOwner, owners: hasOtherOwners ? answers.owners : []}),
    });

    // The three agreements that the user must accept before the server reviews the setup
    steps.push({
        id: PAGE_NAMES.ACH_CONTRACT,
        title: translate('completeVerificationStep.completeVerification'),
        isComplete: hasPassedServerStep(achData, STEP.ACH_CONTRACT),

        pages: [
            buildFormPage({
                id: SBO_CONST.USD.COMPLETE_VERIFICATION_SUB_PAGES.CONFIRM_AGREEMENTS,
                title: translate('completeVerificationStep.confirmAgreements'),
                submitLabel: translate('common.saveAndContinue'),

                fields: [
                    createCheckboxField(INPUT_IDS.IS_AUTHORIZED_TO_USE_BANK_ACCOUNT, {
                        label: translate('completeVerificationStep.isAuthorizedToUseBankAccount'),
                        requiredErrorText: translate('completeVerificationStep.isAuthorizedToUseBankAccountError'),
                    }),
                    createCheckboxField(INPUT_IDS.CERTIFY_TRUE_INFORMATION, {
                        label: translate('completeVerificationStep.certifyTrueAndAccurate'),
                        requiredErrorText: translate('completeVerificationStep.certifyTrueAndAccurateError'),
                    }),
                    createCheckboxField(INPUT_IDS.ACCEPT_TERMS_AND_CONDITIONS, {
                        label: `${translate('common.iAcceptThe')} ${translate('completeVerificationStep.termsAndConditions')}`,
                        requiredErrorText: translate('common.error.acceptTerms'),
                    }),
                ],
            }),
        ],

        request: getACHContractRequest(bankAccount, answers),
    });

    // The server asks for documents only when its automatic checks fail, so the step exists only while it lists some.
    // Like in the real flow, it shows no counter.
    const requiredDocuments = achData?.requiredKYBDocuments ?? [];
    const needsTaxIDDocument = requiredDocuments.includes(SBO_CONST.USD.KYB_DOCUMENT_TYPES.COMPANY_TAX_ID);
    const needsAddressDocument = requiredDocuments.includes(SBO_CONST.USD.KYB_DOCUMENT_TYPES.COMPANY_ADDRESS);

    if (requiredDocuments.length > 0) {
        const documentNames = [
            needsTaxIDDocument ? answers.companyTaxIDDocument.at(0)?.name : undefined,
            needsAddressDocument ? answers.companyAddressDocument.at(0)?.name : undefined,
        ].filter((documentName): documentName is string => !!documentName);

        steps.push({
            id: PAGE_NAMES.KYB_DOCS,
            title: translate('documentsStep.subheader'),
            counter: 'none',
            isComplete: hasPassedServerStep(achData, STEP.KYB_DOCS),

            pages: [
                buildFormPage({
                    id: SBO_CONST.USD.KYB_DOCUMENTS_SUB_PAGES.UPLOAD,
                    title: translate('documentsStep.beforeYouGo'),
                    description: translate('documentsStep.verificationFailed'),
                    submitLabel: translate('common.verify'),

                    fields: [
                        ...(needsTaxIDDocument
                            ? [
                                  createFileField(INPUT_IDS.COMPANY_TAX_ID_DOCUMENT, {
                                      label: translate('documentsStep.taxIDVerification'),
                                      description: translate('documentsStep.taxIDVerificationDescription'),
                                  }),
                              ]
                            : []),
                        ...(needsAddressDocument
                            ? [
                                  createFileField(INPUT_IDS.COMPANY_ADDRESS_DOCUMENT, {
                                      label: translate('documentsStep.companyAddressVerification'),
                                      description: translate('documentsStep.companyAddressVerificationDescription'),
                                  }),
                              ]
                            : []),
                    ],
                }),
            ],

            request: getKYBDocumentsRequest(bankAccount, documentNames),
        });
    }

    // The review, the test deposits and the connected account. The custom page sends the amounts of the deposits itself,
    // so the step has no request. While the account waits for the deposits, Back leaves the flow, because the earlier
    // steps are sent.
    const isPendingDeposits = isPendingValidation(achData);

    steps.push({
        id: PAGE_NAMES.VALIDATION,
        title: isPendingDeposits ? translate('connectBankAccountStep.validateYourBankAccount') : translate('bankAccount.addBankAccount'),
        isComplete: hasPassedServerStep(achData, STEP.VALIDATION),

        pages: [
            {
                kind: 'custom',
                id: SBO_CONST.USD.VALIDATION_SUB_PAGES.VALIDATE,
                component: 'validation',
                isComplete: false,
                shouldExitOnBack: isPendingDeposits,
                request: getValidateBankAccountRequest(bankAccount),
            },
        ],
    });

    return {steps, answers};
}

export default buildUSDPlan;
