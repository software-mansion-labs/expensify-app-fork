import {useRef, useState} from 'react';
import {Gesture} from 'react-native-gesture-handler';
import type {SharedValue} from 'react-native-reanimated';
import {useAnimatedReaction, useAnimatedStyle, useDerivedValue} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import {TOOLTIP_BAR_GAP} from '@components/Charts/constants';
import {useChartInteractionState} from './useChartInteractionState';

const INITIAL_INTERACTION_STATE = {x: 0, y: {y: 0}};

type HitTestArgs = {
    cursorX: number;
    cursorY: number;
    targetX: number;
    targetY: number;
    chartBottom: number;
};

type UseChartInteractionsProps = {
    handlePress: (index: number) => void;
    checkIsOver: (args: HitTestArgs) => boolean;
    barGeometry?: SharedValue<{barWidth: number; chartBottom: number; yZero: number}>;
};

type CartesianActionsHandle = {
    handleTouch: (state: unknown, x: number, y: number) => void;
};

function useChartInteractions({handlePress, checkIsOver, barGeometry}: UseChartInteractionsProps) {
    const {state: chartInteractionState, isActive: isTooltipActiveState} = useChartInteractionState(INITIAL_INTERACTION_STATE);

    const [activeDataIndex, setActiveDataIndex] = useState(-1);
    const [isOverTarget, setIsOverTarget] = useState(false);

    const actionsRef = useRef<CartesianActionsHandle>(null);

    const handleTouchWorklet = useDerivedValue(() => {
        return actionsRef.current?.handleTouch;
    });

    const isCursorOverTarget = useDerivedValue(() => {
        'worklet';

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

    const hoverGesture = Gesture.Hover()
        .onBegin((e) => {
            'worklet';

            chartInteractionState.isActive.set(true);
            chartInteractionState.cursor.x.set(e.x);
            chartInteractionState.cursor.y.set(e.y);

            const touchFn = handleTouchWorklet.get();
            if (touchFn) {
                touchFn(chartInteractionState, e.x, e.y);
            }
        })
        .onUpdate((e) => {
            'worklet';

            chartInteractionState.cursor.x.set(e.x);
            chartInteractionState.cursor.y.set(e.y);

            const touchFn = handleTouchWorklet.get();
            if (touchFn) {
                touchFn(chartInteractionState, e.x, e.y);
            }
        })
        .onEnd(() => {
            'worklet';

            chartInteractionState.isActive.set(false);
        });

    const tapGesture = Gesture.Tap().onEnd((e) => {
        'worklet';

        chartInteractionState.cursor.x.set(e.x);
        chartInteractionState.cursor.y.set(e.y);

        const touchFn = handleTouchWorklet.get();
        if (touchFn) {
            touchFn(chartInteractionState, e.x, e.y);
        }

        const matchedIndex = chartInteractionState.matchedIndex.get();
        if (matchedIndex >= 0 && isCursorOverTarget.get()) {
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
            transform: [{translateX: '-50%'}, {translateY: '-100%'}],
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

export {useChartInteractions};
export type {HitTestArgs};
