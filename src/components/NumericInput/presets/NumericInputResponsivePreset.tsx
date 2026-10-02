import {NumericCurrencyButton} from '@components/NumericButtons';
import NumericInputActions from '@components/NumericInput/layout/NumericInputActions';
import NumericInputResponsiveLayout from '@components/NumericInput/layout/NumericInputResponsiveLayout';
import NumericInputComponent from '@components/NumericInput/NumericInput';
import NumericBigNumberPad from '@components/NumericInput/primitives/NumericBigNumberPad';
import NumericError from '@components/NumericInput/primitives/NumericError';
import NumericFlipButton from '@components/NumericInput/primitives/NumericFlipButton';
import NumericInputContainer from '@components/NumericInput/primitives/NumericInputContainer';
import NumericMinusSign from '@components/NumericInput/primitives/NumericMinusSign';
import NumericSymbol from '@components/NumericInput/primitives/NumericSymbol';
import NumericTextInput from '@components/NumericInput/primitives/NumericTextInput';
import type {NumericInputResponsivePresetProps, NumericResponsivePresetProps} from '@components/NumericInput/types';

import useIsInLandscapeMode from '@hooks/useIsInLandscapeMode';
import useThemeStyles from '@hooks/useThemeStyles';

import {canUseTouchScreen as canUseTouchScreenUtil} from '@libs/DeviceCapabilities';

import CONST from '@src/CONST';

import React from 'react';

const canUseTouchScreen = canUseTouchScreenUtil();

/**
 * Responsive preset for standard numeric forms. Must be rendered inside a `<NumericInput>` root.
 * Composes ResponsiveLayout, Container, Actions, and the `pad`, `flipButton`, and `footer` slots.
 * Props not consumed by the preset are forwarded to `NumericInput.TextInput`.
 */
function NumericInputResponsivePreset({
    currency,
    onCurrencyButtonPress,
    currencyButtonLabel,
    currencyButtonAccessibilityLabel,
    symbol,
    symbolPosition = CONST.TEXT_INPUT_SYMBOL_POSITION.PREFIX,
    footer,
    disableScrollView = false,
    shouldRefocusOnScrollViewClick = false,
    scrollViewStyle,
    style,
    footerStyle,
    symbolTextStyle,
    negativeSymbolStyle,
    textInputStyle,
    testID,
    inputTestID,
    amountContainerTestID,
    flipButton,
    pad,
    children,
    ...textInputProps
}: NumericInputResponsivePresetProps) {
    const styles = useThemeStyles();
    const isInLandscapeMode = useIsInLandscapeMode();

    const currencyOrUnitButtonText = currencyButtonLabel ?? currency;
    const currencyButtonNode = currencyOrUnitButtonText ? (
        <NumericCurrencyButton
            currency={currencyOrUnitButtonText}
            onPress={onCurrencyButtonPress}
            accessibilityLabel={currencyButtonAccessibilityLabel}
            isDisabled={false}
            style={styles.minWidth18}
        />
    ) : null;

    const flipButtonNode =
        flipButton !== undefined ? (
            flipButton
        ) : (
            <NumericFlipButton
                isDisabled={false}
                style={styles.minWidth18}
            />
        );

    const padNode = pad !== undefined ? pad : <NumericBigNumberPad />;

    // The number pad itself renders only on touch screens, so the error sits above it only there
    const isPadVisible = canUseTouchScreen && !!padNode;

    const actionsNode = (
        <NumericInputActions hideOnNonTouch>
            {currencyButtonNode}
            {flipButtonNode}
        </NumericInputActions>
    );

    const isPrefix = symbolPosition !== CONST.TEXT_INPUT_SYMBOL_POSITION.SUFFIX;

    const symbolNode = symbol ? <NumericSymbol textStyle={symbolTextStyle}>{symbol}</NumericSymbol> : null;

    const defaultAmountRow = (
        <>
            <NumericMinusSign style={negativeSymbolStyle} />
            {isPrefix && symbolNode}
            <NumericTextInput
                {...textInputProps}
                testID={inputTestID}
                style={textInputStyle}
            />
            {!isPrefix && symbolNode}
        </>
    );

    const errorNode = <NumericError style={isInLandscapeMode ? [styles.ph5, styles.w100] : [styles.pAbsolute, styles.b0, isPadVisible ? styles.mb5 : styles.mb3, styles.ph5, styles.w100]} />;

    const amountContainer = (
        <NumericInputContainer
            testID={amountContainerTestID}
            action={!canUseTouchScreen ? currencyButtonNode : null}
            error={!isInLandscapeMode ? errorNode : null}
        >
            {children ?? defaultAmountRow}
        </NumericInputContainer>
    );

    return (
        <NumericInputResponsiveLayout
            testID={testID}
            style={style}
            scrollViewStyle={scrollViewStyle}
            footerStyle={footerStyle}
            disableScrollView={disableScrollView}
            shouldRefocusOnScrollViewClick={shouldRefocusOnScrollViewClick}
            actions={actionsNode}
            pad={padNode}
            footer={footer}
            error={isInLandscapeMode ? errorNode : null}
        >
            {amountContainer}
        </NumericInputResponsiveLayout>
    );
}

/**
 * Standalone variant of `NumericInput.ResponsivePreset` that renders its own `<NumericInput>` root.
 */
function NumericResponsivePreset({
    value,
    onInputChange,
    allowNegative,
    decimals,
    maxLength,
    errorText,
    shouldUseDynamicFontSize,
    symbol,
    editingRef,
    ...presetProps
}: NumericResponsivePresetProps) {
    return (
        <NumericInputComponent
            value={value}
            onInputChange={onInputChange}
            allowNegative={allowNegative}
            decimals={decimals}
            maxLength={maxLength}
            errorText={errorText}
            shouldUseDynamicFontSize={shouldUseDynamicFontSize}
            symbol={symbol}
            ref={editingRef}
        >
            <NumericInputResponsivePreset
                symbol={symbol}
                {...presetProps}
            />
        </NumericInputComponent>
    );
}

export default NumericInputResponsivePreset;
export {NumericResponsivePreset};
