import {snapshotToState} from '@components/MultifactorAuthentication/machine';
import CONST from '@src/CONST';
import createInitEvent, {MFA_TEST_SCENARIO_NAME} from '../../../utils/mfa/flowFixtures';
import createMfaTestActor from '../../../utils/mfa/machineUnderTest';

const MFA_STATE = CONST.MULTIFACTOR_AUTHENTICATION.MFA_STATE;

describe('consumers read the modal state from the machine', () => {
    it('derives modalState from the machine state and flattens the context', () => {
        const {actor} = createMfaTestActor();
        expect(snapshotToState(actor.getSnapshot()).modalState).toBe(MFA_STATE.CLOSED);

        actor.send(createInitEvent());

        const state = snapshotToState(actor.getSnapshot());
        expect(state.modalState).toBe(MFA_STATE.OPEN);
        expect(state.scenarioName).toBe(MFA_TEST_SCENARIO_NAME);
    });
});
