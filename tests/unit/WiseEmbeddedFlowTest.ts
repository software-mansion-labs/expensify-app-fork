import getEmbeddedFlowOutcomeFromMessage from '@libs/WiseEmbeddedFlow/getEmbeddedFlowOutcomeFromMessage';
import getEmbeddedFlowOutcomeFromRedirect from '@libs/WiseEmbeddedFlow/getEmbeddedFlowOutcomeFromRedirect';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

describe('getEmbeddedFlowOutcomeFromMessage', () => {
    it.each([
        ['done', {type: 'done'}],
        ['cancelled', {type: 'error', code: 'cancelled'}],
        ['failed', {type: 'error', code: 'expired'}],
        ['failed', {type: 'error'}],
    ])('reads %s from %j', (outcome, message) => {
        // Given Wise's form posted a message that ends it

        // When the bridge hands the message over as JSON
        const result = getEmbeddedFlowOutcomeFromMessage(JSON.stringify(message));

        // Then the outcome tells the screen where to go next
        expect(result).toBe(outcome);
    });

    it.each([JSON.stringify({type: 'ready'}), JSON.stringify({type: 'resize', height: 640}), JSON.stringify('done'), 'null', 'not json'])('ignores %s', (data) => {
        // Given a message that does not end the form, or one that is not Wise's at all

        // When the bridge hands it over
        const result = getEmbeddedFlowOutcomeFromMessage(data);

        // Then the screen keeps showing the form
        expect(result).toBeUndefined();
    });
});

describe('getEmbeddedFlowOutcomeFromRedirect', () => {
    const redirect = `${CONST.STAGING_NEW_EXPENSIFY_URL}/${ROUTES.WISE_KYC_COMPLETE}`;

    it.each([
        ['done', `${redirect}?status=success`],
        ['cancelled', `${redirect}?status=cancelled`],
        ['failed', `${redirect}?status=error`],
        ['failed', redirect],
        ['done', `${redirect}?foo=bar&status=success#top`],
        ['done', `https://dev.new.expensify.com:8082/${ROUTES.WISE_KYC_COMPLETE}?status=success`],
        ['done', `https://new.expensify.com/${ROUTES.WISE_KYC_COMPLETE}?status=success`],
    ])('reads %s from %s', (outcome, url) => {
        // Given Wise ends the flow with an https redirect to the app's KYC complete page

        // When the WebView is about to load the redirect
        const result = getEmbeddedFlowOutcomeFromRedirect(url);

        // Then the status it carries gives the outcome
        expect(result).toBe(outcome);
    });

    it.each([
        'https://wise.com/embedded-flows/kyc-review?status=success',
        `https://wise.com/${ROUTES.WISE_KYC_COMPLETE}?status=success`,
        `http://new.expensify.com/${ROUTES.WISE_KYC_COMPLETE}?status=success`,
        `https://new.expensify.com/settings/wallet?status=success`,
        `new-expensify://${ROUTES.WISE_KYC_COMPLETE}?status=success`,
    ])('lets %s load', (url) => {
        // Given a page that is not the app's https KYC complete page, such as a step of Wise's own form

        // When the WebView is about to load it
        const result = getEmbeddedFlowOutcomeFromRedirect(url);

        // Then it is not taken for the end of the flow, so the form keeps going
        expect(result).toBeUndefined();
    });
});
