import Log from '@libs/Log';
import openWiseKYCReviewForm from '@libs/openWiseKYCReviewForm';

import {openBrowserAsync} from 'expo-web-browser';

import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

const KYC_REVIEW_URL = 'https://sandbox.transferwise.tech/embedded-flows/kyc-review?token=abc';

jest.mock('expo-web-browser', () => ({openBrowserAsync: jest.fn()}));

describe('openWiseKYCReviewForm on mobile', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('opens the form in an in-app browser over the app', async () => {
        // Given the browser stays open while the user fills the form
        jest.mocked(openBrowserAsync).mockReturnValue(new Promise(() => {}));

        // When the form opens
        openWiseKYCReviewForm(KYC_REVIEW_URL);
        await waitForBatchedUpdates();

        // Then the browser shows the link, so closing it leaves the user on the page that opened it
        expect(openBrowserAsync).toHaveBeenCalledWith(KYC_REVIEW_URL);
    });

    it('logs a browser that fails to open without the link', async () => {
        // Given the browser cannot open
        jest.mocked(openBrowserAsync).mockRejectedValue(new Error('Another WebBrowser is already being presented.'));
        const hmmmSpy = jest.spyOn(Log, 'hmmm').mockImplementation(() => {});

        // When the form opens
        openWiseKYCReviewForm(KYC_REVIEW_URL);
        await waitForBatchedUpdates();

        // Then the failure is logged without the link, since it carries a token
        expect(hmmmSpy).toHaveBeenCalledWith('[Wise] Could not open the KYC review form', {error: 'Another WebBrowser is already being presented.'});
        expect(JSON.stringify(hmmmSpy.mock.calls)).not.toContain(KYC_REVIEW_URL);
        hmmmSpy.mockRestore();
    });
});
