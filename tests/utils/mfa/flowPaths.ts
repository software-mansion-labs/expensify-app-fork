import {matchesState} from 'xstate';
import {getShortestPaths, TestModel} from 'xstate/graph';
import mfaMachine from '@components/MultifactorAuthentication/machine/mfaMachine';
import type {MfaEvent} from '@components/MultifactorAuthentication/machine/types';
import createInitEvent from './flowFixtures';

// This list adds the explicit teardown path and is not the coverage source.
// `INIT` carries the scenario payload, while `CLOSE_MODAL` and `MODAL_CLOSED` are bare.
const DRIVING_EVENTS: MfaEvent[] = [createInitEvent(), {type: 'CLOSE_MODAL'}, {type: 'MODAL_CLOSED'}];
const INIT_STEP_EVENT_TYPE = 'xstate.init';
const DELAYED_EVENT_PREFIX = 'xstate.after';
const ACTOR_DONE_EVENT_PREFIX = 'xstate.done.actor.';
const ACTOR_ERROR_EVENT_PREFIX = 'xstate.error.actor.';
const UI_UNPRODUCIBLE_EVENT_TYPES = new Set<string>(['SET_ERROR']);

type ActorOutcome = 'resolve' | 'reject';
type PathSteps = ReadonlyArray<{event: {type: string}}>;

function isAutoDrivenEvent(eventType: string): boolean {
    return eventType === INIT_STEP_EVENT_TYPE || eventType.startsWith(ACTOR_DONE_EVENT_PREFIX) || eventType.startsWith(ACTOR_ERROR_EVENT_PREFIX);
}

/**
 * Derives the outcome each invoked actor must produce from the graph path. This keeps the walk generic:
 * adding another actor only requires a corresponding mock implementation.
 */
function getActorOutcomes(steps: PathSteps): Record<string, ActorOutcome> {
    const outcomes: Record<string, ActorOutcome> = {};
    for (const step of steps) {
        const {type} = step.event;
        if (type.startsWith(ACTOR_DONE_EVENT_PREFIX)) {
            outcomes[type.slice(ACTOR_DONE_EVENT_PREFIX.length)] = 'resolve';
        } else if (type.startsWith(ACTOR_ERROR_EVENT_PREFIX)) {
            outcomes[type.slice(ACTOR_ERROR_EVENT_PREFIX.length)] = 'reject';
        }
    }
    return outcomes;
}

// Timers and SET_ERROR have no UI gesture in this walk. Actor completion events are auto-driven by
// promise settlement and remain in the path so their expected outcomes can configure the actor mocks.
function isUiDrivablePath(path: {steps: PathSteps}): boolean {
    return path.steps.every((step) => !step.event.type.startsWith(DELAYED_EVENT_PREFIX) && !UI_UNPRODUCIBLE_EVENT_TYPES.has(step.event.type));
}

// `createTestModel` rejects the machine's `after` transition, so this uses the constructor directly.
// The custom matcher lets state assertion keys use dot paths such as `open.outcome.success`.
const mfaTestModel = new TestModel(mfaMachine, {
    stateMatcher: (state, stateValue) => matchesState(stateValue, state.value),
});

/**
 * Returns the shortest coverage paths and the explicit teardown path, because the shortest path to the
 * initial `closed` state contains no events. Duplicate paths are retained so every settleable leaf remains
 * a path endpoint.
 *
 * `getShortestPaths` synthesizes an event for every transition the machine declares, so new transitions are
 * covered without editing here, and pinning an explicit `events` list could silently skip one. `path.test`
 * skips a step whose event has no executor, which keeps framework steps such as `xstate.init` and actor
 * completion harmless. Paths that need a timer or a standalone `SET_ERROR` are not UI-drivable and are
 * excluded; the failure state remains covered through the device-check actor's error path.
 */
function getWalkedPaths() {
    return [...mfaTestModel.getPaths((logic) => getShortestPaths(logic), {allowDuplicatePaths: true}), ...mfaTestModel.getPathsFromEvents(DRIVING_EVENTS)].filter(isUiDrivablePath);
}

export default getWalkedPaths;
export {getActorOutcomes, isAutoDrivenEvent};
export type {ActorOutcome};
