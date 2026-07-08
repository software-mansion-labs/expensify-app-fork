import {READ_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import SentryServerTiming from '@libs/Middleware/SentryServerTiming';

import CONST from '@src/CONST';
import type Request from '@src/types/onyx/Request';
import type Response from '@src/types/onyx/Response';

import type {OnyxKey} from 'react-native-onyx';

const mockStartSpan = jest.fn<void, unknown[]>();
const mockEndSpanWithAttributes = jest.fn<void, unknown[]>();
const mockCancelSpan = jest.fn<void, unknown[]>();

jest.mock('@libs/telemetry/activeSpans', () => ({
    startSpan: (...args: unknown[]) => {
        mockStartSpan(...args);
    },
    endSpanWithAttributes: (...args: unknown[]) => {
        mockEndSpanWithAttributes(...args);
    },
    cancelSpan: (...args: unknown[]) => {
        mockCancelSpan(...args);
    },
}));

const mockStampSearchContentLoadAttributes = jest.fn<void, unknown[]>();

jest.mock('@libs/telemetry/searchContentLoadTiming', () => ({
    stampSearchContentLoadAttributes: (...args: unknown[]) => {
        mockStampSearchContentLoadAttributes(...args);
    },
}));

function buildRequest(command: string, data?: Record<string, unknown>): Request<OnyxKey> {
    return {command, data, requestIndex: 7};
}

const SUCCESS_RESPONSE: Response<OnyxKey> = {jsonCode: 200};

beforeEach(() => {
    jest.clearAllMocks();
});

describe('SentryServerTiming middleware', () => {
    it('passes non-tracked commands through without starting a span', async () => {
        const result = await SentryServerTiming(Promise.resolve(SUCCESS_RESPONSE), buildRequest('OpenReport'), false);

        expect(result).toBe(SUCCESS_RESPONSE);
        expect(mockStartSpan).not.toHaveBeenCalled();
        expect(mockEndSpanWithAttributes).not.toHaveBeenCalled();
    });

    it('starts a span for the Search command and ends it with the response jsonCode', async () => {
        await SentryServerTiming(Promise.resolve(SUCCESS_RESPONSE), buildRequest(READ_COMMANDS.SEARCH, {hash: 123}), false);

        const expectedSpanId = `${CONST.TELEMETRY.SPAN_SEARCH_SERVER_RESPONSE}_7`;
        expect(mockStartSpan).toHaveBeenCalledWith(expectedSpanId, {
            name: 'search-server-response',
            op: CONST.TELEMETRY.SPAN_SEARCH_SERVER_RESPONSE,
            attributes: {[CONST.TELEMETRY.ATTRIBUTE_COMMAND]: READ_COMMANDS.SEARCH},
        });
        expect(mockEndSpanWithAttributes).toHaveBeenCalledWith(expectedSpanId, {[CONST.TELEMETRY.ATTRIBUTE_JSON_CODE]: 200});
    });

    it('stamps the server round-trip duration for the search content load with the request hash', async () => {
        await SentryServerTiming(Promise.resolve(SUCCESS_RESPONSE), buildRequest(READ_COMMANDS.SEARCH, {hash: 123}), false);

        expect(mockStampSearchContentLoadAttributes).toHaveBeenCalledTimes(1);
        const [stampedHash, stampedAttributes] = mockStampSearchContentLoadAttributes.mock.calls.at(0) ?? [];
        expect(stampedHash).toBe(123);
        expect(stampedAttributes).toHaveProperty(CONST.TELEMETRY.ATTRIBUTE_SEARCH_SERVER_RESPONSE_MS, expect.any(Number));
    });

    it('does not stamp search content load attributes for expense commands', async () => {
        await SentryServerTiming(Promise.resolve(SUCCESS_RESPONSE), buildRequest(WRITE_COMMANDS.REQUEST_MONEY), false);

        expect(mockStartSpan).toHaveBeenCalledWith(`${CONST.TELEMETRY.SPAN_EXPENSE_SERVER_RESPONSE}_7`, expect.anything());
        expect(mockStampSearchContentLoadAttributes).not.toHaveBeenCalled();
    });

    it('cancels the span and rethrows when the request rejects', async () => {
        const error = new Error('network down');

        await expect(SentryServerTiming(Promise.reject(error), buildRequest(READ_COMMANDS.SEARCH, {hash: 123}), false)).rejects.toThrow('network down');

        expect(mockCancelSpan).toHaveBeenCalledWith(`${CONST.TELEMETRY.SPAN_SEARCH_SERVER_RESPONSE}_7`);
        expect(mockEndSpanWithAttributes).not.toHaveBeenCalled();
        expect(mockStampSearchContentLoadAttributes).not.toHaveBeenCalled();
    });
});
