import {act, renderHook} from '@testing-library/react-native';

import useScreenGuard from '@pages/SimplifiedBankOnboarding/core/flow/useScreenGuard';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/core/requests/types';

import {useIsFocused} from '@react-navigation/native';

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<Record<string, unknown>>('@react-navigation/native'),
    useIsFocused: jest.fn(() => true),
}));

const SUCCEEDED: RequestOutcome = {status: 'succeeded'};
const FAILED: RequestOutcome = {status: 'failed'};

type Deferred = {
    promise: Promise<RequestOutcome>;
    resolve: (outcome: RequestOutcome) => void;
    reject: (error: Error) => void;
};

function createDeferred(): Deferred {
    let resolve: (outcome: RequestOutcome) => void = () => {};
    let reject: (error: Error) => void = () => {};
    const promise = new Promise<RequestOutcome>((onResolve, onReject) => {
        resolve = onResolve;
        reject = onReject;
    });
    return {promise, resolve, reject};
}

function renderGuard(positionKey = 'personal-info/full-name/') {
    return renderHook(({position}: {position: string}) => useScreenGuard(position), {initialProps: {position: positionKey}});
}

async function settle(deferred: Deferred, outcome: RequestOutcome) {
    await act(async () => {
        deferred.resolve(outcome);
        await deferred.promise;
    });
}

describe('useScreenGuard', () => {
    beforeEach(() => {
        jest.mocked(useIsFocused).mockReturnValue(true);
    });

    it('navigates when the outcome succeeded and the screen did not change', async () => {
        // Given a screen that waits for a request
        const {result} = renderGuard();
        const deferred = createDeferred();
        const navigate = jest.fn();
        result.current(deferred.promise, navigate);

        // When the request succeeds
        await settle(deferred, SUCCEEDED);

        // Then the screen moves on, because nothing happened while it waited
        expect(navigate).toHaveBeenCalledTimes(1);
    });

    it('navigates after a plain write that resolves with nothing', async () => {
        // Given the options screen, which waits for a draft write rather than a request
        const {result} = renderGuard('entry-options');
        const navigate = jest.fn();

        // When the write finishes
        await act(async () => {
            const write = Promise.resolve();
            result.current(write, navigate);
            await write;
        });

        // Then the screen moves on, because a write that resolved counts as success
        expect(navigate).toHaveBeenCalledTimes(1);
    });

    it('does not navigate when the outcome failed', async () => {
        // Given a screen that waits for a request
        const {result} = renderGuard();
        const deferred = createDeferred();
        const navigate = jest.fn();
        result.current(deferred.promise, navigate);

        // When the request fails
        await settle(deferred, FAILED);

        // Then the screen stays, so the user can read the error and try again
        expect(navigate).not.toHaveBeenCalled();
    });

    it('does not navigate after the screen unmounted', async () => {
        // Given a screen that waits for a request
        const {result, unmount} = renderGuard();
        const deferred = createDeferred();
        const navigate = jest.fn();
        result.current(deferred.promise, navigate);

        // When the user leaves the screen before the answer comes
        unmount();
        await settle(deferred, SUCCEEDED);

        // Then the late answer does not move a screen that no longer exists
        expect(navigate).not.toHaveBeenCalled();
    });

    it('does not navigate when the screen shows another position', async () => {
        // Given a screen that waits for a request on one page
        const {result, rerender} = renderGuard('personal-info/full-name/');
        const deferred = createDeferred();
        const navigate = jest.fn();
        result.current(deferred.promise, navigate);

        // When the user opens another page of the same screen before the answer comes
        rerender({position: 'personal-info/ssn/'});
        await settle(deferred, SUCCEEDED);

        // Then the late answer does not move the page the user opened
        expect(navigate).not.toHaveBeenCalled();
    });

    it('does not navigate when the screen lost focus', async () => {
        // Given a screen that waits for a request
        const {result, rerender} = renderGuard();
        const deferred = createDeferred();
        const navigate = jest.fn();
        result.current(deferred.promise, navigate);

        // When another screen opens on top of it before the answer comes
        jest.mocked(useIsFocused).mockReturnValue(false);
        rerender({position: 'personal-info/full-name/'});
        await settle(deferred, SUCCEEDED);

        // Then the late answer does not navigate under the screen the user looks at
        expect(navigate).not.toHaveBeenCalled();
    });

    it('ignores a second call while one waits', async () => {
        // Given a screen that waits for a request
        const {result} = renderGuard();
        const first = createDeferred();
        const second = createDeferred();
        const firstNavigate = jest.fn();
        const secondNavigate = jest.fn();
        result.current(first.promise, firstNavigate);

        // When the user presses again before the answer comes and then both requests succeed
        result.current(second.promise, secondNavigate);
        await settle(first, SUCCEEDED);
        await settle(second, SUCCEEDED);

        // Then the screen moves only once, so a double press never skips a page
        expect(firstNavigate).toHaveBeenCalledTimes(1);
        expect(secondNavigate).not.toHaveBeenCalled();
    });

    it('accepts a new call after a wait that threw', async () => {
        // Given a screen whose first wait ends with an exception
        const {result} = renderGuard();
        const broken = createDeferred();
        const firstNavigate = jest.fn();
        result.current(broken.promise, firstNavigate);
        await act(async () => {
            broken.reject(new Error('network'));
            await broken.promise.catch(() => undefined);
        });

        // When the user tries again and that request succeeds
        const retry = createDeferred();
        const retryNavigate = jest.fn();
        result.current(retry.promise, retryNavigate);
        await settle(retry, SUCCEEDED);

        // Then only the retry navigates, because the guard released the wait of the failed attempt
        expect(firstNavigate).not.toHaveBeenCalled();
        expect(retryNavigate).toHaveBeenCalledTimes(1);
    });
});
