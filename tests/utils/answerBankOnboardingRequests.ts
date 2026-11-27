/**
 * Lets the mocked API of the bank onboarding lab answer its requests the way the real API applies the Onyx data of a
 * request. A test that uses it must mock `@pages/SimplifiedBankOnboarding/mockBackend/mockApi` with `jest.fn()` for
 * `read` and `write`.
 */
import {read, write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import type {OnyxData} from '@src/types/onyx/Request';

import type {OnyxKey, OnyxUpdate} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

/** `adminRequired` applies neither the success nor the failure data, like the real API for a command that needs an admin. `none` never answers. */
type MockServerAnswer = 'success' | 'failure' | 'adminRequired' | 'none';

function getResultData(answer: Exclude<MockServerAnswer, 'none'>, onyxData: OnyxData<OnyxKey>): Array<OnyxUpdate<OnyxKey>> {
    if (answer === 'success') {
        return onyxData.successData ?? [];
    }
    if (answer === 'failure') {
        return onyxData.failureData ?? [];
    }
    return [];
}

function answerBankOnboardingRequests(type: 'read' | 'write', answer: MockServerAnswer) {
    const answerRequest = (_command: unknown, _params: unknown, onyxData: OnyxData<OnyxKey> = {}) => {
        Onyx.update(onyxData.optimisticData ?? []).then(() => {
            if (answer === 'none') {
                return;
            }
            return Onyx.update(getResultData(answer, onyxData)).then(() => Onyx.update(onyxData.finallyData ?? []));
        });
    };

    if (type === 'read') {
        jest.mocked(read).mockImplementation(answerRequest);
        return;
    }
    jest.mocked(write).mockImplementation(answerRequest);
}

export default answerBankOnboardingRequests;
