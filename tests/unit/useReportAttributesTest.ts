import {renderHook} from '@testing-library/react-native';

import useReportAttributes, {useDerivedReportNameByReportID, useDerivedReportNamesByReportIDs} from '@hooks/useReportAttributes';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, ReportAttributesDerivedValue} from '@src/types/onyx';
import type {ReportAttributes} from '@src/types/onyx/DerivedValues';

import Onyx from 'react-native-onyx';

import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const REPORT_ID_1 = 'reportID1';
const REPORT_ID_2 = 'reportID2';
const REPORT_ID_3 = 'reportID3';

function createMockReport(overrides: Partial<ReportAttributes> = {}): ReportAttributes {
    return {
        reportName: 'Default Report',
        isEmpty: false,
        brickRoadStatus: undefined,
        requiresAttention: false,
        reportErrors: {},
        ...overrides,
    };
}

function createDerivedValue(reports: ReportAttributesDerivedValue['reports'], locale = 'en'): ReportAttributesDerivedValue {
    return {reports, locale};
}

const MOCK_REPORTS: ReportAttributesDerivedValue['reports'] = {
    [REPORT_ID_1]: createMockReport({reportName: 'Report 1'}),
    [REPORT_ID_2]: createMockReport({
        reportName: 'Report 2',
        isEmpty: true,
        brickRoadStatus: CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR,
        requiresAttention: true,
        reportErrors: {error: 'Something went wrong'},
    }),
};

describe('useReportAttributes', () => {
    beforeAll(() => {
        Onyx.init({
            keys: ONYXKEYS,
        });
    });

    beforeEach(async () => {
        await Onyx.clear();
    });

    it('should return undefined when the derived value is not set', async () => {
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useReportAttributes());

        expect(result.current).toBeUndefined();
    });

    it('should return the reports from the derived value', async () => {
        await Onyx.set(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES, createDerivedValue(MOCK_REPORTS));

        await waitForBatchedUpdates();

        const {result} = renderHook(() => useReportAttributes());

        expect(result.current).toEqual(MOCK_REPORTS);
    });

    it('should return reports with correct attributes', async () => {
        await Onyx.set(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES, createDerivedValue(MOCK_REPORTS));

        await waitForBatchedUpdates();

        const {result} = renderHook(() => useReportAttributes());

        expect(result.current?.[REPORT_ID_1]?.reportName).toBe('Report 1');
        expect(result.current?.[REPORT_ID_1]?.isEmpty).toBe(false);
        expect(result.current?.[REPORT_ID_1]?.brickRoadStatus).toBeUndefined();
        expect(result.current?.[REPORT_ID_2]?.brickRoadStatus).toBe(CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR);
        expect(result.current?.[REPORT_ID_2]?.requiresAttention).toBe(true);
    });

    it('should return an empty object when reports is empty', async () => {
        await Onyx.set(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES, createDerivedValue({}));

        await waitForBatchedUpdates();

        const {result} = renderHook(() => useReportAttributes());

        expect(result.current).toEqual({});
    });

    it('should update when the derived value changes', async () => {
        await Onyx.set(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES, createDerivedValue(MOCK_REPORTS));

        await waitForBatchedUpdates();

        const {result, rerender} = renderHook(() => useReportAttributes());

        expect(Object.keys(result.current ?? {})).toHaveLength(2);

        const updatedReports: ReportAttributesDerivedValue['reports'] = {
            [REPORT_ID_3]: createMockReport({
                reportName: 'Report 3',
                brickRoadStatus: CONST.BRICK_ROAD_INDICATOR_STATUS.INFO,
                requiresAttention: true,
            }),
        };

        await Onyx.set(ONYXKEYS.DERIVED.REPORT_ATTRIBUTES, createDerivedValue(updatedReports));

        await waitForBatchedUpdates();
        rerender(undefined);

        expect(Object.keys(result.current ?? {})).toHaveLength(1);
        expect(result.current?.[REPORT_ID_3]?.reportName).toBe('Report 3');
    });
});

// Lazy-Onyx POC (reportAttributes retirement): the name hooks below no longer read the derived
// value — they compute names ON DEMAND from the actual report data (useOnDemandReportName). The
// tests therefore seed real report_ members (policy rooms, whose name is the stored reportName)
// instead of a prebuilt derived map.
function createRoomReport(reportID: string, reportName: string): Report {
    return {reportID, type: CONST.REPORT.TYPE.CHAT, chatType: CONST.REPORT.CHAT_TYPE.POLICY_ROOM, reportName};
}

