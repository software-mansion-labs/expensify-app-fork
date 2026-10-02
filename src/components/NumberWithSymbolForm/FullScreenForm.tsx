import {NumericFlipButton} from '@components/NumericButtons';
import type {NumericEditingRef} from '@components/NumericEditingController/types';
import NumericInput from '@components/NumericInput';
import type {NumericTextInputProps} from '@components/NumericInput/types';

import useIsInLandscapeMode from '@hooks/useIsInLandscapeMode';
import useThemeStyles from '@hooks/useThemeStyles';

import {canUseTouchScreen as canUseTouchScreenUtil} from '@libs/DeviceCapabilities';

import CONST from '@src/CONST';

import type {ReactNode, RefObject} from 'react';
import type {StyleProp, TextStyle, ViewStyle} from 'react-native';

import React from 'react';

import type {AdapterRootProps, AdapterTextInputProps, SymbolPosition} from './types';
import type {ParentOwnedSign} from './useParentOwnedSign';

import LegacyAmountLayout from './LegacyAmountLayout';
import ParentOwnedMinusSign from './ParentOwnedMinusSign';
import ParentOwnedSignActions from './ParentOwnedSignActions';
import {getSizedAdornment} from './useParentOwnedSign';

const canUseTouchScreen = canUseTouchScreenUtil();

/** Test id the legacy number form gives the portrait amount container */
const LEGACY_AMOUNT_CONTAINER_TEST_ID = 'numberView';

type FullScreenFormProps = {
    /** Props of the NumericInput root, already carrying the canonical signed value */
    root: AdapterRootProps;

    /** Ref of the NumericInput root */
    editingRef: RefObject<NumericEditingRef | null>;

    /** Props forwarded to `NumericInput.TextInput` */
    textInputProps: AdapterTextInputProps;

    /** Called when the text input is pressed */
    onPress?: NumericTextInputProps['onPress'];

    /** Symbol displayed beside the number, or an empty string for none */
    symbol: string;

    /** Position of the symbol relative to the input */
    symbolPosition: SymbolPosition;

    /** Style applied to the symbol text */
    symbolTextStyle?: StyleProp<TextStyle>;

    /** Style applied to the minus sign */
    negativeSymbolStyle?: StyleProp<TextStyle>;

    /** Whether to scale the font size down when the amount is long */
    shouldUseDynamicFontSize: boolean;

    /** Label of the currency button. The button renders only when it is set. */
    currencyButtonText?: string;

    /** Called when the currency button is pressed */
    onCurrencyButtonPress?: () => void;

    /** Accessibility label of the currency button */
    currencyButtonAccessibilityLabel?: string;

    /** Who owns the sign and which sign gestures the user may make */
    sign: ParentOwnedSign;

    /** Whether to show the touch number pad */
    shouldShowBigNumberPad: boolean;

    /** Footer rendered at the bottom of the screen */
    footer?: ReactNode;

    /** Style of the portrait scroll view content container */
    scrollViewStyle?: StyleProp<ViewStyle>;

    /** Whether pressing the scroll view empty space refocuses the input */
    shouldRefocusOnScrollViewClick: boolean;
};

/**
 * Full-screen path of the legacy number form. It composes the public NumericInput primitives inside the adapter's private
 * `LegacyAmountLayout`, and keeps the legacy placement here: the error floats above the number pad in portrait, the actions
 * row exists only on touch screens, and on other devices the currency button sits under the amount instead.
 */
