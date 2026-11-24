/** The pages of the NonUSD bank info step. The values are the `subPage` param of the URL. */
const BANK_INFO_PAGES = {
    BANK_ACCOUNT_DETAILS: 'bank-account-details',
    ACCOUNT_HOLDER_DETAILS: 'account-holder-details',
    CONFIRMATION: 'confirmation',
} as const;

export default BANK_INFO_PAGES;
