import type {NumericFlipButtonProps as BaseNumericFlipButtonProps} from '@components/NumericButtons';
import type {NumericEditingKeyPressEvent, NumericEditingRef} from '@components/NumericEditingController/types';
import type {BaseTextInputProps, BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';

import type CONST from '@src/CONST';

import type {ForwardedRef, ReactNode} from 'react';
import type {StyleProp, TextStyle, ViewStyle} from 'react-native';
import type {ValueOf} from 'type-fest';

/**
 * A caller that keeps the sign apart from the number passes both props. The root then reports and accepts the magnitude
 * through `value`, `onInputChange` and its ref, and reports a changed sign through `onSignChange`.
 */
type NumericInputSignProps =
    | {
          /** Sign of the value, owned by the caller. The root adopts a change to it, and applies edits and flips right away before reporting them. */
          isNegative: boolean;

          /** Called after an edit or a flip changes the sign, with the new sign. */
          onSignChange: (isNegative: boolean) => void;
      }
    | {
          isNegative?: never;
          onSignChange?: never;
      };

type NumericInputProps = NumericInputSignProps & {
    /** Canonical value shared by composed primitives. Only an empty value resets editing state. It is signed unless the caller owns the sign. */
    value?: string;

    /** Called with the canonical value when a composed primitive changes it. It is signed unless the caller owns the sign. */
    onInputChange?: (value: string) => void;

    /** Whether negative values are allowed. */
    allowNegative?: boolean;

    /** Number of decimal places accepted by the composer. */
    decimals?: number;

    /** Maximum number of integer digits accepted by the composer. */
    maxLength?: number;

    /** Error supplied by FormProvider and rendered by `NumericInput.Error`. */
    errorText?: string;

    /** Ref exposing the number editing imperative API. */
    ref?: ForwardedRef<NumericEditingRef>;

    /** Composed primitives that consume NumericInput state and actions through context. The root renders no view of its own. */
    children: ReactNode;
};

type NumericInputContainerProps = {
    /** The amount row, centered in the amount area. */
    children: ReactNode;

    /** Action rendered below the amount row, such as the currency button on devices without the actions row. */
    action?: ReactNode;

    /** Error rendered below the action. In portrait the layout positions it absolutely, so it never displaces the amount. */
    error?: ReactNode;

    /** Whether the layout renders in landscape, where the amount sits in the left column instead of filling the screen. */
    isInLandscapeMode: boolean;

    /** Test identifier applied to the amount area. */
    testID?: string;
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

type NumericAmountRowProps = NumericTextInputProps & {
    /** Symbol (currency or unit) rendered beside the number, e.g. '$' or '%'. Omit it to render none. */
    symbol?: string;

    /** Position of the symbol relative to the number. Defaults to prefix. */
    symbolPosition?: ValueOf<typeof CONST.TEXT_INPUT_SYMBOL_POSITION>;

    /** Whether the number, the symbol and the sign scale down together as the amount grows. */
    shouldUseDynamicFontSize?: boolean;

    /** Style applied to the symbol text, appended to the primitive's defaults. */
    symbolStyle?: StyleProp<TextStyle>;

    /** Style applied to the minus sign, appended to the primitive's defaults. */
    signStyle?: StyleProp<TextStyle>;
};

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
    /** Style applied to the pad container. */
    style?: StyleProp<ViewStyle>;

    /** Test identifier applied to the pad container. */
    testID?: string;
};

type NumericInputActionsProps = {
    /** Action buttons, such as `NumericInput.CurrencyButton` and `NumericInput.FlipButton`. */
    children?: ReactNode;

    /** Additional styles applied to the actions container. */
    style?: StyleProp<ViewStyle>;

    /** Test identifier applied to the actions container. */
    testID?: string;
};

type NumericInputFooterProps = {
    /** Content rendered inside the footer container, typically a submit Button. */
    children: ReactNode;

    /** Additional styles applied to the footer container. */
    style?: StyleProp<ViewStyle>;

    /** Test identifier applied to the footer container. */
    testID?: string;
};

type NumericInputResponsiveLayoutProps = {
    /** The amount row, typically `NumericInput.AmountRow`. */
    children: ReactNode;

    /** Currency button, such as `NumericInput.CurrencyButton`. Shown in the actions row on touch screens and under the amount otherwise. */
    currencyButton?: ReactNode;

    /** Flip button, such as `NumericInput.FlipButton`. Shown in the actions row, on touch screens only. */
    flipButton?: ReactNode;

    /** Number pad, such as `NumericInput.BigNumberPad`. Shown on touch screens only: under the amount in portrait, in the right column in landscape. */
    pad?: ReactNode;

    /** Footer or submit button rendered at the bottom of the screen. */
    footer?: ReactNode;

    /** Test identifier applied to the amount area. */
    amountTestID?: string;

    /** Additional styles applied to the scroll view content container in portrait. */
    scrollViewStyle?: StyleProp<ViewStyle>;

    /** Additional styles applied to the outer container / scroll view. */
    style?: StyleProp<ViewStyle>;

    /** Additional styles applied to the footer wrapper. */
    footerStyle?: StyleProp<ViewStyle>;

    /** Test identifier applied to the root scroll view. */
    testID?: string;

    /** Whether to disable ScrollView and render a View container instead, for screens that already scroll. */
    disableScrollView?: boolean;

    /** Whether to refocus the input when clicking on the ScrollView empty space. */
    shouldRefocusOnScrollViewClick?: boolean;
};

type NumericInputResponsivePresetProps = Omit<NumericInputResponsiveLayoutProps, 'currencyButton'> & {
    /** Currency code (e.g. 'USD', 'EUR') shown on the currency button. The button renders only when this or `currencyButtonLabel` is provided. */
    currency?: string;

    /** Custom label on the currency button (overrides `currency` if set), e.g. a duration unit. */
    currencyButtonLabel?: string;

    /** Accessibility label for the currency button (defaults to currency-based copy when unset). */
    currencyButtonAccessibilityLabel?: string;

    /** Callback when the currency button is pressed. */
    onCurrencyButtonPress?: () => void;
};

export type {
    NumericAmountRowProps,
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
    NumericSymbolProps,
    NumericTextInputProps,
};
