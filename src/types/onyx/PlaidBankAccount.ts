/** Model of plaid bank account data */
type PlaidBankAccount = {
    /** Masked account number */
    accountNumber: string;

    addressName?: string;

    isSavings?: boolean;

    /** Unique identifier for this account in Plaid */
    plaidAccountID: string;

    routingNumber: string;

    /** Last 4 digits of the account number */
    mask: string;

    /** Plaid access token, used to then retrieve Assets and Balances */
    plaidAccessToken: string;

    bankName?: string;
};

export default PlaidBankAccount;
