import type {NumericFlipButtonProps as BaseNumericFlipButtonProps} from '@components/NumericButtons';
import type {NumericEditingKeyPressEvent, NumericEditingRef} from '@components/NumericEditingController/types';
import type {BaseTextInputProps, BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';

import type {ForwardedRef, ReactNode} from 'react';
import type {StyleProp, TextStyle, ViewStyle} from 'react-native';

type NumericInputProps = {
    /** Canonical value shared by composed primitives. Only an empty value resets editing state. */
    value?: string;

    /** Called with the canonical signed value when a composed primitive changes it. */
    onInputChange?: (value: string) => void;

    /** Whether negative values are allowed. The canonical value always stores its sign. */
    allowNegative?: boolean;

    /** Number of decimal places accepted by the composer. */
    decimals?: number;

    /** Maximum number of integer digits accepted by the composer. */
    maxLength?: number;

    /** Error supplied by FormProvider and rendered by `NumericInput.Error`. */
    errorText?: string;

    /** Ref exposing the number editing imperative API. */
    ref?: ForwardedRef<NumericEditingRef>;

    /** Composed primitives that consume NumericInput state and actions through context. */
    children: ReactNode;

    /** Whether to dynamically scale the font size down when the amount is long. */
    shouldUseDynamicFontSize?: boolean;

    /**
     * Symbol counted in the total display length when dynamic font sizing is enabled. Only this prop's length is counted, not
     * the children of `NumericInput.Symbol`, so it must match the text the composition renders there.
     */
    symbol?: string;
};

type NumericInputContainerProps = {
    /** Composed numeric primitives rendered inside the centered amount layout. */
    children: ReactNode;

    /**
     * Optional error node rendered in normal flow below the amount row and `action`, so it takes layout space. A composition
     * that must not displace the amount positions this node itself, for example absolutely.
     */
    error?: ReactNode;

    /** Additional styles applied to the outer container, such as a minimum height the layout reserves for a floating error. */
    style?: StyleProp<ViewStyle>;

    /** Test identifier applied to the interactive number view. */
    testID?: string;

    /** Optional action node (such as `NumericInput.CurrencyButton`) rendered below the amount row and above the error node. */
    action?: ReactNode;
};

type NumericTextInputProps = {
    /** Style applied to the number input. */
    style?: StyleProp<TextStyle>;

    /** Reference to the underlying text input. */
    ref?: ForwardedRef<BaseTextInputRef>;

    /** Callback for keyboard events received by the numeric input. */
    onKeyPress?: (event: NumericEditingKeyPressEvent) => void;

    /** Style applied to the input container. */
    containerStyle?: StyleProp<ViewStyle>;

    /** Whether to dynamically scale the font size down when the amount is long. */
    shouldUseDynamicFontSize?: boolean;
} & Pick<
    BaseTextInputProps,
    | 'accessibilityLabel'
    | 'autoFocus'
    | 'autoGrow'
    | 'autoGrowExtraSpace'
    | 'autoGrowMarginSide'
    | 'contentWidth'
    | 'disabled'
    | 'disableKeyboard'
    | 'hideFocusedState'
    | 'keyboardType'
    | 'onBlur'
    | 'onFocus'
    | 'onPress'
    | 'onSubmitEditing'
    | 'prefixCharacter'
    | 'prefixContainerStyle'
    | 'prefixStyle'
    | 'shouldAllowFocusInLandscapeMode'
    | 'shouldApplyPaddingToContainer'
    | 'shouldUseDefaultLineHeightForPrefix'
    | 'submitBehavior'
    | 'testID'
    | 'touchableInputWrapperStyle'
>;

type NumericSymbolProps = {
    /** Symbol (currency or unit) rendered beside the number. */
    children: ReactNode;

    /** Style applied to the symbol text, appended to the primitive's defaults. */
    textStyle?: StyleProp<TextStyle>;
};

type NumericSymbolButtonProps = {
    /** Symbol (currency or unit) rendered inside the button. */
    children: ReactNode;

    /** Called when the symbol button is pressed. */
    onPress: () => void;

    /** Style applied to the symbol text, appended to the primitive's defaults. */
    textStyle?: StyleProp<TextStyle>;
};

type NumericInputFlipButtonProps = Omit<BaseNumericFlipButtonProps, 'onPress'>;

type NumericMinusSignProps = {
    /** Style applied to the minus sign, appended to the primitive's defaults. */
    style?: StyleProp<TextStyle>;
};

type NumericErrorProps = {
    /** Style applied to the message container, appended to the primitive's defaults. */
    style?: StyleProp<ViewStyle>;
};

type NumericBigNumberPadProps = {
    /** Style applied to the pad container */
    style?: StyleProp<ViewStyle>;

    /** Test identifier for the pad */
    testID?: string;
};

export type {
    NumericBigNumberPadProps,
    NumericErrorProps,
    NumericInputContainerProps,
    NumericInputFlipButtonProps,
    NumericInputProps,
    NumericMinusSignProps,
    NumericSymbolButtonProps,
    NumericSymbolProps,
    NumericTextInputProps,
};
