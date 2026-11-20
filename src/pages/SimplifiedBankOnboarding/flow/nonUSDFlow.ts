/**
 * The definition of the NonUSD flow. The server keeps no step for this flow, so each step is complete when the fields that
 * its request saves are present under `achData.corpay`, and the agreements step also needs a file that only the draft holds.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import getInitialSubPageForSignerInfo from '@pages/SimplifiedBankOnboarding/utils/getInitialSubPageForSignerInfo';
import {requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';
import {resolveAgreements} from '@pages/SimplifiedBankOnboarding/values/codecs/nonUSDAgreements';

import type {ValueOf} from 'type-fest';

import type {FlowContext, FlowDefinition, FlowDirection} from './types';

import {getOrderedEntrySubPage, isCountryKnown} from './stepRules';

type NonUSDPageName = ValueOf<typeof SBO_CONST.NON_USD.PAGE_NAMES>;

const {PAGE_NAMES, BANK_INFO_SUB_PAGES, BUSINESS_INFO_SUB_PAGES, BENEFICIAL_OWNER_INFO_SUB_PAGES, SIGNER_INFO_SUB_PAGES} = SBO_CONST.NON_USD;

function isVerifying({server}: FlowContext): boolean {
    return server?.state === SBO_CONST.STATE.VERIFYING;
}

/** An AUD account needs both directors, every other currency needs one */
function areSignersKnown({server, currency}: FlowContext): boolean {
    const corpay = server?.corpay;
    if (currency === SBO_CONST.CURRENCY.AUD) {
        return !!corpay?.signerFullName && !!corpay.secondSignerFullName;
    }
    return !!corpay?.signerFullName;
}

/** The agreements are only sent by the last request, so until then the draft holds the answers */
function areAllAgreementsChecked({server, draft}: FlowContext): boolean {
    return Object.values(resolveAgreements(draft, server)).every(Boolean);
}

/** The bank statement is collected on the agreements page and only lives in the draft until the docusign page sends it */
function hasBankStatement({draft}: FlowContext): boolean {
    return !!draft?.[INPUT_IDS.BANK_STATEMENT]?.length;
}

function getSignerInfoSubPage(context: FlowContext, direction: FlowDirection): string {
    // An AUD account always ends the signer step waiting for the second director.
    if (direction === 'backward') {
        return context.currency === SBO_CONST.CURRENCY.AUD ? SIGNER_INFO_SUB_PAGES.HANG_TIGHT : SIGNER_INFO_SUB_PAGES.CONFIRMATION;
    }
    return getInitialSubPageForSignerInfo(context.server?.corpay, context.currency);
}

const NON_USD_FLOW: FlowDefinition<NonUSDPageName> = [
    {
        id: PAGE_NAMES.COUNTRY,
        headerPosition: 0,
        isComplete: isCountryKnown,
    },
    {
        id: PAGE_NAMES.BANK_INFO,
        headerPosition: 1,
        isComplete: ({server}) => !!server?.created,
        getEntrySubPage: getOrderedEntrySubPage({
            first: BANK_INFO_SUB_PAGES.BANK_ACCOUNT_DETAILS,
            last: BANK_INFO_SUB_PAGES.CONFIRMATION,
            resume: BANK_INFO_SUB_PAGES.BANK_ACCOUNT_DETAILS,
        }),
    },
    {
        id: PAGE_NAMES.BUSINESS_INFO,
        headerPosition: 2,
        isComplete: ({server}) => server?.corpay?.companyName !== undefined,
        getEntrySubPage: getOrderedEntrySubPage({first: BUSINESS_INFO_SUB_PAGES.NAME, last: BUSINESS_INFO_SUB_PAGES.CONFIRMATION, resume: BUSINESS_INFO_SUB_PAGES.NAME}),
    },
    {
        id: PAGE_NAMES.BENEFICIAL_OWNER_INFO,
        headerPosition: 3,
        isComplete: ({server}) => server?.corpay?.anyIndividualOwn25PercentOrMore !== undefined,
        getEntrySubPage: getOrderedEntrySubPage({
            first: BENEFICIAL_OWNER_INFO_SUB_PAGES.IS_USER_BENEFICIAL_OWNER,
            last: BENEFICIAL_OWNER_INFO_SUB_PAGES.BENEFICIAL_OWNERS_LIST,
            resume: BENEFICIAL_OWNER_INFO_SUB_PAGES.IS_USER_BENEFICIAL_OWNER,
        }),
    },
    {
        id: PAGE_NAMES.SIGNER_INFO,
        headerPosition: 4,
        isComplete: (context) => isVerifying(context) || areSignersKnown(context),
        getEntrySubPage: getSignerInfoSubPage,
    },
    {
        // Without the docusign step the agreements are sent from this page, so only the answer of the server completes it.
        id: PAGE_NAMES.AGREEMENTS,
        headerPosition: 5,
        isComplete: (context) => isVerifying(context) || (requiresDocusignStep(context.currency) && areAllAgreementsChecked(context) && hasBankStatement(context)),
    },
    {
        id: PAGE_NAMES.DOCUSIGN,
        headerPosition: 6,
        isApplicable: ({currency}) => requiresDocusignStep(currency),
        isComplete: isVerifying,
    },
    {
        id: PAGE_NAMES.FINISH,
        isComplete: () => false,
    },
];

export default NON_USD_FLOW;
export type {NonUSDPageName};
