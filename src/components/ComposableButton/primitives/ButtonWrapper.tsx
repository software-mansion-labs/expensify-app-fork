import {useIsFocused} from '@react-navigation/native';
import type {ForwardedRef} from 'react';
import React, {useState} from 'react';
import type {GestureResponderEvent, StyleProp, ViewStyle} from 'react-native';
import {StyleSheet, View} from 'react-native';
import {getButtonRole} from '@components/Button/utils';
import validateSubmitShortcut from '@components/Button/validateSubmitShortcut';
import type {ButtonSize, ButtonVariant} from '@components/ComposableButton/types';
import type {PressableRef} from '@components/Pressable/GenericPressable/types';
import PressableWithFeedback from '@components/Pressable/PressableWithFeedback';
import withNavigationFallback from '@components/withNavigationFallback';
import useActiveElementRole from '@hooks/useActiveElementRole';
import useKeyboardShortcut from '@hooks/useKeyboardShortcut';
import useThemeStyles from '@hooks/useThemeStyles';
import HapticFeedback from '@libs/HapticFeedback';
import CONST from '@src/CONST';
import type ChildrenProps from '@src/types/utils/ChildrenProps';
import type WithSentryLabel from '@src/types/utils/SentryLabel';
import ButtonWrapperContext from './ButtonWrapperContext';

type ButtonWrapperProps = ChildrenProps &
    WithSentryLabel & {
        variant?: ButtonVariant;
        size?: ButtonSize;
        isDisabled?: boolean;
        isLoading?: boolean;
        onPress?: (event?: GestureResponderEvent | KeyboardEvent) => void | Promise<void>;
        onLongPress?: (event?: GestureResponderEvent) => void;
        onPressIn?: (event: GestureResponderEvent) => void;
        onPressOut?: (event: GestureResponderEvent) => void;
        onMouseDown?: (e: React.MouseEvent<Element, MouseEvent>) => void;
        pressOnEnter?: boolean;
        enterKeyEventListenerPriority?: number;
        isPressOnEnterActive?: boolean;
        allowBubble?: boolean;
        shouldEnableHapticFeedback?: boolean;
        isLongPressDisabled?: boolean;
        shouldRemoveRightBorderRadius?: boolean;
        shouldRemoveLeftBorderRadius?: boolean;
        shouldBlendOpacity?: boolean;
        isNested?: boolean;
        id?: string;
        testID?: string;
        accessibilityLabel?: string;
        style?: StyleProp<ViewStyle>;
        innerStyles?: StyleProp<ViewStyle>;
        ref?: ForwardedRef<View>;
    };

const accessibilityRoles: string[] = Object.values(CONST.ROLE);

type KeyboardShortcutComponentProps = {
    isDisabled: boolean;
    isLoading: boolean;
    onPress: () => void | Promise<void>;
    allowBubble: boolean;
    enterKeyEventListenerPriority: number;
    isPressOnEnterActive: boolean;
};

function KeyboardShortcutComponent({isDisabled, isLoading, onPress, allowBubble, enterKeyEventListenerPriority, isPressOnEnterActive}: KeyboardShortcutComponentProps) {
    const isFocused = useIsFocused();
    const activeElementRole = useActiveElementRole();

    const shouldDisableEnterShortcut = accessibilityRoles.includes(activeElementRole ?? '') && activeElementRole !== CONST.ROLE.PRESENTATION;

    useKeyboardShortcut(
        CONST.KEYBOARD_SHORTCUTS.ENTER,
        (event?: GestureResponderEvent | KeyboardEvent) => {
            if (!validateSubmitShortcut(isDisabled, isLoading, event)) {
                return;
            }
            onPress();
        },
        {
            isActive: !shouldDisableEnterShortcut && (isFocused || isPressOnEnterActive),
            shouldBubble: allowBubble,
            priority: enterKeyEventListenerPriority,
            shouldPreventDefault: false,
        },
    );

    return null;
}

const SIZE_STYLES = {
    extraSmall: 'buttonExtraSmall',
    small: 'buttonSmall',
    medium: 'buttonMedium',
    large: 'buttonLarge',
} as const;

const GAP_MAP: Record<ButtonSize, number> = {
    extraSmall: 4,
    small: 4,
    medium: 8,
    large: 8,
};

