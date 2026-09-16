import type PressableProps from '@components/Pressable/GenericPressable/types';

import useKeyboardShortcut from '@hooks/useKeyboardShortcut';
import useRouteKey from '@hooks/useRouteKey';
import useSingleExecution from '@hooks/useSingleExecution';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';

import Accessibility from '@libs/Accessibility';
import HapticFeedback from '@libs/HapticFeedback';
import mergeRefs from '@libs/mergeRefs';
import {notifyPressedTrigger, registerPressable} from '@libs/NavigationFocusReturn';

import CONST from '@src/CONST';
import {childrenEqual, shallowEqualObjects, styleEqual} from '@src/utils/referenceEquality';

import type {GestureResponderEvent, MouseEvent, PressableStateCallbackType, View, ViewStyle} from 'react-native';
import type {ValueOf} from 'type-fest';

import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
// eslint-disable-next-line no-restricted-imports
import {Pressable} from 'react-native';

// Shared frozen default: a fresh `{}` per render used to invalidate every memoized value derived from these styles.
const EMPTY_STYLE: ViewStyle = CONST.EMPTY_OBJECT;

type StableInputs = Pick<PressableProps, 'style' | 'disabledStyle' | 'hoverStyle' | 'focusStyle' | 'pressStyle' | 'screenReaderActiveStyle' | 'dataSet' | 'accessibilityState' | 'children'>;

/**
 * Parents recreate styles, dataSet, accessibilityState and children elements with identical content on nearly every
 * render. Keep the previous reference of each such prop while its content is unchanged, so everything derived from it
 * (and the memoized react-native-web Pressable below) can bail out. "Storing information from previous renders"
 * pattern: a real change costs one extra render pass, an unchanged prop costs one comparison.
 */
function useStablePressableInputs(next: StableInputs): StableInputs {
    const [stable, setStable] = useState(next);
    if (stable === next) {
        return next;
    }
    const merged: StableInputs = {
        style: styleEqual(stable.style, next.style) ? stable.style : next.style,
        disabledStyle: styleEqual(stable.disabledStyle, next.disabledStyle) ? stable.disabledStyle : next.disabledStyle,
        hoverStyle: styleEqual(stable.hoverStyle, next.hoverStyle) ? stable.hoverStyle : next.hoverStyle,
        focusStyle: styleEqual(stable.focusStyle, next.focusStyle) ? stable.focusStyle : next.focusStyle,
        pressStyle: styleEqual(stable.pressStyle, next.pressStyle) ? stable.pressStyle : next.pressStyle,
        screenReaderActiveStyle: styleEqual(stable.screenReaderActiveStyle, next.screenReaderActiveStyle) ? stable.screenReaderActiveStyle : next.screenReaderActiveStyle,
        dataSet: shallowEqualObjects(stable.dataSet, next.dataSet) ? stable.dataSet : next.dataSet,
        accessibilityState: shallowEqualObjects(stable.accessibilityState, next.accessibilityState) ? stable.accessibilityState : next.accessibilityState,
        children: typeof next.children === 'function' || childrenEqual(stable.children, next.children) ? stable.children : next.children,
    };
    const isUnchanged =
        merged.style === stable.style &&
        merged.disabledStyle === stable.disabledStyle &&
        merged.hoverStyle === stable.hoverStyle &&
        merged.focusStyle === stable.focusStyle &&
        merged.pressStyle === stable.pressStyle &&
        merged.screenReaderActiveStyle === stable.screenReaderActiveStyle &&
        merged.dataSet === stable.dataSet &&
        merged.accessibilityState === stable.accessibilityState &&
        merged.children === stable.children;
    // A render-function child is a fresh closure every render and can never be deduplicated: hand it through as is
    // without storing it, so it does not force the extra render pass of the state update.
    const children = typeof next.children === 'function' ? next.children : merged.children;
    if (isUnchanged) {
        return children === stable.children ? stable : {...stable, children};
    }
    setStable(merged);
    return children === merged.children ? merged : {...merged, children};
}

