import {useState} from 'react';
import type {SharedValue} from 'react-native-reanimated';
import {makeMutable, useAnimatedReaction} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';

/**
 * Input field type - matches Victory Native's InputFieldType
 */
type InputFieldType = string | number | Date;

/**
 * Initial values for chart interaction state
 */
type ChartInteractionStateInit = {
    x: InputFieldType;
    y: Record<string, number>;
};

/**
 * Chart interaction state structure - compatible with Victory's handleTouch function
 */
type ChartInteractionState<Init extends ChartInteractionStateInit> = {
    /** Whether interaction (hover/press) is currently active */
    isActive: SharedValue<boolean>;
    /** Index of the matched data point (-1 if none) */
    matchedIndex: SharedValue<number>;
    /** X-axis value and position */
    x: {
        value: SharedValue<Init['x']>;
        position: SharedValue<number>;
    };
    /** Y-axis values and positions for each y key */
    y: Record<
        keyof Init['y'],
        {
            value: SharedValue<number>;
            position: SharedValue<number>;
        }
    >;
    /** Y index for stacked bar charts */
    yIndex: SharedValue<number>;
    /** Raw cursor position */
    cursor: {
        x: SharedValue<number>;
        y: SharedValue<number>;
    };
};

/**
 * Hook to track whether interaction is active as React state
 */
function useIsInteractionActive<Init extends ChartInteractionStateInit>(state: ChartInteractionState<Init>): boolean {
    const [isInteractionActive, setIsInteractionActive] = useState(() => state.isActive.get());

    useAnimatedReaction(
        () => state.isActive.get(),
        (val, oldVal) => {
            if (val === oldVal) {
                return;
            }
            scheduleOnRN(setIsInteractionActive, val);
        },
    );

    return isInteractionActive;
}

/**
 * Creates shared state for chart interactions (hover, tap, press).
 * Compatible with Victory Native's handleTouch function exposed via actionsRef.
 *
 * @param initialValues - Initial x and y values matching your chart data structure
 * @returns Object containing the interaction state and a boolean indicating if interaction is active
 */
function useChartInteractionState<Init extends ChartInteractionStateInit>(
    initialValues: Init,
): {
    state: ChartInteractionState<Init>;
    isActive: boolean;
} {
    // The React Compiler will automatically memoize this object creation.
    // We remove the explicit useMemo and dependency on 'keys'.
    const yState = {} as Record<keyof Init['y'], {value: SharedValue<number>; position: SharedValue<number>}>;

    for (const [key, initVal] of Object.entries(initialValues.y)) {
        yState[key as keyof Init['y']] = {
            value: makeMutable(initVal),
            position: makeMutable(0),
        };
    }

    const state: ChartInteractionState<Init> = {
        isActive: makeMutable(false),
        matchedIndex: makeMutable(-1),
        x: {
            value: makeMutable(initialValues.x),
            position: makeMutable(0),
        },
        y: yState,
        yIndex: makeMutable(-1),
        cursor: {
            x: makeMutable(0),
            y: makeMutable(0),
        },
    };

    const isActive = useIsInteractionActive(state);

    return {state, isActive};
}

export {useChartInteractionState};
export type {ChartInteractionState, ChartInteractionStateInit};
