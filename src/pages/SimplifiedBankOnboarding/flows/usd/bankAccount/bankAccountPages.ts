import type {ValueOf} from 'type-fest';

/** The pages of the USD bank account step, one for each way to connect the account. The values are the `subPage` param of the URL. */
const BANK_ACCOUNT_PAGES = {
    MANUAL: 'manual',
    PLAID: 'plaid',
} as const;

type BankAccountPageName = ValueOf<typeof BANK_ACCOUNT_PAGES>;

export default BANK_ACCOUNT_PAGES;
export type {BankAccountPageName};