describe('useDerivedReportNameByReportID', () => {
    beforeAll(() => {
        Onyx.init({
            keys: ONYXKEYS,
        });
    });

    beforeEach(async () => {
        await Onyx.clear();
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID_1}`, createRoomReport(REPORT_ID_1, '#report-1'));
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID_2}`, createRoomReport(REPORT_ID_2, '#report-2'));
        await waitForBatchedUpdatesWithAct();
    });

    it("should return the report's name for a matching reportID", async () => {
        const {result} = renderHook(() => useDerivedReportNameByReportID(REPORT_ID_1));
        await waitForBatchedUpdatesWithAct();

        expect(result.current).toBe('#report-1');
    });

    it('should return undefined when the reportID is undefined', async () => {
        const {result} = renderHook(() => useDerivedReportNameByReportID(undefined));
        await waitForBatchedUpdatesWithAct();

        expect(result.current).toBeUndefined();
    });

    it('should return undefined when the report does not exist', async () => {
        const {result} = renderHook(() => useDerivedReportNameByReportID('nonExistentReportID'));
        await waitForBatchedUpdatesWithAct();

        expect(result.current).toBeUndefined();
    });

    it("should update when that report's name changes", async () => {
        const {result} = renderHook(() => useDerivedReportNameByReportID(REPORT_ID_1));
        await waitForBatchedUpdatesWithAct();

        expect(result.current).toBe('#report-1');

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID_1}`, {reportName: '#renamed-report-1'});
        await waitForBatchedUpdatesWithAct();

        expect(result.current).toBe('#renamed-report-1');
    });
});

describe('useDerivedReportNamesByReportIDs', () => {
    beforeAll(() => {
        Onyx.init({
            keys: ONYXKEYS,
        });
    });

    beforeEach(async () => {
        await Onyx.clear();
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID_1}`, createRoomReport(REPORT_ID_1, '#report-1'));
        await Onyx.set(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID_2}`, createRoomReport(REPORT_ID_2, '#report-2'));
        await waitForBatchedUpdatesWithAct();
    });

    it('should return a name for each matching reportID', async () => {
        const {result} = renderHook(() => useDerivedReportNamesByReportIDs([REPORT_ID_1, REPORT_ID_2]));
        await waitForBatchedUpdatesWithAct();

        expect(result.current).toEqual({
            [REPORT_ID_1]: '#report-1',
            [REPORT_ID_2]: '#report-2',
        });
    });

    it('should return an empty object for an empty array of reportIDs', async () => {
        const {result} = renderHook(() => useDerivedReportNamesByReportIDs([]));
        await waitForBatchedUpdatesWithAct();

        expect(result.current).toEqual({});
    });

    it('should skip undefined reportIDs', async () => {
        const {result} = renderHook(() => useDerivedReportNamesByReportIDs([REPORT_ID_1, undefined]));
        await waitForBatchedUpdatesWithAct();

        expect(Object.keys(result.current ?? {})).toEqual([REPORT_ID_1]);
        expect(result.current?.[REPORT_ID_1]).toBe('#report-1');
    });

    it('should map an undefined name for a report that does not exist', async () => {
        const {result} = renderHook(() => useDerivedReportNamesByReportIDs([REPORT_ID_1, 'nonExistentReportID']));
        await waitForBatchedUpdatesWithAct();

        expect(result.current?.[REPORT_ID_1]).toBe('#report-1');
        expect(result.current?.nonExistentReportID).toBeUndefined();
    });

    it('should update when one of the requested report names changes', async () => {
        const {result} = renderHook(() => useDerivedReportNamesByReportIDs([REPORT_ID_1, REPORT_ID_2]));
        await waitForBatchedUpdatesWithAct();

        expect(result.current?.[REPORT_ID_1]).toBe('#report-1');

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID_1}`, {reportName: '#renamed-report-1'});
        await waitForBatchedUpdatesWithAct();

        expect(result.current?.[REPORT_ID_1]).toBe('#renamed-report-1');
        expect(result.current?.[REPORT_ID_2]).toBe('#report-2');
    });
});
