import {renderHook} from '@testing-library/react-native';

import useMFACancelOnEscape from '@components/MultifactorAuthentication/useMFACancelOnEscape';
import suppressNextEscapeKeyup from '@components/MultifactorAuthentication/useMFACancelOnEscape/suppressNextEscapeKeyup';

const mockRequestCancel = jest.fn();

jest.mock('@components/MultifactorAuthentication/Context/MultifactorAuthenticationInternalApiContext', () => ({
    useMultifactorAuthenticationInternal: () => ({requestCancel: mockRequestCancel}),
}));

jest.mock('@components/MultifactorAuthentication/useMFACancelOnEscape/suppressNextEscapeKeyup', () => ({__esModule: true, default: jest.fn()}));

const suppressNextEscapeKeyupMock = jest.mocked(suppressNextEscapeKeyup);

describe('useMFACancelOnEscape', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('requests a cancel once per Escape', () => {
        // Given the MFA modal's Escape handler
        const {result} = renderHook(() => useMFACancelOnEscape());

        // When the user presses Escape
        result.current();

        // Then exactly one cancel is requested, so a single press opens a single confirmation
        expect(mockRequestCancel).toHaveBeenCalledTimes(1);
    });

    it('arms the keyup suppression before requesting the cancel, so the same press cannot close the modal it opens', () => {
        // Given the call order of the suppression and the cancel request is recorded
        const calls: string[] = [];
        suppressNextEscapeKeyupMock.mockImplementationOnce(() => calls.push('suppress'));
        mockRequestCancel.mockImplementationOnce(() => calls.push('requestCancel'));
        const {result} = renderHook(() => useMFACancelOnEscape());

        // When the user presses Escape
        result.current();

        // Then the keyup is suppressed first, because the confirmation modal must already be guarded when it opens
        expect(calls).toEqual(['suppress', 'requestCancel']);
    });
});
