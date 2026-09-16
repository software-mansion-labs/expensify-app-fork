import getReturnValue from '@libs/getReturnValue';
import mergeRefs from '@libs/mergeRefs';

import CONST from '@src/CONST';

import {cloneElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {DeviceEventEmitter} from 'react-native';

import type HoverableProps from './types';

type ActiveHoverableProps = Omit<HoverableProps, 'disabled'>;

type MouseEvents = 'onMouseEnter' | 'onMouseLeave' | 'onMouseMove';

type OnMouseEvents = Record<MouseEvents, (e: React.MouseEvent) => void>;

function ActiveHoverable({onHoverIn, onHoverOut, shouldHandleScroll, isFocused = true, shouldFreezeCapture, shouldUseNativeHoverEvents = false, children, ref}: ActiveHoverableProps) {
    const [isHovered, setIsHovered] = useState(false);
    const elementRef = useRef<HTMLElement | null>(null);
    const isScrollingRef = useRef(false);
    const isHoveredRef = useRef(false);
    const isVisibilityHidden = useRef(false);
    // Consumers pass fresh onHoverIn/onHoverOut closures every render; read them at event time so the handlers we
    // clone onto the child (and the scroll listener) stay stable and the child can bail out.
    const latestHandlers = {onHoverIn, onHoverOut};
    const latest = useRef(latestHandlers);
    useLayoutEffect(() => {
        latest.current = latestHandlers;
    });

    const updateIsHovered = useCallback(
        (hovered: boolean) => {
            if (shouldFreezeCapture) {
                return;
            }

            isHoveredRef.current = hovered;
            isVisibilityHidden.current = false;

            if (shouldHandleScroll && isScrollingRef.current) {
                return;
            }

            setIsHovered(hovered);

            if (hovered) {
                latest.current.onHoverIn?.();
            } else {
                latest.current.onHoverOut?.();
            }
        },
        [shouldHandleScroll, shouldFreezeCapture, latest],
    );

    useEffect(() => {
        if (!shouldHandleScroll) {
            return;
        }

        const scrollingListener = DeviceEventEmitter.addListener(CONST.EVENTS.SCROLLING, (scrolling: boolean) => {
            isScrollingRef.current = scrolling;
            if (scrolling && isHoveredRef.current) {
                isHoveredRef.current = false;
                setIsHovered(false);
                latest.current.onHoverOut?.();
            } else if (!scrolling && elementRef.current?.matches(':hover')) {
                isHoveredRef.current = true;
                setIsHovered(true);
                latest.current.onHoverIn?.();
            }
        });

        return () => scrollingListener.remove();
    }, [shouldHandleScroll, latest]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                isVisibilityHidden.current = true;
                setIsHovered(false);
            } else {
                isVisibilityHidden.current = false;
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    useEffect(() => {
        if (isFocused) {
            return;
        }
        setIsHovered(false);
    }, [isFocused]);

    const handleMouseEvents = useCallback(
        (type: 'enter' | 'leave') => () => {
            if (shouldFreezeCapture) {
                return;
            }

            const newHoverState = type === 'enter';
            isHoveredRef.current = newHoverState;
            isVisibilityHidden.current = false;

            updateIsHovered(newHoverState);
        },
        [shouldFreezeCapture, updateIsHovered],
    );

    useEffect(() => {
        const element = elementRef.current;
        if (!shouldUseNativeHoverEvents || !element) {
            return;
        }
        const handleNativeEnter = handleMouseEvents('enter');
        const handleNativeLeave = handleMouseEvents('leave');
        element.addEventListener('mouseenter', handleNativeEnter);
        element.addEventListener('mouseleave', handleNativeLeave);
        return () => {
            element.removeEventListener('mouseenter', handleNativeEnter);
            element.removeEventListener('mouseleave', handleNativeLeave);
        };
    }, [shouldUseNativeHoverEvents, handleMouseEvents]);

    const child = useMemo(() => getReturnValue(children, isHovered), [children, isHovered]);

    const {onMouseEnter, onMouseLeave} = child.props as OnMouseEvents;

    return cloneElement(child, {
        ref: mergeRefs(elementRef, ref, child.props.ref),
        onMouseEnter: (e: React.MouseEvent) => {
            if (!shouldUseNativeHoverEvents) {
                handleMouseEvents('enter')();
            }
            onMouseEnter?.(e);
        },
        onMouseLeave: (e: React.MouseEvent) => {
            if (!shouldUseNativeHoverEvents) {
                handleMouseEvents('leave')();
            }
            onMouseLeave?.(e);
        },
    } as React.HTMLAttributes<HTMLElement>);
}

export default ActiveHoverable;
