import {NumericCurrencyButton} from '@components/NumericButtons';
import NumericInputResponsiveLayout from '@components/NumericInput/layout/NumericInputResponsiveLayout';
import NumericBigNumberPad from '@components/NumericInput/primitives/NumericBigNumberPad';
import NumericFlipButton from '@components/NumericInput/primitives/NumericFlipButton';
import type {NumericInputResponsivePresetProps} from '@components/NumericInput/types';

import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';

/**
 * Scaffold of a standard full-screen numeric form: `NumericInput.ResponsiveLayout` with the standard flip button, number pad
 * and currency button. Must be rendered inside a `<NumericInput>` root, with the amount row, typically
 * `NumericInput.AmountRow`, as its children. The flip button and the pad default to the standard ones; pass `null` to render
 * none. The currency button renders when `currency` or `currencyButtonLabel` is set.
 */
function NumericInputResponsivePreset({
    currency,
    currencyButtonLabel,
    currencyButtonAccessibilityLabel,
    onCurrencyButtonPress,
    flipButton,
    pad,
    children,
    ...layoutProps
}: NumericInputResponsivePresetProps) {
    const styles = useThemeStyles();

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

    return (
        <NumericInputResponsiveLayout
            {...layoutProps}
            currencyButton={currencyButtonNode}
            flipButton={flipButtonNode}
            pad={pad !== undefined ? pad : <NumericBigNumberPad />}
        >
            {children}
        </NumericInputResponsiveLayout>
    );
}

export default NumericInputResponsivePreset;
