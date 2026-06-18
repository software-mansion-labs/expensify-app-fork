import {act, renderHook} from '@testing-library/react-native';
import {useMachine} from '@xstate/react';
import {getShortestPaths} from 'xstate/graph';
import {snapshotToState} from '@components/MultifactorAuthentication/machine';
import mfaMachine from '@components/MultifactorAuthentication/machine/mfaMachine';
import {buildMfaTestMachine, createMfaActionSpies} from '../../utils/mfa/createMfaTestActor';
import createInitEvent from '../../utils/mfa/mfaTestFixtures';

const testMachine = buildMfaTestMachine(createMfaActionSpies());

// xstate prepends an internal `xstate.init` step to every path; only events listed here are replayed.
const drivenEventTypes = new Set<string>(['INIT']);

// createTestModel rejects machines with `after` transitions, so paths come from getShortestPaths and
// are replayed against the machine running through the @xstate/react adapter the Provider uses.
describe('mfaMachine view-layer contract', () => {
    const paths = getShortestPaths(mfaMachine, {events: [createInitEvent()]});

    it.each(paths.map((path) => [JSON.stringify(path.state.value), path] as const))('view-layer state matches the machine on path -> %s', (_label, path) => {
        const {result} = renderHook(() => useMachine(testMachine));

        for (const step of path.steps) {
            if (drivenEventTypes.has(step.event.type)) {
                act(() => result.current[1](step.event));
            }
            expect(snapshotToState(result.current[0]).modalState).toBe(snapshotToState(step.state).modalState);
        }
    });
});