function FullScreenForm({
    root,
    editingRef,
    textInputProps,
    onPress,
    symbol,
    symbolPosition,
    symbolTextStyle,
    negativeSymbolStyle,
    shouldUseDynamicFontSize,
    currencyButtonText,
    onCurrencyButtonPress,
    currencyButtonAccessibilityLabel,
    sign,
    shouldShowBigNumberPad,
    footer,
    scrollViewStyle,
    shouldRefocusOnScrollViewClick,
}: FullScreenFormProps) {
    const styles = useThemeStyles();
    const isInLandscapeMode = useIsInLandscapeMode();
    const isSuffix = symbolPosition === CONST.TEXT_INPUT_SYMBOL_POSITION.SUFFIX;

    const currencyButtonNode = currencyButtonText ? (
        <NumericInput.CurrencyButton
            currency={currencyButtonText}
            onPress={onCurrencyButtonPress}
            accessibilityLabel={currencyButtonAccessibilityLabel}
            isDisabled={false}
            style={styles.minWidth18}
        />
    ) : null;

    // A caller-owned sign flips through the caller, a sign kept inside the value through the root
    let flipButtonNode = null;
    if (canUseTouchScreen && sign.flipParentSign) {
        flipButtonNode = (
            <NumericFlipButton
                onPress={sign.flipParentSign}
                style={styles.minWidth18}
            />
        );
    } else if (canUseTouchScreen && sign.shouldShowRootFlipButton) {
        flipButtonNode = <NumericInput.FlipButton style={styles.minWidth18} />;
    }

    // The actions row exists only on touch screens. Elsewhere the currency button sits under the amount and there is no flip button.
    const actionsNode =
        canUseTouchScreen && (!!currencyButtonNode || !!flipButtonNode) ? (
            <NumericInput.Actions>
                {currencyButtonNode}
                {flipButtonNode}
            </NumericInput.Actions>
        ) : null;

    // The number pad itself renders only on touch screens, so the error floats above it only there
    const isPadVisible = canUseTouchScreen && shouldShowBigNumberPad;

    // In portrait the error floats over the bottom of the amount container, so showing it never moves the amount or the pad
    const errorNode = (
        <NumericInput.Error style={isInLandscapeMode ? [styles.ph5, styles.w100] : [styles.pAbsolute, styles.b0, isPadVisible ? styles.mb5 : styles.mb3, styles.ph5, styles.w100]} />
    );

    const symbolNode = symbol ? <NumericInput.Symbol textStyle={symbolTextStyle}>{symbol}</NumericInput.Symbol> : null;

    return (
        <NumericInput
            value={root.value}
            onInputChange={root.onInputChange}
            allowNegative={root.allowNegative}
            decimals={root.decimals}
            maxLength={root.maxLength}
            errorText={root.errorText}
            shouldUseDynamicFontSize={shouldUseDynamicFontSize}
            symbol={getSizedAdornment(symbol, sign)}
            ref={editingRef}
        >
            <LegacyAmountLayout
                actions={actionsNode}
                pad={shouldShowBigNumberPad ? <NumericInput.BigNumberPad /> : null}
                footer={footer}
                error={isInLandscapeMode ? errorNode : null}
                scrollViewStyle={scrollViewStyle}
                shouldRefocusOnScrollViewClick={shouldRefocusOnScrollViewClick}
            >
                <NumericInput.Container
                    testID={isInLandscapeMode ? undefined : LEGACY_AMOUNT_CONTAINER_TEST_ID}
                    // The portrait error floats over the bottom of the container, so its room is always reserved: showing the
                    // error after a submit never changes the height of the container, nor moves the amount or the pad
                    style={isInLandscapeMode ? undefined : styles.moneyRequestAmountContainer}
                    action={!canUseTouchScreen ? currencyButtonNode : null}
                    error={!isInLandscapeMode ? errorNode : null}
                >
                    {sign.isSignOwnedByParent ? (
                        <ParentOwnedMinusSign
                            isNegative={sign.isParentNegative}
                            style={negativeSymbolStyle}
                        />
                    ) : (
                        <NumericInput.MinusSign style={negativeSymbolStyle} />
                    )}
                    {!isSuffix && symbolNode}
                    <ParentOwnedSignActions setNumber={sign.setNumber}>
                        <NumericInput.TextInput
                            {...textInputProps}
                            onPress={onPress}
                            onKeyPress={sign.handleKeyPress}
                        />
                    </ParentOwnedSignActions>
                    {isSuffix && symbolNode}
                </NumericInput.Container>
            </LegacyAmountLayout>
        </NumericInput>
    );
}

export default FullScreenForm;
