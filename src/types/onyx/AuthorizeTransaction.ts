// TODO: AUTHORIZE_TRANSACTION should be reavluated/removed when we finally decide from where comes the data use in AuthorizeTransactionPage
/**
 * Minimal transaction data needed to render the MFA authorize transaction preview.
 * This is stored under the `authorizeTransaction_` Onyx collection.
 */
type AuthorizeTransaction = {
    /** Transaction amount in cents */
    amount: number;

    /** Transaction currency */
    currency: string;

    /** Merchant name */
    merchant: string;

    /** Created date (YYYY-MM-DD or full timestamp, depending on source) */
    created: string;

    /** Last 4 digits of the card PAN */
    lastFourPAN: number;

    /** Optional reportID if the backend provides it */
    reportID?: string;

    /** Optional transactionID if the backend provides it */
    transactionID?: string;
};

export default AuthorizeTransaction;
