import Navigation from '@libs/Navigation/Navigation';
import openWiseKYCReviewForm from '@libs/openWiseKYCReviewForm';

import ROUTES from '@src/ROUTES';

const KYC_REVIEW_URL = 'https://sandbox.transferwise.tech/embedded-flows/kyc-review?token=abc';

jest.mock('@libs/Navigation/Navigation', () => ({navigate: jest.fn()}));

describe('openWiseKYCReviewForm on mobile', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('opens the WebView screen without putting the link in the route', () => {
        // Given a link that carries Wise's token

        // When the form opens
        openWiseKYCReviewForm(KYC_REVIEW_URL);

        // Then the screen opens on its plain route, so the token stays out of the navigation state
        expect(Navigation.navigate).toHaveBeenCalledWith(ROUTES.SETTINGS_WALLET_WISE_KYC_REVIEW_FORM);
    });
});
