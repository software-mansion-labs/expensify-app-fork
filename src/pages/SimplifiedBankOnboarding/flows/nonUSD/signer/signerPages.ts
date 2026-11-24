/**
 * The pages of the NonUSD signer step: its own pages around the shared pages with the details of a director. The values
 * are the `subPage` param of the URL.
 */
import SIGNER_DETAILS_PAGES from '@pages/SimplifiedBankOnboarding/flows/shared/signerDetails/signerDetailsPages';

const SIGNER_PAGES = {
    IS_DIRECTOR: 'is-director',
    ...SIGNER_DETAILS_PAGES,
    ENTER_EMAIL: 'enter-email',
    HANG_TIGHT: 'hang-tight',
} as const;

export default SIGNER_PAGES;
