import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import getRequestKey from '@pages/SimplifiedBankOnboarding/core/requests/requestKey';

describe('getRequestKey', () => {
    it('keys a request about a bank account by its workspace', () => {
        // Given a request of a workspace that also names its bank account
        const scope = {policyID: 'eur', bankAccountID: 42};

        // When the key is built
        const key = getRequestKey(REQUEST_NAMES.SAVE_GLOBAL_COMPANY, scope);

        // Then the workspace decides the key, so the writer that knows only the workspace and the reader that knows both agree
        expect(key).toBe(getRequestKey(REQUEST_NAMES.SAVE_GLOBAL_COMPANY, {policyID: 'eur'}));
    });

    it('gives the same request of two workspaces two keys', () => {
        // Given the same request sent for two workspaces
        // When their keys are built
        const firstKey = getRequestKey(REQUEST_NAMES.SAVE_COMPANY, {policyID: 'usd'});
        const secondKey = getRequestKey(REQUEST_NAMES.SAVE_COMPANY, {policyID: 'eur'});

        // Then they differ, so the status of one workspace never shows on the other
        expect(firstKey).not.toBe(secondKey);
    });

    it('keys a request without a workspace by its bank account', () => {
        // Given a flow opened by bankAccountID, which has no workspace
        // When the key is built
        const key = getRequestKey(REQUEST_NAMES.SAVE_COMPANY, {policyID: undefined, bankAccountID: 42});

        // Then the bank account scopes it, so it differs from another bank account
        expect(key).not.toBe(getRequestKey(REQUEST_NAMES.SAVE_COMPANY, {policyID: undefined, bankAccountID: 43}));
    });

    it('keeps the bare name for a request that is not about a bank account', () => {
        // Given a request without scope, such as the validate code, and a scope without any ID
        // When the keys are built
        const unscopedKey = getRequestKey(REQUEST_NAMES.VALIDATE_USER);
        const emptyScopeKey = getRequestKey(REQUEST_NAMES.VALIDATE_USER, {policyID: undefined, bankAccountID: 0});

        // Then both are the name of the request, so readers that pass only the name find the status
        expect(unscopedKey).toBe(REQUEST_NAMES.VALIDATE_USER);
        expect(emptyScopeKey).toBe(REQUEST_NAMES.VALIDATE_USER);
    });
});