function ButtonWrapper({
    children,
    variant = 'default',
    size = 'medium',
    isDisabled = false,
    isLoading = false,
    onPress = () => {},
    onLongPress = () => {},
    onPressIn = () => {},
    onPressOut = () => {},
    onMouseDown,
    pressOnEnter = false,
    enterKeyEventListenerPriority = 0,
    isPressOnEnterActive = false,
    allowBubble = false,
    shouldEnableHapticFeedback = false,
    isLongPressDisabled = false,
    shouldRemoveRightBorderRadius = false,
    shouldRemoveLeftBorderRadius = false,
    shouldBlendOpacity = false,
    isNested = false,
    id = '',
    testID,
    accessibilityLabel = '',
    style,
    innerStyles,
    sentryLabel,
    ref,
}: ButtonWrapperProps) {
    const styles = useThemeStyles();
    const [isHovered, setIsHovered] = useState(false);

    const sizeStyle = styles[SIZE_STYLES[size]];
    const isSuccess = variant === 'success';
    const isDanger = variant === 'danger';
    const isLink = variant === 'link';

    const buttonStyles: StyleProp<ViewStyle> = [
        styles.button,
        styles.flexRow,
        {gap: GAP_MAP[size]},
        sizeStyle,
        isSuccess ? styles.buttonSuccess : undefined,
        isDanger ? styles.buttonDanger : undefined,
        isDisabled ? styles.buttonOpacityDisabled : undefined,
        isDisabled && !isDanger && !isSuccess ? styles.buttonDisabled : undefined,
        shouldRemoveRightBorderRadius ? styles.noRightBorderRadius : undefined,
        shouldRemoveLeftBorderRadius ? styles.noLeftBorderRadius : undefined,
        innerStyles,
        isLink && styles.bgTransparent,
    ];

    const buttonContainerStyles: StyleProp<ViewStyle> = [buttonStyles, shouldBlendOpacity && styles.buttonBlendContainer];

    const hoverStyle = [
        !isDisabled ? styles.buttonDefaultHovered : undefined,
        isSuccess && !isDisabled ? styles.buttonSuccessHovered : undefined,
        isDanger && !isDisabled ? styles.buttonDangerHovered : undefined,
    ];

    const contextValue = {
        variant,
        size,
        isDisabled,
        isLoading,
        isHovered,
    };

    const buttonBlendForegroundStyle = (() => {
        if (!shouldBlendOpacity) {
            return undefined;
        }
        const {backgroundColor, opacity} = StyleSheet.flatten(buttonStyles);
        return {backgroundColor, opacity};
    })();

    return (
        <>
            {pressOnEnter && (
                <KeyboardShortcutComponent
                    isDisabled={isDisabled}
                    isLoading={isLoading}
                    onPress={onPress}
                    allowBubble={allowBubble}
                    enterKeyEventListenerPriority={enterKeyEventListenerPriority}
                    isPressOnEnterActive={isPressOnEnterActive}
                />
            )}
            <PressableWithFeedback
                dataSet={{
                    listener: pressOnEnter ? CONST.KEYBOARD_SHORTCUTS.ENTER.shortcutKey : undefined,
                }}
                ref={ref as PressableRef}
                onPress={(event) => {
                    if (event?.type === 'click') {
                        const currentTarget = event?.currentTarget as HTMLElement;
                        currentTarget?.blur();
                    }
                    if (shouldEnableHapticFeedback) {
                        HapticFeedback.press();
                    }
                    if (isDisabled || isLoading) {
                        return;
                    }
                    return onPress(event);
                }}
                onLongPress={(event) => {
                    if (isLongPressDisabled) {
                        return;
                    }
                    if (shouldEnableHapticFeedback) {
                        HapticFeedback.longPress();
                    }
                    onLongPress(event);
                }}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                onMouseDown={onMouseDown}
                shouldBlendOpacity={shouldBlendOpacity}
                disabled={isLoading || isDisabled}
                wrapperStyle={[
                    isDisabled ? {...styles.cursorDisabled, ...styles.noSelect} : {},
                    styles.buttonContainer,
                    shouldRemoveRightBorderRadius ? styles.noRightBorderRadius : undefined,
                    shouldRemoveLeftBorderRadius ? styles.noLeftBorderRadius : undefined,
                    style,
                ]}
                style={buttonContainerStyles}
                isNested={isNested}
                hoverStyle={hoverStyle}
                id={id}
                testID={testID}
                accessibilityLabel={accessibilityLabel}
                role={getButtonRole(isNested)}
                hoverDimmingValue={1}
                onHoverIn={() => setIsHovered(true)}
                onHoverOut={() => setIsHovered(false)}
                sentryLabel={sentryLabel}
            >
                {shouldBlendOpacity && <View style={[StyleSheet.absoluteFill, buttonBlendForegroundStyle]} />}
                <ButtonWrapperContext.Provider value={contextValue}>{children}</ButtonWrapperContext.Provider>
            </PressableWithFeedback>
        </>
    );
}

export default withNavigationFallback(ButtonWrapper);
export type {ButtonWrapperProps};
