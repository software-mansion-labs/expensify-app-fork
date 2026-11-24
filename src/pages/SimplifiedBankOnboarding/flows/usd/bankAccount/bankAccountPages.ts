/** The pages of the USD bank account step, one for each way to connect the account. The values are the `subPage` param of the URL. */
const BANK_ACCOUNT_PAGES = {
    MANUAL: 'manual',
    PLAID: 'plaid',
} as const;

export default BANK_ACCOUNT_PAGES;