function GenericPressable({
    children: childrenProp,
    onPress,
    onLongPress,
    onKeyDown,
    disabled,
    style: styleProp,
    disabledStyle: disabledStyleProp = EMPTY_STYLE,
    hoverStyle: hoverStyleProp = EMPTY_STYLE,
    focusStyle: focusStyleProp = EMPTY_STYLE,
    pressStyle: pressStyleProp = EMPTY_STYLE,
    screenReaderActiveStyle: screenReaderActiveStyleProp = EMPTY_STYLE,
    shouldUseHapticsOnLongPress = true,
    shouldUseHapticsOnPress = false,
    nextFocusRef,
    keyboardShortcut,
    shouldUseAutoHitSlop = false,
    enableInScreenReaderStates = CONST.SCREEN_READER_STATES.ALL,
    onPressIn,
    onPressOut,
    accessible = true,
    fullDisabled = false,
    interactive = true,
    isNested = false,
    ref,
    dataSet: dataSetProp,
    forwardedFSClass,
    accessibilityState: accessibilityStateProp,
    ...rest
}: PressableProps) {
    const {style, disabledStyle, hoverStyle, focusStyle, pressStyle, screenReaderActiveStyle, dataSet, accessibilityState, children} = useStablePressableInputs({
        style: styleProp,
        disabledStyle: disabledStyleProp,
        hoverStyle: hoverStyleProp,
        focusStyle: focusStyleProp,
        pressStyle: pressStyleProp,
        screenReaderActiveStyle: screenReaderActiveStyleProp,
        dataSet: dataSetProp,
        accessibilityState: accessibilityStateProp,
        children: childrenProp,
    });
    // Handlers are read through this ref at event time, so the functions handed to <Pressable> keep their identity
    // no matter how often parents recreate theirs. Only their presence is reactive. The ref must come from useRef
    // right here (not from a custom hook): React Compiler only knows to leave `.current` out of memo dependencies
    // for refs it can see being created. Refs must not be written during render, hence the layout effect.
    const latestHandlers = {onPress, onLongPress, onKeyDown, onPressIn, onPressOut, onHoverIn: rest.onHoverIn, onHoverOut: rest.onHoverOut};
    const latest = useRef(latestHandlers);
    useLayoutEffect(() => {
        latest.current = latestHandlers;
    });
    const hasOnPress = !!onPress;
    const hasOnLongPress = !!onLongPress;
    const hasOnKeyDown = !!onKeyDown;
    const hasOnPressIn = !!onPressIn;
    const hasOnPressOut = !!onPressOut;

    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {isExecuting, singleExecution} = useSingleExecution();
    const screenReaderState = Accessibility.useScreenReaderState();
    const isScreenReaderActive = screenReaderState === 'enabled';
    const [hitSlop, onLayout] = Accessibility.useAutoHitSlop();
    const [isHovered, setIsHovered] = useState(false);
    const isRoleButton = [rest.accessibilityRole, rest.role].includes(CONST.ROLE.BUTTON);
    const internalRef = useRef<View | null>(null);
    const composedRef = mergeRefs(ref, internalRef);
    const routeKey = useRouteKey();
    // `||` so empty strings skip — never key off an empty prop.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const focusIdentifier = rest.id || rest.nativeID || rest.testID || undefined;

    useEffect(() => {
        if (screenReaderState === 'disabled' || !routeKey || !focusIdentifier) {
            return;
        }
        return registerPressable(routeKey, focusIdentifier, internalRef);
    }, [screenReaderState, routeKey, focusIdentifier]);

    let shouldBeDisabledByScreenReader = false;
    if (enableInScreenReaderStates === CONST.SCREEN_READER_STATES.ACTIVE) {
        shouldBeDisabledByScreenReader = !isScreenReaderActive;
    }
    if (enableInScreenReaderStates === CONST.SCREEN_READER_STATES.DISABLED) {
        shouldBeDisabledByScreenReader = isScreenReaderActive;
    }
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const isDisabled = disabled || shouldBeDisabledByScreenReader || isExecuting;
    const shouldUseDisabledCursor = isDisabled && !isExecuting;

    /**
     * Returns the cursor style based on the state of Pressable
     */
    let cursorStyle = styles.cursorPointer;
    if (!interactive) {
        cursorStyle = styles.cursorDefault;
    } else if (shouldUseDisabledCursor) {
        cursorStyle = styles.cursorDisabled;
    } else if (!hasOnPress && [rest.accessibilityRole, rest.role].includes(CONST.ROLE.PRESENTATION) && !isNested) {
        cursorStyle = styles.cursorText;
    }

    const moveFocusToNext = () => {
        if (!ref || !('current' in ref) || !nextFocusRef) {
            return;
        }
        ref.current?.blur();
        Accessibility.moveAccessibilityFocus(nextFocusRef);
    };

    const onLongPressHandler = (event: GestureResponderEvent) => {
        if (isDisabled || !hasOnLongPress) {
            return;
        }
        if (shouldUseHapticsOnLongPress) {
            HapticFeedback.longPress();
        }
        moveFocusToNext();
        notifyPressedTrigger(internalRef, focusIdentifier);
        latest.current.onLongPress?.(event);
    };

    const onPressHandler = (event?: GestureResponderEvent | KeyboardEvent) => {
        if (isDisabled || !interactive || !hasOnPress) {
            return;
        }
        if (shouldUseHapticsOnPress) {
            HapticFeedback.press();
        }
        moveFocusToNext();
        notifyPressedTrigger(internalRef, focusIdentifier);
        return latest.current.onPress?.(event);
    };

    const voidOnPressHandler = (...args: Parameters<typeof onPressHandler>) => {
        onPressHandler(...args);
    };

    const onKeyboardShortcutPressHandler = (event?: GestureResponderEvent | KeyboardEvent) => {
        onPressHandler(event);
    };

    const {shortcutKey, descriptionKey, modifiers} = keyboardShortcut ?? {};
    useKeyboardShortcut({shortcutKey, descriptionKey, modifiers} as ValueOf<typeof CONST.KEYBOARD_SHORTCUTS>, onKeyboardShortcutPressHandler, {
        isActive: !!keyboardShortcut,
        shouldBubble: false,
        shouldPreventDefault: false,
    });

    const isRoleLink = rest.role === CONST.ROLE.LINK;

    /**
     * Handles keyboard events for the pressable element.
     * If a custom onKeyDown handler is provided, it delegates to that handler.
     * Otherwise, for elements with role="link", it triggers onPress when Enter is pressed
     * to comply with W3C APG Link Pattern (https://www.w3.org/WAI/ARIA/apg/patterns/link/).
     */
    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (hasOnKeyDown) {
            latest.current.onKeyDown?.(event as unknown as React.KeyboardEvent<Element>);
            return;
        }

        if (isRoleLink && event.key === CONST.KEYBOARD_SHORTCUTS.ENTER.shortcutKey) {
            event.preventDefault();
            onPressHandler(event.nativeEvent as unknown as KeyboardEvent);
        }
    };

    const onPressInHandler = (event: GestureResponderEvent) => {
        latest.current.onPressIn?.(event);
    };
    const onPressOutHandler = (event: GestureResponderEvent) => {
        latest.current.onPressOut?.(event);
    };
    const onHoverOutHandler = (event: MouseEvent) => {
        if (event?.type === 'pointerenter' || event?.type === 'mouseenter') {
            return;
        }
        setIsHovered(false);
        latest.current.onHoverOut?.(event);
    };
    const onHoverInHandler = (event: MouseEvent) => {
        setIsHovered(true);
        latest.current.onHoverIn?.(event);
    };

    // Everything handed to <Pressable> is computed as its own statement so that each value is memoized on its own
    // inputs; the `{...rest}` spread below changes on every render and must not drag these along with it.
    // react-native-web's Pressable is React.memo'd, so stable prop values let the whole pressable subtree bail out.
    // The single-execution wrapper is created at event time: creating it during render would hand a ref-reading
    // function to an opaque call, which React Compiler (OXC) rejects as a ref access during render.
    const onPressSingle = (event?: GestureResponderEvent | KeyboardEvent) => singleExecution(onPressHandler)(event);
    const pressableOnPress = !isDisabled ? onPressSingle : undefined;
    const pressableOnLongPress = !isDisabled && hasOnLongPress ? onLongPressHandler : undefined;
    const pressableOnKeyDown = !isDisabled ? handleKeyDown : undefined;
    const pressableOnPressIn = !isDisabled && hasOnPressIn ? onPressInHandler : undefined;
    const pressableOnPressOut = !isDisabled && hasOnPressOut ? onPressOutHandler : undefined;
    const pressableOnMagicTap = !isDisabled ? voidOnPressHandler : undefined;
    const pressableDataSet = {...(isRoleButton ? {[CONST.SELECTION_SCRAPER_HIDDEN_ELEMENT]: true} : {}), ...(dataSet ?? {})};
    const pressableAccessibilityState = {
        disabled: isDisabled,
        ...accessibilityState,
    };
    const pressableStyle = (state: PressableStateCallbackType) => [
        cursorStyle,
        StyleUtils.parseStyleFromFunction(style, state),
        isScreenReaderActive && StyleUtils.parseStyleFromFunction(screenReaderActiveStyle, state),
        state.focused && StyleUtils.parseStyleFromFunction(focusStyle, state),
        (state.hovered || isHovered) && StyleUtils.parseStyleFromFunction(hoverStyle, state),
        state.pressed && StyleUtils.parseStyleFromFunction(pressStyle, state),
        isDisabled && [StyleUtils.parseStyleFromFunction(disabledStyle, state), styles.noSelect],
        isRoleButton && styles.userSelectNone,
    ];
    const pressableChildren =
        typeof children === 'function' ? (state: PressableStateCallbackType) => children({...state, isScreenReaderActive, hovered: state.hovered || isHovered, isDisabled}) : children;

    return (
        <Pressable
            hitSlop={shouldUseAutoHitSlop ? hitSlop : undefined}
            onLayout={shouldUseAutoHitSlop ? onLayout : undefined}
            ref={composedRef}
            disabled={fullDisabled || undefined}
            onPress={pressableOnPress}
            onLongPress={pressableOnLongPress}
            onKeyDown={pressableOnKeyDown}
            onPressIn={pressableOnPressIn}
            onPressOut={pressableOnPressOut}
            dataSet={pressableDataSet}
            style={pressableStyle}
            // accessibility props
            accessibilityState={pressableAccessibilityState}
            aria-disabled={isDisabled}
            aria-checked={accessibilityState?.checked}
            aria-selected={accessibilityState?.selected}
            aria-expanded={accessibilityState?.expanded}
            aria-keyshortcuts={keyboardShortcut && `${keyboardShortcut.modifiers.join('')}+${keyboardShortcut.shortcutKey}`}
            // ios-only form of inputs
            onMagicTap={pressableOnMagicTap}
            onAccessibilityTap={pressableOnMagicTap}
            accessible={accessible}
            fsClass={forwardedFSClass}
            {...rest}
            onHoverOut={onHoverOutHandler}
            onHoverIn={onHoverInHandler}
        >
            {pressableChildren}
        </Pressable>
    );
}

export default GenericPressable;
