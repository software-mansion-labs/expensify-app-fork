import visibleReportActionsConfig from '@libs/actions/OnyxDerived/configs/visibleReportActions';

import CONST from '@src/CONST';
import type {OnyxKey} from '@src/ONYXKEYS';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, ReportActions} from '@src/types/onyx';
import type {VisibleReportActionsDerivedValue} from '@src/types/onyx/DerivedValues';

import type {OnyxCollection} from 'react-native-onyx';

import {createMockReport, getFakeReportAction} from '../../utils/ReportTestUtils';

describe('visibleReportActions', () => {
    describe('SESSION detected via triggeredKeys', () => {
        const reportActionsKeyA = `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}A`;
        // Only report A has report actions now; report B exists only in the previous derived value (currentValue).
        const allReportActions: OnyxCollection<ReportActions> = {[reportActionsKeyA]: {}};
        const args: Parameters<typeof visibleReportActionsConfig.compute>[0] = [allReportActions, undefined, {} as OnyxCollection<Report>];
        const currentValue: VisibleReportActionsDerivedValue = {A: {}, B: {}};
        const sourceValues: Parameters<typeof visibleReportActionsConfig.compute>[1]['sourceValues'] = {[ONYXKEYS.COLLECTION.REPORT_ACTIONS]: {[reportActionsKeyA]: {}}};

        it('recomputes incrementally (keeps a stale report) when only report actions triggered', () => {
            const result = visibleReportActionsConfig.compute(args, {currentValue, sourceValues, triggeredKeys: new Set<OnyxKey>([ONYXKEYS.COLLECTION.REPORT_ACTIONS])});

            // Incremental: report B (absent from allReportActions) is retained from the previous value.
            expect(result.B).toBeDefined();
        });

        it('does a full recompute (drops the stale report) when SESSION also triggered, even with no SESSION delta', () => {
            const result = visibleReportActionsConfig.compute(args, {currentValue, sourceValues, triggeredKeys: new Set<OnyxKey>([ONYXKEYS.COLLECTION.REPORT_ACTIONS, ONYXKEYS.SESSION])});

            // Full recompute: report B is not in allReportActions, so it is dropped.
            expect(result.B).toBeUndefined();
            expect(result.A).toBeDefined();
        });
    });

    describe('REPORT changes', () => {
        it('recomputes only the reports whose report changed', () => {
            // Given two chats with a CLOSED action each, which a chat hides
            const closedAction = getFakeReportAction(1, {actionName: CONST.REPORT.ACTIONS.TYPE.CLOSED});
            const allReportActions: OnyxCollection<ReportActions> = {
                [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}A`]: {[closedAction.reportActionID]: closedAction},
                [`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}B`]: {[closedAction.reportActionID]: closedAction},
            };
            const currentValue: VisibleReportActionsDerivedValue = {A: {[closedAction.reportActionID]: false}, B: {[closedAction.reportActionID]: false}};

            // When report A becomes a support ticket, which shows CLOSED actions
            const reportA = createMockReport({reportID: 'A', type: CONST.REPORT.TYPE.SUPPORT_TICKET});
            const allReports: OnyxCollection<Report> = {[`${ONYXKEYS.COLLECTION.REPORT}A`]: reportA, [`${ONYXKEYS.COLLECTION.REPORT}B`]: createMockReport({reportID: 'B'})};
            const result = visibleReportActionsConfig.compute([allReportActions, undefined, allReports], {
                currentValue,
                sourceValues: {[ONYXKEYS.COLLECTION.REPORT]: {[`${ONYXKEYS.COLLECTION.REPORT}A`]: reportA}},
                triggeredKeys: new Set<OnyxKey>([ONYXKEYS.COLLECTION.REPORT]),
            });

            // Then report A's action turns visible and report B keeps its previous entry, as its report did not change
            expect(result.A?.[closedAction.reportActionID]).toBe(true);
            expect(result.B).toBe(currentValue.B);
        });
    });
});
