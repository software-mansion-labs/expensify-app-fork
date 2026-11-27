import type {ValueOf} from 'type-fest';

/** The pages that collect the details of a director, for the user in the NonUSD signer step and for the invited director. The values are the `subPage` param of the URL. */
const SIGNER_DETAILS_PAGES = {
    NAME: 'name',
    JOB_TITLE: 'job-title',
    CONFIRMATION: 'confirmation',
} as const;

type SignerDetailsPageName = ValueOf<typeof SIGNER_DETAILS_PAGES>;

export default SIGNER_DETAILS_PAGES;
export type {SignerDetailsPageName};
