import type * as LoginToAccountIDMapModule from '@libs/actions/OnyxDerived/configs/loginToAccountIDMap';
import type * as VisibleReportActionsModule from '@libs/actions/OnyxDerived/configs/visibleReportActions';

import initOnyxDerivedValues from '@userActions/OnyxDerived';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportAction} from '@src/types/onyx';

import Onyx from 'react-native-onyx';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

import createRandomReportAction from '../utils/collections/reportActions';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

// Force loginToAccountIDMap's compute to throw once, on demand, so we can verify the CLASSIC engine
// self-heals: a compute that throws must not lose the deltas that triggered the failed flush. It has
// to be the compute (not the Onyx write) that throws — a thrown write would still leave the change in
// the in-memory derived value, masking the bug.
let mockShouldThrowCompute = false;
jest.mock('@libs/actions/OnyxDerived/configs/loginToAccountIDMap', () => {
    const actual = jest.requireActual<typeof LoginToAccountIDMapModule>('@libs/actions/OnyxDerived/configs/loginToAccountIDMap');
    const actualCompute = actual.default.compute;
    return {
        __esModule: true,
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

// Force computeReportVisibility to throw once, on demand, so we can verify the SCOPED materializer
// self-heals: a computeEntry that throws skips that entry, and the next write touching it recomputes
// it from the full current state.
let mockShouldThrowVisibility = false;
jest.mock('@libs/actions/OnyxDerived/configs/visibleReportActions', () => {
    const actual = jest.requireActual<typeof VisibleReportActionsModule>('@libs/actions/OnyxDerived/configs/visibleReportActions');
    return {
        __esModule: true,
        ...actual,
        computeReportVisibility: (...args: Parameters<typeof actual.computeReportVisibility>) => {
            if (mockShouldThrowVisibility) {
                mockShouldThrowVisibility = false;
                throw new Error('visibility boom');
            }
            return actual.computeReportVisibility(...args);
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

/* eslint-disable @typescript-eslint/naming-convention -- personal-details fixtures are keyed by numeric accountIDs */
describe('OnyxDerived self-healing after a compute throws', () => {
    beforeAll(async () => {
        Onyx.init({keys: ONYXKEYS});
        initOnyxDerivedValues();
        await waitForBatchedUpdates();
    });

    beforeEach(async () => {
        mockShouldThrowCompute = false;
        mockShouldThrowVisibility = false;
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    it('classic engine: recovers the deltas from a failed flush on the next dependency change', async () => {
        // Establish a baseline login mapping.
        await Onyx.merge(ONYXKEYS.PERSONAL_DETAILS_LIST, {'1': {accountID: 1, login: 'a@x.com'}});
        await waitForBatchedUpdates();
        let derived = await OnyxUtils.get(ONYXKEYS.DERIVED.LOGIN_TO_ACCOUNT_ID_MAP);
        expect(derived?.['a@x.com']).toBe(1);

        // Add a second login, but make this flush's compute throw. The delta must not be lost.
        mockShouldThrowCompute = true;
        await Onyx.merge(ONYXKEYS.PERSONAL_DETAILS_LIST, {'2': {accountID: 2, login: 'b@x.com'}});
        await waitForBatchedUpdates();
        derived = await OnyxUtils.get(ONYXKEYS.DERIVED.LOGIN_TO_ACCOUNT_ID_MAP);
        expect(derived?.['b@x.com']).toBeUndefined();

        // A later, unrelated change triggers a successful flush that must include the failed delta.
        await Onyx.merge(ONYXKEYS.PERSONAL_DETAILS_LIST, {'3': {accountID: 3, login: 'c@x.com'}});
        await waitForBatchedUpdates();
        derived = await OnyxUtils.get(ONYXKEYS.DERIVED.LOGIN_TO_ACCOUNT_ID_MAP);
        expect(derived?.['b@x.com']).toBe(2);
        expect(derived?.['c@x.com']).toBe(3);
    });

    it('scoped materializer: a failed entry compute heals on the next write touching it', async () => {
        const actionA = createVisibleReportAction(1, 'A');
        const actionB = createVisibleReportAction(2, 'B');
        const actionC = createVisibleReportAction(3, 'C');

        // Establish a baseline: action A tracked for report r1.
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}r1`, {A: actionA});
        await waitForBatchedUpdates();
        let derived = await OnyxUtils.get(ONYXKEYS.DERIVED.VISIBLE_REPORT_ACTIONS);
        expect(derived?.r1?.A).toBe(true);

        // Add action B, but make this entry's compute throw — the entry is skipped, not corrupted.
        mockShouldThrowVisibility = true;
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}r1`, {B: actionB});
        await waitForBatchedUpdates();
        derived = await OnyxUtils.get(ONYXKEYS.DERIVED.VISIBLE_REPORT_ACTIONS);
        expect(derived?.r1?.A).toBe(true);
        expect(derived?.r1?.B).toBeUndefined();

        // The next write touching the entry recomputes it from the FULL current member state — the
        // previously-failed action B is recovered along with C.
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}r1`, {C: actionC});
        await waitForBatchedUpdates();
        derived = await OnyxUtils.get(ONYXKEYS.DERIVED.VISIBLE_REPORT_ACTIONS);
        expect(derived?.r1?.A).toBe(true);
        expect(derived?.r1?.B).toBe(true);
        expect(derived?.r1?.C).toBe(true);
    });
});
