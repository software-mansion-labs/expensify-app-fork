import {getPathsFromEvents} from 'xstate/graph';
import mfaMachine from '@components/MultifactorAuthentication/machine/mfaMachine';
import CONST from '@src/CONST';
import createInitEvent from '../../../utils/mfa/flowFixtures';

const MFA_STATE = CONST.MULTIFACTOR_AUTHENTICATION.MFA_STATE;

describe('the MFA modal runs its full lifecycle', () => {
    it('walks launch -> success -> closing -> closed from a fixed event sequence', () => {
        const [path] = getPathsFromEvents(mfaMachine, [createInitEvent(), {type: 'CLOSE_MODAL'}, {type: 'MODAL_CLOSED'}]);
        const visitedStates = path?.steps.map((step) => step.state) ?? [];

        expect(visitedStates.some((state) => state.matches({[MFA_STATE.OPEN]: {[MFA_STATE.OUTCOME]: MFA_STATE.SUCCESS}}))).toBe(true);
        expect(visitedStates.some((state) => state.matches(MFA_STATE.CLOSING))).toBe(true);
        expect(path?.state.matches(MFA_STATE.CLOSED)).toBe(true);
    });
});
