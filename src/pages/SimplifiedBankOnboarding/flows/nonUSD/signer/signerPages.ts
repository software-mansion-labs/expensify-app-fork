import SIGNER_DETAILS_PAGES from '@pages/SimplifiedBankOnboarding/flows/shared/signerDetails/signerDetailsPages';

/**
 * The pages of the NonUSD signer step: its own pages around the shared pages with the details of a director. The values
 * are the `subPage` param of the URL.
 */
import type {ValueOf} from 'type-fest';

const SIGNER_PAGES = {
    IS_DIRECTOR: 'is-director',
    ...SIGNER_DETAILS_PAGES,
    ENTER_EMAIL: 'enter-email',
    HANG_TIGHT: 'hang-tight',
} as const;

type SignerPageName = ValueOf<typeof SIGNER_PAGES>;

export default SIGNER_PAGES;
export type {SignerPageName};
