import type outstandingReportsByPolicyIDConfig from '@libs/actions/OnyxDerived/configs/outstandingReportsByPolicyID';

import initOnyxDerivedValues from '@userActions/OnyxDerived';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';

import Onyx from 'react-native-onyx';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

import {createRandomReport} from '../utils/collections/reports';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

// Force outstandingReportsByPolicyID's compute to throw once, on demand, so we can verify the engine
// self-heals: a compute that throws must not lose the deltas that triggered the failed flush. It has to be
// the compute (not the Onyx write) that throws — a thrown write would still leave the change in the
// in-memory derived value, masking the bug.
let mockShouldThrowCompute = false;
jest.mock('@libs/actions/OnyxDerived/configs/outstandingReportsByPolicyID', () => {
    const actual = jest.requireActual<{default: typeof outstandingReportsByPolicyIDConfig}>('@libs/actions/OnyxDerived/configs/outstandingReportsByPolicyID');
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

/** An expense report that qualifies for the outstanding map. */
function createOutstandingReport(index: number, reportID: string, policyID: string): Report {
    return {
        ...createRandomReport(index),
        reportID,
        policyID,
        type: CONST.REPORT.TYPE.EXPENSE,
        stateNum: CONST.REPORT.STATE_NUM.OPEN,
        statusNum: CONST.REPORT.STATUS_NUM.OPEN,
        pendingFields: undefined,
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
        const reportA = createOutstandingReport(1, 'rA', 'p1');
        const reportB = createOutstandingReport(2, 'rB', 'p1');

        // Establish a baseline: report rA tracked for policy p1.
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}rA`, reportA);
        await waitForBatchedUpdates();

        // Change rA's total, but make this flush's compute throw. The delta must not be lost.
        mockShouldThrowCompute = true;
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}rA`, {total: 999});
        await waitForBatchedUpdates();

        // The failed flush did not persist anything.
        let derived = await OnyxUtils.get(ONYXKEYS.DERIVED.OUTSTANDING_REPORTS_BY_POLICY_ID);
        expect(derived?.p1?.[`${ONYXKEYS.COLLECTION.REPORT}rA`]?.total).toBe(reportA.total);

        // A later, unrelated change triggers a successful flush that must include the previously-failed delta.
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}rB`, reportB);
        await waitForBatchedUpdates();

        derived = await OnyxUtils.get(ONYXKEYS.DERIVED.OUTSTANDING_REPORTS_BY_POLICY_ID);
        // rA's total change (from the failed flush) is recovered, and rB is added.
        expect(derived?.p1?.[`${ONYXKEYS.COLLECTION.REPORT}rA`]?.total).toBe(999);
        expect(derived?.p1?.[`${ONYXKEYS.COLLECTION.REPORT}rB`]).toBeTruthy();
    });
});
