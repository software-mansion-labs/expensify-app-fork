/**
 * The answers of the USD bank account step. Like every answer of the flows, each one is the draft value, then the value
 * that the server saved, then an empty default, so an answer that the user changed wins over the saved one and a saved
 * answer is shown after the user comes back (BC-08).
 */
import type {SetupType} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';

type BankAccountAnswers = {
    /** Plaid or manual. The draft holds the option that the user picked on the entry page. */
    setupType: SetupType | undefined;
    routingNumber: string;
    accountNumber: string;

    /** Undefined until the user picked an account of the Plaid list */
    plaidAccountID: string | undefined;
};

function getBankAccountAnswers({draft, account}: FlowData): BankAccountAnswers {
    const achData = account?.achData;

    return {
        setupType: draft.setupType ?? (achData?.subStep || undefined),
        routingNumber: draft.routingNumber ?? achData?.routingNumber ?? '',
        accountNumber: draft.accountNumber ?? achData?.accountNumber ?? '',
        plaidAccountID: draft.plaidAccountID ?? achData?.plaidAccountID,
    };
}

export default getBankAccountAnswers;
