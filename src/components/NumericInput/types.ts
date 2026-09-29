import type {NumericFlipButtonProps as BaseNumericFlipButtonProps} from '@components/NumericButtons';
import type {NumericEditingKeyPressEvent, NumericEditingRef} from '@components/NumericEditingController/types';
import type {BaseTextInputProps, BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';

import type CONST from '@src/CONST';

import type {ForwardedRef, ReactNode} from 'react';
import type {StyleProp, TextStyle, ViewStyle} from 'react-native';
import type {ValueOf} from 'type-fest';

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

    /** Style applied to the root container. */
    style?: StyleProp<ViewStyle>;

    /** Test identifier applied to the root container. */
    testID?: string;

    /** Composed primitives that consume NumericInput state and actions through context. */
    children: ReactNode;

    /** Whether to dynamically scale the font size down when the amount is long. */
    shouldUseDynamicFontSize?: boolean;

    /** Optional symbol used to calculate total display length when dynamic font sizing is enabled. */
    symbol?: string;
};

type NumericInputContainerProps = {
    /** Composed numeric primitives rendered inside the centered amount layout. */
    children: ReactNode;

    /** Optional error node positioned relative to the amount container without displacing it. */
    error?: ReactNode;

    /** Additional styles applied to the outer container. */
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

    /** Called when the user starts or stops long pressing the "<" (backspace) button */
    longPressHandlerStateChanged?: (isUserLongPressingBackspace: boolean) => void;

    /** Optional callback when a number or backspace is pressed */
    numberPressed?: (key: string) => void;

    /** Test identifier for the pad */
    testID?: string;
};

type NumericInputActionsProps = {
    /** Action buttons, such as `NumericInput.CurrencyButton` and `NumericInput.FlipButton`. */
    children?: ReactNode;

    /** Additional styles applied to the actions container. */
    style?: StyleProp<ViewStyle>;

    /** Whether to hide the container on non-touch devices. */
    hideOnNonTouch?: boolean;

    /** Test identifier applied to the actions container. */
    testID?: string;
};

type NumericInputFooterProps = {
    /** Content rendered inside the footer container, typically a submit Button. */
    children: ReactNode;

    /** Additional styles applied to the footer container. */
    style?: StyleProp<ViewStyle>;
};

type NumericInputResponsiveLayoutProps = {
    /** Main content, typically `NumericInput.Container`, `NumericInput.Error`, and any contextual text. */
    children?: ReactNode;

    /** Action controls, such as `NumericInput.Actions`. In landscape, placed in the left column under the amount. In portrait, placed below the amount. */
    actions?: ReactNode;

    /** Touch number pad, such as `NumericInput.BigNumberPad`. In landscape, placed in the right column. In portrait, placed below actions/content. */
    pad?: ReactNode;

    /** Footer or submit button rendered at the bottom of the screen. */
    footer?: ReactNode;

    /** Optional error node rendered under actions in landscape, and under actions in portrait (if not already inside container). */
    error?: ReactNode;

    /** Additional styles applied to the scroll view content container. */
    scrollViewStyle?: StyleProp<ViewStyle>;

    /** Additional styles applied to the outer container / scroll view. */
    style?: StyleProp<ViewStyle>;

    /** Additional styles applied to the footer wrapper. */
    footerStyle?: StyleProp<ViewStyle>;

    /** Test identifier applied to the root scroll view. */
    testID?: string;

    /** Whether to disable ScrollView and render a View container instead. */
    disableScrollView?: boolean;

    /** Whether to refocus the input when clicking on the ScrollView empty space. */
    shouldRefocusOnScrollViewClick?: boolean;
};

type NumericInputResponsivePresetProps = Pick<
    NumericInputResponsiveLayoutProps,
    'footer' | 'disableScrollView' | 'shouldRefocusOnScrollViewClick' | 'scrollViewStyle' | 'style' | 'footerStyle' | 'testID'
> &
    Omit<NumericTextInputProps, 'style' | 'testID' | 'shouldUseDynamicFontSize'> & {
        /** Currency code (e.g. 'USD', 'EUR') shown on the currency button. The button renders only when this or `currencyButtonLabel` is provided. */
        currency?: string;

        /** Custom label on the currency button (overrides `currency` if set), e.g. a duration unit. */
        currencyButtonLabel?: string;

        /** Accessibility label for the currency button (defaults to currency-based copy when unset). */
        currencyButtonAccessibilityLabel?: string;

        /** Callback when the currency button is pressed. */
        onCurrencyButtonPress?: () => void;

        /** Symbol (currency or unit) displayed beside the number (e.g. '$', '€', 'km', '%'). Omit it to render no symbol. */
        symbol?: string;

        /** Position of the symbol relative to the input ('prefix' or 'suffix'). Defaults to 'prefix'. */
        symbolPosition?: ValueOf<typeof CONST.TEXT_INPUT_SYMBOL_POSITION>;

        /** Style applied to the symbol text, appended to the primitive's defaults. */
        symbolTextStyle?: StyleProp<TextStyle>;

        /** Style applied to the minus sign, appended to the primitive's defaults. */
        negativeSymbolStyle?: StyleProp<TextStyle>;

        /** Style applied to the text input. */
        textInputStyle?: StyleProp<TextStyle>;

        /** Test identifier applied to the text input primitive. */
        inputTestID?: string;

        /** Test identifier applied to the amount container. Transitional: only NumberWithSymbolForm sets it, to keep its legacy `numberView` id; remove with the adapter. */
        amountContainerTestID?: string;

        /** Flip button slot. Defaults to `NumericInput.FlipButton`; pass `null` to render none. */
        flipButton?: ReactNode;

        /** Number pad slot. Defaults to `NumericInput.BigNumberPad`; pass `null` for a screen without the number pad. */
        pad?: ReactNode;

        /** Custom children to render inside the amount container (overrides default minus sign, symbol, and input composition). */
        children?: ReactNode;
    };

type NumericResponsivePresetProps = Omit<NumericInputProps, 'children' | 'ref' | 'style' | 'testID'> &
    NumericInputResponsivePresetProps & {
        /** Ref exposing the number editing imperative API of the wrapping NumericInput root. */
        editingRef?: ForwardedRef<NumericEditingRef>;
    };

export type {
    NumericBigNumberPadProps,
    NumericErrorProps,
    NumericInputFlipButtonProps,
    NumericInputActionsProps,
    NumericInputContainerProps,
    NumericInputFooterProps,
    NumericInputProps,
    NumericInputResponsiveLayoutProps,
    NumericInputResponsivePresetProps,
    NumericMinusSignProps,
    NumericResponsivePresetProps,
    NumericSymbolProps,
    NumericTextInputProps,
};
