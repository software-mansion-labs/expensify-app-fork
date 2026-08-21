import type * as VisibleReportActionsModule from '@libs/actions/OnyxDerived/configs/visibleReportActions';

import initOnyxDerivedValues from '@userActions/OnyxDerived';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportAction} from '@src/types/onyx';

import Onyx from 'react-native-onyx';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

import createRandomReportAction from '../utils/collections/reportActions';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

// Force visibleReportActions' compute to throw once, on demand, so we can verify the engine
// self-heals: a compute that throws must not lose the deltas that triggered the failed flush. It has to be
// the compute (not the Onyx write) that throws — a thrown write would still leave the change in the
// in-memory derived value, masking the bug.
let mockShouldThrowCompute = false;
jest.mock('@libs/actions/OnyxDerived/configs/visibleReportActions', () => {
    const actual = jest.requireActual<typeof VisibleReportActionsModule>('@libs/actions/OnyxDerived/configs/visibleReportActions');
    const actualCompute = actual.default.compute;
    return {
        __esModule: true,
        computeReportVisibility: actual.computeReportVisibility,
        default: {
            ...actual.default,
            compute: (dependencyValues: Parameters<typeof actualCompute>[0], context: Parameters<typeof actualCompute>[1]) => {
                if (mockShouldThrowCompute) {
                    mockShouldThrowCompute = false;
                    throw new Error('compute boom');
                }
                return actualCompute(dependencyValues, context);
            },
        },
    };
});

/** A deterministic, always-visible report action (the random fixture randomizes visibility-affecting fields). */
function createVisibleReportAction(index: number, reportActionID: string): ReportAction {
    return {
        ...createRandomReportAction(index),
        reportActionID,
        actionName: CONST.REPORT.ACTIONS.TYPE.ADD_COMMENT,
        pendingAction: undefined,
        errors: undefined,
        shouldShow: true,
        message: [{type: 'COMMENT', html: 'hello', text: 'hello', isEdited: false, isDeletedParentAction: false, whisperedTo: []}],
        originalMessage: {html: 'hello', whisperedTo: []},
    };
}

describe('OnyxDerived self-healing after a compute throws', () => {
    beforeAll(async () => {
        Onyx.init({keys: ONYXKEYS});
        initOnyxDerivedValues();
        await waitForBatchedUpdates();
    });

    beforeEach(async () => {
        mockShouldThrowCompute = false;
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    it('recovers the deltas from a failed flush on the next dependency change', async () => {
        const actionA = createVisibleReportAction(1, 'A');
        const actionB = createVisibleReportAction(2, 'B');
        const actionC = createVisibleReportAction(3, 'C');

        // Establish a baseline: action A tracked for report r1.
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}r1`, {A: actionA});
        await waitForBatchedUpdates();

        // Add action B, but make this flush's compute throw. The delta must not be lost.
        mockShouldThrowCompute = true;
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}r1`, {B: actionB});
        await waitForBatchedUpdates();

        // The failed flush did not persist anything.
        let derived = await OnyxUtils.get(ONYXKEYS.DERIVED.VISIBLE_REPORT_ACTIONS);
        expect(derived?.r1?.A).toBe(true);
        expect(derived?.r1?.B).toBeUndefined();

        // A later, unrelated change triggers a successful flush that must include the previously-failed delta.
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}r1`, {C: actionC});
        await waitForBatchedUpdates();

        derived = await OnyxUtils.get(ONYXKEYS.DERIVED.VISIBLE_REPORT_ACTIONS);
        // B's visibility (from the failed flush) is recovered, and C is added.
        expect(derived?.r1?.A).toBe(true);
        expect(derived?.r1?.B).toBe(true);
        expect(derived?.r1?.C).toBe(true);
    });
});
