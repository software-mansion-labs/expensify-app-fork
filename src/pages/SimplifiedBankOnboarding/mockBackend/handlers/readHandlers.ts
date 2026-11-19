/**
 * Handlers of the read commands. A read never changes the bank accounts, it only describes the response.
 */
import {READ_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {ReadCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {BUSINESS_TYPES, getBankFormFields, PLAID_BANK_ACCOUNTS} from '@pages/SimplifiedBankOnboarding/mockBackend/serverCatalog';
import type {CommandHandler} from '@pages/SimplifiedBankOnboarding/mockBackend/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {ACHData, USDStep} from '@pages/SimplifiedBankOnboarding/types/onyx';

import ONYXKEYS from '@src/ONYXKEYS';

import {buildClientACHData, buildFailureResponse, buildMergeUpdate, buildSetUpdate, buildSuccessResponse, findBankAccount} from './buildResponse';

type ReadHandlers = {[TCommand in keyof ReadCommandParams]: CommandHandler<ReadCommandParams[TCommand]>};

const {STEP} = SBO_CONST.USD;
const NO_BANK_ACCOUNT_ID = 0;
const USD_STEP_ORDER: USDStep[] = [STEP.COUNTRY, STEP.BANK_ACCOUNT, STEP.REQUESTOR, STEP.COMPANY, STEP.BENEFICIAL_OWNERS, STEP.ACH_CONTRACT, STEP.KYB_DOCS, STEP.VALIDATION, STEP.ENABLE];

/** The client may ask for an earlier step than the one the server stores, never for a later one */
function getStepToReturn(serverStep: USDStep | undefined, stepToOpen: USDStep | ''): USDStep | undefined {
    if (!stepToOpen || !serverStep) {
        return serverStep;
    }
    return USD_STEP_ORDER.indexOf(stepToOpen) <= USD_STEP_ORDER.indexOf(serverStep) ? stepToOpen : serverStep;
}

const readHandlers: ReadHandlers = {
    [READ_COMMANDS.OPEN_LANDING_PAGE]: (params, database) =>
        buildSuccessResponse([
            buildSetUpdate(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, database.workspaces),
            buildMergeUpdate(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER, {validated: database.user.validated}),
        ]),

    [READ_COMMANDS.OPEN_ONBOARDING_PAGE]: ({policyID, bankAccountID = NO_BANK_ACCOUNT_ID, stepToOpen, subStep}, database) => {
        // A page that was opened by the bank account ID learns its workspace from the row of that account.
        const workspaceID = policyID ?? findBankAccount(database, {policyID, bankAccountID})?.policyID;
        if (!workspaceID || !database.workspaces[workspaceID]) {
            return buildFailureResponse('The workspace or the bank account does not exist', SBO_CONST.MOCK.JSON_CODE.NOT_FOUND);
        }
        const account = database.bankAccounts[workspaceID];
        const achData: ACHData = account
            ? {...buildClientACHData(account), currentStep: getStepToReturn(account.currentStep, stepToOpen)}
            : {policyID: workspaceID, currentStep: stepToOpen || STEP.BANK_ACCOUNT, subStep};

        // The whole object is replaced, so the data of the workspace that was open before does not leak into this one.
        return buildSuccessResponse([
            buildSetUpdate(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {
                achData,
                isLoading: false,
                throttledDate: database.settings.isThrottled ? new Date().toISOString() : undefined,
            }),
            buildMergeUpdate(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER, {validated: database.user.validated}),
        ]);
    },

    [READ_COMMANDS.OPEN_PLAID_BANK_LOGIN]: () => buildSuccessResponse([buildSetUpdate(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN, 'mock-plaid-link-token')]),

    [READ_COMMANDS.OPEN_PLAID_BANK_ACCOUNT_SELECTOR]: ({publicToken}) => {
        if (!publicToken) {
            return buildFailureResponse('The Plaid token is missing');
        }
        return buildSuccessResponse([buildMergeUpdate(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA, {bankAccounts: PLAID_BANK_ACCOUNTS})]);
    },

    [READ_COMMANDS.OPEN_IDENTITY_CHECK_FLOW]: ({policyID}, database) => {
        if (!database.bankAccounts[policyID]) {
            return buildFailureResponse('The bank account does not exist', SBO_CONST.MOCK.JSON_CODE.NOT_FOUND);
        }
        return buildSuccessResponse([buildSetUpdate(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN, 'mock-onfido-token')]);
    },

    [READ_COMMANDS.GET_BANK_ACCOUNT_FIELDS]: ({countryISO, currency}) => {
        const formFields = getBankFormFields(countryISO);
        if (!formFields) {
            return buildFailureResponse(`No bank fields for ${countryISO}`);
        }
        return buildSuccessResponse([buildSetUpdate(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS, {bankCountry: countryISO, bankCurrency: currency, formFields})]);
    },

    [READ_COMMANDS.GET_ONBOARDING_FIELDS]: () => buildSuccessResponse([buildMergeUpdate(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS, {picklists: {businessType: BUSINESS_TYPES}})]),
};

export default readHandlers;
export type {ReadHandlers};
