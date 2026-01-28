import { useRef, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { useAnimatedReaction, useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { TOOLTIP_BAR_GAP } from '@components/Charts/constants';
import { useChartInteractionState } from './useChartInteractionState';

/**
 * Arguments passed to the checkIsOver callback for hit-testing
 */
type HitTestArgs = {
    /** Current raw X position of the cursor */
    cursorX: number;
    /** Current raw Y position of the cursor */
    cursorY: number;
    /** Calculated X position of the matched data point */
    targetX: number;
    /** Calculated Y position of the matched data point */
    targetY: number;
    /** The bottom boundary of the chart area */
    chartBottom: number;
};

/**
 * Configuration for the chart interactions hook
 */
type UseChartInteractionsProps = {
    /** Callback triggered when a valid data point is tapped/clicked */
    handlePress: (index: number) => void;
    /**
     * Worklet function to determine if the cursor is technically "hovering"
     * over a specific chart element (e.g., within a bar's width or a point's radius).
     */
    checkIsOver: (args: HitTestArgs) => boolean;
    /** Optional shared value containing bar dimensions used for hit-testing in bar charts */
    barGeometry?: SharedValue<{ barWidth: number; chartBottom: number; yZero: number }>;
};

/**
 * Type for Victory's actionsRef handle.
 * Used to manually trigger Victory's internal touch handling logic.
 */
type CartesianActionsHandle = {
    handleTouch: (state: unknown, x: number, y: number) => void;
};

/**
 * Hook to manage complex chart interactions including hover gestures (web),
 * tap gestures (mobile/web), hit-testing, and animated tooltip positioning.
 *
 * It synchronizes high-frequency interaction data from the UI thread to React state
 * for metadata display (like tooltips) and navigation.
 *
 * @param props - Configuration including press handlers and hit-test logic.
 * @returns An object containing refs, gestures, and state for the chart component.
 *
 * @example
 * ```tsx
 * const { actionsRef, customGestures, activeDataIndex, isTooltipActive, tooltipStyle } = useChartInteractions({
 * handlePress: (index) => console.log("Pressed index:", index),
 * checkIsOver: ({ cursorX, targetX, barWidth }) => {
 * 'worklet';
 * return Math.abs(cursorX - targetX) < barWidth / 2;
 * },
 * barGeometry: myBarSharedValue,
 * });
 *
 * return (
 * <View>
 * <CartesianChart customGestures={customGestures} actionsRef={actionsRef} ... />
 * {isTooltipActive && <Animated.View style={tooltipStyle}><Tooltip index={activeDataIndex} /></Animated.View>}
 * </View>
 * );
 * ```
 */
function useChartInteractions({ handlePress, checkIsOver, barGeometry }: UseChartInteractionsProps) {
    const { state: chartInteractionState, isActive: isTooltipActiveState } = useChartInteractionState({ x: 0, y: { y: 0 } });
    const actionsRef = useRef<CartesianActionsHandle>(null);

    const [activeDataIndex, setActiveDataIndex] = useState(-1);
    const [isOverTarget, setIsOverTarget] = useState(false);

    const isCursorOverTarget = useDerivedValue(() => {
        const cursorX = chartInteractionState.cursor.x.get();
        const cursorY = chartInteractionState.cursor.y.get();
        const targetX = chartInteractionState.x.position.get();
        const targetY = chartInteractionState.y.y.position.get();
        const chartBottom = barGeometry?.get().chartBottom ?? 0;

        return checkIsOver({
            cursorX,
            cursorY,
            targetX,
            targetY,
            chartBottom,
        });
    });

    useAnimatedReaction(
        () => chartInteractionState.matchedIndex.get(),
        (currentIndex) => {
            scheduleOnRN(setActiveDataIndex, currentIndex);
        },
    );

    useAnimatedReaction(
        () => isCursorOverTarget.get(),
        (isOver) => {
            scheduleOnRN(setIsOverTarget, isOver);
        },
    );

    // React Compiler automatycznie zmemoizuje te obiekty gestów
    const hoverGesture = Gesture.Hover()
        .onBegin((e) => {
            'worklet';

            chartInteractionState.isActive.set(true);
            chartInteractionState.cursor.x.set(e.x);
            chartInteractionState.cursor.y.set(e.y);
            actionsRef.current?.handleTouch(chartInteractionState, e.x, e.y);
        })
        .onUpdate((e) => {
            'worklet';

            chartInteractionState.cursor.x.set(e.x);
            chartInteractionState.cursor.y.set(e.y);
            actionsRef.current?.handleTouch(chartInteractionState, e.x, e.y);
        })
        .onEnd(() => {
            'worklet';

            chartInteractionState.isActive.set(false);
        });

    const tapGesture = Gesture.Tap().onEnd((e) => {
        'worklet';

        chartInteractionState.cursor.x.set(e.x);
        chartInteractionState.cursor.y.set(e.y);

        actionsRef.current?.handleTouch(chartInteractionState, e.x, e.y);
        const matchedIndex = chartInteractionState.matchedIndex.get();
        const isOver = isCursorOverTarget.get();

        if (matchedIndex >= 0 && isOver) {
            scheduleOnRN(handlePress, matchedIndex);
        }
    });

    const customGestures = Gesture.Race(hoverGesture, tapGesture);

    const tooltipStyle = useAnimatedStyle(() => {
        const posX = chartInteractionState.x.position.get();
        const targetY = chartInteractionState.y.y.position.get();
        const yZero = barGeometry?.get().yZero ?? targetY;
        const barTopY = Math.min(targetY, yZero);

        const isVisible = chartInteractionState.isActive.get() && isCursorOverTarget.get();

        return {
            position: 'absolute',
            left: posX,
            top: barTopY - TOOLTIP_BAR_GAP,
            transform: [{ translateX: '-50%' }, { translateY: '-100%' }],
            opacity: isVisible ? 1 : 0,
        };
    });

    return {
        actionsRef,
        customGestures,
        activeDataIndex,
        isTooltipActive: isTooltipActiveState && isOverTarget,
        tooltipStyle,
    };
}

export { useChartInteractions };
export type { HitTestArgs };
