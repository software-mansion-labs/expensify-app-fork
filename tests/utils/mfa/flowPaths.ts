import {matchesState} from 'xstate';
import type {SnapshotFrom} from 'xstate';
import {getPathsFromEvents, getSimplePaths} from 'xstate/graph';
import mfaMachine from '@components/MultifactorAuthentication/machine/mfaMachine';
import type {MfaEvent} from '@components/MultifactorAuthentication/machine/types';
import createInitEvent from './flowFixtures';
import {toStateValue} from './reachableStates';

/**
 * A small `createTestModel`-style harness over `xstate/graph`'s plain path generators: each path
 * exposes `path.test({events, states})`, which replays the path through the real UI (drive the
 * matching event executor at each step, then run every matching state assertion).
 *
 * Why not the real `createTestModel`? Its constructor calls `validateMachine`, which throws "After
 * events on test machines are not supported", and `mfaMachine.closing` has an `after` (closeFallback)
 * transition. The plain generators have no such restriction.
 *
 * Paths are generated WITHOUT a pinned event list, so the graph synthesizes an event for every
 * transition the machine declares and auto-discovers new (sub)states as the chart grows. Each step's
 * `state` is the deepest settled configuration (e.g. `open.outcome.success`), so the `states` map
 * routes by `matchesState` and can assert at any depth - transient routers (`always`/`initial` such
 * as `preparing`/`outcome`) are passed through and never become their own node.
 */

type MfaSnapshot = SnapshotFrom<typeof mfaMachine>;

/** UI action that produces a machine event - an `events` map entry passed to `path.test`. */
type MfaEventExecutor = () => void | Promise<void>;

/** Assertion run when the walk reaches a matching state - a `states` map entry passed to `path.test`. */
type MfaStateAssertion = (state: MfaSnapshot) => void | Promise<void>;

type MfaPathTestConfig = {
    events: Partial<Record<MfaEvent['type'], MfaEventExecutor>>;
    /** Keyed by dot-path state value (e.g. `open.outcome.success`), matched against each step with `matchesState`. */
    states: Record<string, MfaStateAssertion>;
};

type RawPath = {
    state: MfaSnapshot;
    steps: ReadonlyArray<{state: MfaSnapshot; event: {type: string}}>;
};

type MfaTestPath = {
    /** Final-state snapshot, e.g. for `JSON.stringify(path.state.value)` test names. */
    state: MfaSnapshot;
    /** The driven event sequence, e.g. `INIT -> CLOSE_MODAL`. */
    description: string;
    /** Walks the path: for each step, runs the matching event executor then asserts every matching state. */
    test: (config: MfaPathTestConfig) => Promise<void>;
};

// INIT carries the real scenario payload; CLOSE_MODAL/MODAL_CLOSED are bare. Used only for the explicit
// teardown lap (getLifecyclePaths); simple paths auto-discover events from the chart.
const DRIVING_EVENTS: MfaEvent[] = [createInitEvent(), {type: 'CLOSE_MODAL'}, {type: 'MODAL_CLOSED'}];
const INIT_STEP_EVENT_TYPE = 'xstate.init';
const DELAYED_EVENT_PREFIX = 'xstate.after';

// Delayed (`after`) transitions are timers, not gestures - drop any path that would need to fire one.
// The closing -> closed teardown they cover is driven explicitly via MODAL_CLOSED in getLifecyclePaths.
function isGestureDrivablePath(path: RawPath): boolean {
    return path.steps.every((step) => !step.event.type.startsWith(DELAYED_EVENT_PREFIX));
}

async function assertMatchingStates(snapshot: MfaSnapshot, states: MfaPathTestConfig['states']): Promise<void> {
    for (const [stateValue, assertState] of Object.entries(states)) {
        if (matchesState(toStateValue(stateValue.split('.')), snapshot.value)) {
            await assertState(snapshot);
        }
    }
}

function wrapPath(graphPath: RawPath): MfaTestPath {
    const drivenEventTypes = graphPath.steps.map((step) => step.event.type).filter((type) => type !== INIT_STEP_EVENT_TYPE);

    return {
        state: graphPath.state,
        description: drivenEventTypes.length > 0 ? drivenEventTypes.join(' -> ') : '(initial state)',
        test: async ({events, states}) => {
            const executorByEventType: Partial<Record<string, MfaEventExecutor>> = events;
            for (const step of graphPath.steps) {
                if (step.event.type !== INIT_STEP_EVENT_TYPE) {
                    const executeEvent = executorByEventType[step.event.type];
                    if (!executeEvent) {
                        throw new Error(`No event executor provided for "${step.event.type}"`);
                    }
                    await executeEvent();
                }
                await assertMatchingStates(step.state, states);
            }
        },
    };
}

function toTestPaths(rawPaths: RawPath[]): MfaTestPath[] {
    return rawPaths.filter(isGestureDrivablePath).map(wrapPath);
}

function createMfaTestModel() {
    return {
        getSimplePaths: (): MfaTestPath[] => toTestPaths(getSimplePaths(mfaMachine)),
        // The full teardown lap (... -> MODAL_CLOSED -> closed) that simple paths skip because it revisits `closed`.
        getLifecyclePaths: (): MfaTestPath[] => toTestPaths(getPathsFromEvents(mfaMachine, DRIVING_EVENTS)),
    };
}

export default createMfaTestModel;
export type {MfaPathTestConfig, MfaTestPath};
