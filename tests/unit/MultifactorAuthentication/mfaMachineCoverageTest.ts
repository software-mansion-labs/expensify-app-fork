import {matchesState} from 'xstate';
import {getPathsFromEvents, getShortestPaths} from 'xstate/graph';
import mfaMachine from '@components/MultifactorAuthentication/machine/mfaMachine';
import CONST from '@src/CONST';
import getSettleableLeafStates from '../../utils/mfa/machineStates';
import createInitEvent from '../../utils/mfa/mfaTestFixtures';

const MFA_STATE = CONST.MULTIFACTOR_AUTHENTICATION.MFA_STATE;

describe('mfaMachine', () => {
    // No `events`: getShortestPaths synthesizes a bare event for every transition the machine declares,
    // so new events reach new states automatically. Pass `events` only to supply a payload a guard needs.
    const reachableSnapshots = getShortestPaths(mfaMachine).map((path) => path.state);

    it.each(getSettleableLeafStates(mfaMachine))('reaches the $description state', ({value}) => {
        expect(reachableSnapshots.some((snapshot) => matchesState(value, snapshot.value))).toBe(true);
    });

    it('runs the whole main path from a fixed event sequence: launch -> success -> close -> torn down', () => {
        const [path] = getPathsFromEvents(mfaMachine, [createInitEvent(), {type: 'CLOSE_MODAL'}, {type: 'MODAL_CLOSED'}]);
        const visitedStates = path?.steps.map((step) => step.state) ?? [];

        expect(visitedStates.some((state) => state.matches({[MFA_STATE.OPEN]: {[MFA_STATE.OUTCOME]: MFA_STATE.SUCCESS}}))).toBe(true);
        expect(visitedStates.some((state) => state.matches(MFA_STATE.CLOSING))).toBe(true);
        expect(path?.state.matches(MFA_STATE.CLOSED)).toBe(true);
    });
});
