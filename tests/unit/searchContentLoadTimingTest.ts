import {claimSearchContentLoadSpan, ownsActiveSearchContentLoadSpan, stampSearchContentLoadAttributes} from '@libs/telemetry/searchContentLoadTiming';

import CONST from '@src/CONST';

const mockGetSpan = jest.fn();

jest.mock('@libs/telemetry/activeSpans', () => ({
    getSpan: (...args: unknown[]) => mockGetSpan(...args) as unknown,
}));

jest.mock('@sentry/core', () => ({
    // Span started 250ms ago, so the stamped offset is a small positive number.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    spanToJSON: () => ({start_timestamp: Date.now() / 1000 - 0.25}),
}));

type FakeSpan = {setAttribute: jest.Mock<void, [string, number]>; setAttributes: jest.Mock<void, [Record<string, unknown>]>};

function makeFakeSpan(): FakeSpan {
    return {setAttribute: jest.fn<void, [string, number]>(), setAttributes: jest.fn<void, [Record<string, unknown>]>()};
}

beforeEach(() => {
    jest.clearAllMocks();
    mockGetSpan.mockReturnValue(undefined);
});

describe('searchContentLoadTiming', () => {
    it('claims the active ContentLoad span and stamps the search call offset', () => {
        const span = makeFakeSpan();
        mockGetSpan.mockReturnValue(span);

        claimSearchContentLoadSpan(1);

        expect(span.setAttribute).toHaveBeenCalledWith(CONST.TELEMETRY.ATTRIBUTE_SEARCH_CALL_OFFSET_MS, expect.any(Number));
        const offset = span.setAttribute.mock.calls.at(0)?.[1] ?? -1;
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(ownsActiveSearchContentLoadSpan(1)).toBe(true);
    });

    it('stamps attributes for the owning search', () => {
        const span = makeFakeSpan();
        mockGetSpan.mockReturnValue(span);
        claimSearchContentLoadSpan(2);

        stampSearchContentLoadAttributes(2, {foo: 'bar'});

        expect(span.setAttributes).toHaveBeenCalledWith({foo: 'bar'});
    });

    it('does not let a second overlapping search steal ownership of the same span', () => {
        const span = makeFakeSpan();
        mockGetSpan.mockReturnValue(span);
        claimSearchContentLoadSpan(10);

        claimSearchContentLoadSpan(20);

        // Only the first claim stamps the call offset.
        expect(span.setAttribute).toHaveBeenCalledTimes(1);
        expect(ownsActiveSearchContentLoadSpan(10)).toBe(true);
        expect(ownsActiveSearchContentLoadSpan(20)).toBe(false);

        stampSearchContentLoadAttributes(20, {foo: 'bar'});
        expect(span.setAttributes).not.toHaveBeenCalled();
    });

    it('ignores stamps once a newer navigation replaced the span', () => {
        const oldSpan = makeFakeSpan();
        mockGetSpan.mockReturnValue(oldSpan);
        claimSearchContentLoadSpan(30);

        const newSpan = makeFakeSpan();
        mockGetSpan.mockReturnValue(newSpan);

        stampSearchContentLoadAttributes(30, {foo: 'bar'});

        expect(ownsActiveSearchContentLoadSpan(30)).toBe(false);
        expect(oldSpan.setAttributes).not.toHaveBeenCalled();
        expect(newSpan.setAttributes).not.toHaveBeenCalled();
    });

    it('lets a search claim the span of a newer navigation', () => {
        const oldSpan = makeFakeSpan();
        mockGetSpan.mockReturnValue(oldSpan);
        claimSearchContentLoadSpan(40);

        const newSpan = makeFakeSpan();
        mockGetSpan.mockReturnValue(newSpan);
        claimSearchContentLoadSpan(41);

        expect(newSpan.setAttribute).toHaveBeenCalledWith(CONST.TELEMETRY.ATTRIBUTE_SEARCH_CALL_OFFSET_MS, expect.any(Number));
        expect(ownsActiveSearchContentLoadSpan(41)).toBe(true);
        expect(ownsActiveSearchContentLoadSpan(40)).toBe(false);

        stampSearchContentLoadAttributes(41, {foo: 'bar'});
        expect(newSpan.setAttributes).toHaveBeenCalledWith({foo: 'bar'});
    });

    it('ignores stamps once the span ended', () => {
        const span = makeFakeSpan();
        mockGetSpan.mockReturnValue(span);
        claimSearchContentLoadSpan(50);

        // getSpan returns undefined after the span ends.
        mockGetSpan.mockReturnValue(undefined);

        expect(ownsActiveSearchContentLoadSpan(50)).toBe(false);
        expect(() => stampSearchContentLoadAttributes(50, {foo: 'bar'})).not.toThrow();
        expect(span.setAttributes).not.toHaveBeenCalled();
    });

    it('is a no-op when there is no active span to claim', () => {
        claimSearchContentLoadSpan(60);

        expect(ownsActiveSearchContentLoadSpan(60)).toBe(false);
        expect(() => stampSearchContentLoadAttributes(60, {foo: 'bar'})).not.toThrow();
    });
});
