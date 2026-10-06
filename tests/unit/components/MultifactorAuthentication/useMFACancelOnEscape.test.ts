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
        const {result} = renderHook(() => useMFACancelOnEscape());

        result.current();

        expect(mockRequestCancel).toHaveBeenCalledTimes(1);
    });

    it('arms the keyup suppression before requesting the cancel, so the same press cannot close the modal it opens', () => {
        const calls: string[] = [];
        suppressNextEscapeKeyupMock.mockImplementationOnce(() => calls.push('suppress'));
        mockRequestCancel.mockImplementationOnce(() => calls.push('requestCancel'));
        const {result} = renderHook(() => useMFACancelOnEscape());

        result.current();

        expect(calls).toEqual(['suppress', 'requestCancel']);
    });
});
