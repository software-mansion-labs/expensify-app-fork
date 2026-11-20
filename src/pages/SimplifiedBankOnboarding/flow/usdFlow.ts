/**
 * The definition of the USD flow. Each step is complete once the server step moved past it, because the server keeps
 * the progress of a USD account. Only the country step lives on the client, so it is complete once a country is known.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import type {ValueOf} from 'type-fest';

import type {FlowDefinition} from './types';

import isServerStepAfter from './isServerStepAfter';
import {getOrderedEntrySubPage, isCountryKnown} from './stepRules';

type USDPageName = ValueOf<typeof SBO_CONST.USD.PAGE_NAMES>;
type SetupType = ValueOf<typeof SBO_CONST.SETUP_TYPE>;

const {STEP, PAGE_NAMES, BANK_INFO_SUB_PAGES, PERSONAL_INFO_SUB_PAGES, BUSINESS_INFO_SUB_PAGES, BENEFICIAL_OWNERS_SUB_PAGES, COMPLETE_VERIFICATION_SUB_PAGES} = SBO_CONST.USD;

/** A setup with a bank account on the server never goes through Plaid again. It shows the manual variant with the numbers locked. */
function getBankAccountSubPage(bankAccountID: number | undefined, setupType: SetupType | undefined): string {
    if (bankAccountID) {
        return BANK_INFO_SUB_PAGES.MANUAL;
    }
    return setupType ?? BANK_INFO_SUB_PAGES.PLAID;
}

const USD_FLOW: FlowDefinition<USDPageName> = [
    {
        id: PAGE_NAMES.COUNTRY,
        headerPosition: 0,
        isComplete: isCountryKnown,
    },
    {
        id: PAGE_NAMES.BANK_ACCOUNT,
        headerPosition: 1,
        isComplete: ({server}) => isServerStepAfter(server, STEP.BANK_ACCOUNT),
        getEntrySubPage: ({server, draft}) => getBankAccountSubPage(server?.bankAccountID, draft?.setupType),
    },
    {
        id: PAGE_NAMES.REQUESTOR,
        headerPosition: 2,
        isComplete: ({server}) => isServerStepAfter(server, STEP.REQUESTOR),

        getEntrySubPage: getOrderedEntrySubPage({first: PERSONAL_INFO_SUB_PAGES.FULL_NAME, last: PERSONAL_INFO_SUB_PAGES.CONFIRMATION}),
    },
    {
        // The server keeps the step at the requestor until the identity check passes, so this page shares its step.
        id: PAGE_NAMES.VERIFY_IDENTITY,
        headerPosition: 2,
        isApplicable: ({server}) => !server?.isOnfidoSetupComplete,
        isComplete: ({server}) => isServerStepAfter(server, STEP.REQUESTOR),
    },
    {
        id: PAGE_NAMES.COMPANY,
        headerPosition: 3,
        isComplete: ({server}) => isServerStepAfter(server, STEP.COMPANY),
        getEntrySubPage: getOrderedEntrySubPage({first: BUSINESS_INFO_SUB_PAGES.NAME, last: BUSINESS_INFO_SUB_PAGES.CONFIRMATION}),
    },
    {
        // The step picks its question from the saved answers when it opens without a sub page.
        id: PAGE_NAMES.BENEFICIAL_OWNERS,
        headerPosition: 4,
        isComplete: ({server}) => isServerStepAfter(server, STEP.BENEFICIAL_OWNERS),
        getEntrySubPage: (context, direction) => (direction === 'forward' ? BENEFICIAL_OWNERS_SUB_PAGES.IS_USER_UBO : undefined),
    },
    {
        id: PAGE_NAMES.ACH_CONTRACT,
        headerPosition: 5,
        isComplete: ({server}) => isServerStepAfter(server, STEP.ACH_CONTRACT),
        getEntrySubPage: () => COMPLETE_VERIFICATION_SUB_PAGES.CONFIRM_AGREEMENTS,
    },
    {
        // The documents page only exists when the checks of the server asked for documents, and it has no step counter.
        id: PAGE_NAMES.KYB_DOCS,
        isApplicable: ({server}) => (server?.requiredKYBDocuments?.length ?? 0) > 0,
        isComplete: ({server}) => isServerStepAfter(server, STEP.KYB_DOCS),
    },
    {
        // A connected account is a status of the entry page, so the last step is never complete inside the flow.
        id: PAGE_NAMES.VALIDATION,
        headerPosition: 6,
        isComplete: () => false,

        // A pending account was already submitted, and the entry page sends it straight back here, so the only way out is to leave.
        leavesFlowOnBack: ({server}) => server?.state === SBO_CONST.STATE.PENDING,
    },
];

export default USD_FLOW;
export {getBankAccountSubPage};
export type {USDPageName};
