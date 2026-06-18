import CONST from '@src/CONST';
import createMfaTestActor from '../../utils/mfa/createMfaTestActor';
import createInitEvent, {MFA_TEST_SCENARIO_NAME} from '../../utils/mfa/mfaTestFixtures';

const MFA_STATE = CONST.MULTIFACTOR_AUTHENTICATION.MFA_STATE;

describe('mfaMachine', () => {
    it('opens to the success outcome and marks the flow complete on INIT', () => {
        const {actor, spies} = createMfaTestActor();

        actor.send(createInitEvent());

        const snapshot = actor.getSnapshot();
        expect(snapshot.matches({[MFA_STATE.OPEN]: {[MFA_STATE.OUTCOME]: MFA_STATE.SUCCESS}})).toBe(true);
        expect(snapshot.context.isFlowComplete).toBe(true);
        expect(snapshot.context.scenarioName).toBe(MFA_TEST_SCENARIO_NAME);
        expect(spies.navigateToSuccessOutcome).toHaveBeenCalledTimes(1);
    });
});
