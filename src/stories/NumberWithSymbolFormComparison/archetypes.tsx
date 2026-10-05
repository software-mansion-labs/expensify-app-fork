/**
 * The NumberWithSymbolForm archetypes found in the app, each rendered with the props its call sites resolve to.
 * Every `*Form` component renders either the legacy snapshot or the adapter with the exact same props, and every
 * `*Composition` component renders the target NumericInput/FullScreenAmountLayout or NumericField composition.
 * The props of `MoneyRequestAmountInput` and `AmountForm` callers are resolved here by hand, so both implementations
 * receive what those wrappers would pass and the wrappers' own logic (formatting on blur, amount sync) stays out of the comparison.
 */
import Button from '@components/Button';
import FullScreenAmountLayout, {useFullScreenAmountLayout} from '@components/FullScreenAmountLayout';
import AutomaticFieldHint from '@components/MoneyRequestConfirmationList/sections/AutomaticFieldHint';
import NumberWithSymbolForm from '@components/NumberWithSymbolForm';
import type {NumberWithSymbolFormProps} from '@components/NumberWithSymbolForm';
import NumericField from '@components/NumericField';
import NumericInput from '@components/NumericInput';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import type {BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLocalizedCurrencySymbol} from '@libs/CurrencyUtils';
import {canUseTouchScreen as canUseTouchScreenUtil} from '@libs/DeviceCapabilities';

import variables from '@styles/variables';

import CONST from '@src/CONST';

import type {ReactNode} from 'react';

import noop from 'lodash/noop';
import React, {useRef} from 'react';
import {View} from 'react-native';

import type {ComparisonCell, FormImplementation} from './ComparisonLayout';

import {useComparisonNumberFormRef} from './ComparisonLayout';
import LegacyNumberWithSymbolForm from './LegacyNumberWithSymbolForm';

const canUseTouchScreen = canUseTouchScreenUtil();

const CURRENCY = CONST.CURRENCY.USD;
const CURRENCY_DECIMALS = 2;

/** Total of the split, which sizes the split row inputs like `useSplitParticipants` does */
const FORMATTED_SPLIT_TOTAL = '100.00';

/** Distance units a distance request can use */
type DistanceUnit = typeof CONST.CUSTOM_UNITS.DISTANCE_UNIT_KILOMETERS | typeof CONST.CUSTOM_UNITS.DISTANCE_UNIT_MILES;

type ArchetypeCompositionProps = {
    /** State owned by the comparison column */
    cell: ComparisonCell;
};

type ArchetypeFormProps = ArchetypeCompositionProps & {
    /** Implementation the props are rendered with */
    implementation: FormImplementation;
};

type ErrorArchetypeProps = {
    /** Whether to show the error the callers show after a failed submit */
    hasError?: boolean;
};

type DisabledArchetypeProps = {
    /** Whether the field is disabled */
    isDisabled?: boolean;
};

type NumberWithSymbolFormImplementationProps = NumberWithSymbolFormProps & {
    /** Implementation the props are rendered with */
    implementation: FormImplementation;
};

/** Renders the legacy snapshot or the adapter with the exact same props */
function NumberWithSymbolFormImplementation({implementation, ...props}: NumberWithSymbolFormImplementationProps) {
    if (implementation === 'legacy') {
        return <LegacyNumberWithSymbolForm {...props} />;
    }
    return <NumberWithSymbolForm {...props} />;
}

/** Values every archetype resolves the same way its call sites do */
function useArchetypeContext(hasError?: boolean) {
    const styles = useThemeStyles();
    const {translate, preferredLocale} = useLocalize();
    const currencySymbol = getLocalizedCurrencySymbol(preferredLocale, CURRENCY) ?? '';
    const errorText = hasError ? translate('common.error.invalidAmount') : undefined;

    return {styles, translate, currencySymbol, errorText};
}

/** Submit button of the full-screen IOU steps, passed as `footer` or placed in `FullScreenAmountLayout.Footer` */
function SaveButton() {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    return (
        <Button
            variant={CONST.BUTTON_VARIANT.SUCCESS}
            size={CONST.BUTTON_SIZE.LARGE}
            style={[styles.w100, canUseTouchScreen ? styles.mt5 : styles.mt0]}
            onPress={noop}
        >
            <Button.Text>{translate('common.save')}</Button.Text>
        </Button>
    );
}

type FullScreenAmountMainProps = {
    /** Sign, symbol and text input of the amount */
    children: ReactNode;

    /** Currency button, if the archetype has one */
    currencyButton?: ReactNode;

    /** Flip button, if the archetype has one */
    flipButton?: ReactNode;
};

/**
 * Main column of the full-screen compositions, placing the buttons and the error where the legacy form does. In a single
 * column the error floats over the bottom of the amount, so it never moves the amount or the pad. The actions row exists
 * only on touch screens; elsewhere the currency button sits under the amount and there is no flip button.
 */
function FullScreenAmountMain({children, currencyButton, flipButton}: FullScreenAmountMainProps) {
    const styles = useThemeStyles();
    const {isTwoColumn} = useFullScreenAmountLayout();
    const hasActions = canUseTouchScreen && (!!currencyButton || !!flipButton);

    return (
        <FullScreenAmountLayout.Main>
            <NumericInput.Container
                action={canUseTouchScreen ? null : currencyButton}
                error={isTwoColumn ? null : <NumericInput.Error style={[styles.pAbsolute, styles.b0, canUseTouchScreen ? styles.mb5 : styles.mb3]} />}
            >
                {children}
            </NumericInput.Container>
            {hasActions && (
                <NumericInput.Actions>
                    {currencyButton}
                    {flipButton}
                </NumericInput.Actions>
            )}
            {isTwoColumn && <NumericInput.Error />}
        </FullScreenAmountLayout.Main>
    );
}

/** Approximates the submit button FormProvider renders under its inputs, with the `submitButtonStyles` of the callers */
function FormProviderSubmitButton() {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    return (
        <Button
            variant={CONST.BUTTON_VARIANT.SUCCESS}
            size={CONST.BUTTON_SIZE.LARGE}
            style={[styles.mh5, styles.mt0, styles.mb5]}
            onPress={noop}
        >
            <Button.Text>{translate('common.save')}</Button.Text>
        </Button>
    );
}

/** A. Full-screen currency amount: `MoneyRequestAmountForm` through `MoneyRequestAmountInput` */
function CurrencyAmountForm({implementation, cell, hasError}: ArchetypeFormProps & ErrorArchetypeProps) {
    const {styles, translate, currencySymbol, errorText} = useArchetypeContext(hasError);
    const numberFormRef = useComparisonNumberFormRef();

    return (
        // MoneyRequestAmountForm wraps the input in a ScrollView of its own
        <ScrollView contentContainerStyle={styles.flexGrow1}>
            <NumberWithSymbolFormImplementation
                implementation={implementation}
                value={cell.value}
                onInputChange={cell.onInputChange}
                numberFormRef={numberFormRef}
                decimals={CURRENCY_DECIMALS}
                currency={CURRENCY}
                symbol={currencySymbol}
                symbolPosition={CONST.TEXT_INPUT_SYMBOL_POSITION.PREFIX}
                onSymbolButtonPress={noop}
                isSymbolPressable
                shouldShowBigNumberPad={canUseTouchScreen}
                shouldUseDynamicFontSize
                autoGrowExtraSpace={variables.w80}
                style={styles.iouAmountTextInput}
                containerStyle={styles.iouAmountTextInputContainer}
                touchableInputWrapperStyle={styles.heightUndefined}
                allowFlippingAmount
                isNegative={cell.isNegative}
                toggleNegative={cell.toggleNegative}
                clearNegative={cell.clearNegative}
                errorText={errorText}
                footer={<SaveButton />}
                accessibilityLabel={`${translate('iou.amount')} (${CURRENCY})`}
                testID="moneyRequestAmountInput"
            />
        </ScrollView>
    );
}

function CurrencyAmountComposition({cell, hasError}: ArchetypeCompositionProps & ErrorArchetypeProps) {
    const {styles, translate, currencySymbol, errorText} = useArchetypeContext(hasError);
    const numberFormRef = useComparisonNumberFormRef();

    return (
        <NumericInput
            value={cell.value}
            onInputChange={cell.onInputChange}
            ref={numberFormRef}
            decimals={CURRENCY_DECIMALS}
            errorText={errorText}
            allowNegative
            shouldUseDynamicFontSize
            symbol={currencySymbol}
        >
            <FullScreenAmountLayout>
                <FullScreenAmountLayout.Body>
                    <FullScreenAmountMain
                        currencyButton={
                            <NumericInput.CurrencyButton
                                currency={CURRENCY}
                                onPress={noop}
                                style={styles.minWidth18}
                            />
                        }
                        flipButton={<NumericInput.FlipButton style={styles.minWidth18} />}
                    >
                        <NumericInput.MinusSign />
                        <NumericInput.Symbol>{currencySymbol}</NumericInput.Symbol>
                        <NumericInput.TextInput
                            autoGrowExtraSpace={variables.w80}
                            style={styles.iouAmountTextInput}
                            containerStyle={styles.iouAmountTextInputContainer}
                            touchableInputWrapperStyle={styles.heightUndefined}
                            accessibilityLabel={`${translate('iou.amount')} (${CURRENCY})`}
                            testID="moneyRequestAmountInput"
                        />
                    </FullScreenAmountMain>
                    <FullScreenAmountLayout.Pad>
                        <NumericInput.BigNumberPad />
                    </FullScreenAmountLayout.Pad>
                </FullScreenAmountLayout.Body>
                <FullScreenAmountLayout.Footer>
                    <SaveButton />
                </FullScreenAmountLayout.Footer>
            </FullScreenAmountLayout>
        </NumericInput>
    );
}

/** B. Full-screen amount inside a FormProvider: `AmountForm` without `displayAsTextInput` (PolicyDistanceRateEditPage) */
function FormAmountForm({implementation, cell, hasError}: ArchetypeFormProps & ErrorArchetypeProps) {
    const {styles, currencySymbol, errorText} = useArchetypeContext(hasError);
    const numberFormRef = useComparisonNumberFormRef();

    return (
        <View style={styles.flex1}>
            <View style={styles.flex1}>
                <NumberWithSymbolFormImplementation
                    implementation={implementation}
                    value={cell.value}
                    onInputChange={cell.onInputChange}
                    numberFormRef={numberFormRef}
                    decimals={CONST.MAX_TAX_RATE_DECIMAL_PLACES}
                    currency={CURRENCY}
                    symbol={currencySymbol}
                    symbolPosition={CONST.TEXT_INPUT_SYMBOL_POSITION.PREFIX}
                    isSymbolPressable={false}
                    hideSymbol={false}
                    displayAsTextInput={false}
                    shouldShowCurrencyButton={false}
                    style={styles.iouAmountTextInput}
                    containerStyle={styles.iouAmountTextInputContainer}
                    touchableInputWrapperStyle={styles.heightUndefined}
                    errorText={errorText}
                    disabled={false}
                />
            </View>
            <FormProviderSubmitButton />
        </View>
    );
}

function FormAmountComposition({cell, hasError}: ArchetypeCompositionProps & ErrorArchetypeProps) {
    const {styles, currencySymbol, errorText} = useArchetypeContext(hasError);
    const numberFormRef = useComparisonNumberFormRef();

    return (
        // The FormProvider renders its submit button under the input, outside the layout, so there is no footer
        <View style={styles.flex1}>
            <View style={styles.flex1}>
                <NumericInput
                    value={cell.value}
                    onInputChange={cell.onInputChange}
                    ref={numberFormRef}
                    decimals={CONST.MAX_TAX_RATE_DECIMAL_PLACES}
                    errorText={errorText}
                >
                    <FullScreenAmountLayout>
                        <FullScreenAmountLayout.Body>
                            <FullScreenAmountMain>
                                <NumericInput.Symbol>{currencySymbol}</NumericInput.Symbol>
                                <NumericInput.TextInput
                                    style={styles.iouAmountTextInput}
                                    containerStyle={styles.iouAmountTextInputContainer}
                                    touchableInputWrapperStyle={styles.heightUndefined}
                                />
                            </FullScreenAmountMain>
                            <FullScreenAmountLayout.Pad>
                                <NumericInput.BigNumberPad />
                            </FullScreenAmountLayout.Pad>
                        </FullScreenAmountLayout.Body>
                    </FullScreenAmountLayout>
                </NumericInput>
            </View>
            <FormProviderSubmitButton />
        </View>
    );
}

type DistanceArchetypeProps = {
    /** Unit displayed as the suffix */
    unit: DistanceUnit;
};

/** C1. Full-screen distance with a unit suffix: `DistanceManualTabContent` and `DynamicIOURequestStepDistanceManual` */
function DistanceForm({implementation, cell, hasError, unit}: ArchetypeFormProps & ErrorArchetypeProps & DistanceArchetypeProps) {
    const {styles, translate, errorText} = useArchetypeContext(hasError);
    const numberFormRef = useComparisonNumberFormRef();

    return (
        <NumberWithSymbolFormImplementation
            implementation={implementation}
            value={cell.value}
            onInputChange={cell.onInputChange}
            numberFormRef={numberFormRef}
            shouldUseDynamicFontSize
            decimals={CONST.DISTANCE_DECIMAL_PLACES}
            symbol={unit}
            symbolPosition={CONST.TEXT_INPUT_SYMBOL_POSITION.SUFFIX}
            isSymbolPressable={false}
            symbolTextStyle={styles.textSupporting}
            style={styles.iouAmountTextInput}
            containerStyle={styles.iouAmountTextInputContainer}
            autoGrowExtraSpace={variables.w80}
            touchableInputWrapperStyle={styles.heightUndefined}
            errorText={errorText}
            accessibilityLabel={`${translate('common.distance')} (${translate(`common.${unit}`)})`}
            footer={<SaveButton />}
        />
    );
}

function DistanceComposition({cell, hasError, unit}: ArchetypeCompositionProps & ErrorArchetypeProps & DistanceArchetypeProps) {
    const {styles, translate, errorText} = useArchetypeContext(hasError);
    const numberFormRef = useComparisonNumberFormRef();

    return (
        <NumericInput
            value={cell.value}
            onInputChange={cell.onInputChange}
            ref={numberFormRef}
            decimals={CONST.DISTANCE_DECIMAL_PLACES}
            errorText={errorText}
            shouldUseDynamicFontSize
            symbol={unit}
        >
            <FullScreenAmountLayout>
                <FullScreenAmountLayout.Body>
                    <FullScreenAmountMain>
                        <NumericInput.TextInput
                            autoGrowExtraSpace={variables.w80}
                            style={styles.iouAmountTextInput}
                            containerStyle={styles.iouAmountTextInputContainer}
                            touchableInputWrapperStyle={styles.heightUndefined}
                            accessibilityLabel={`${translate('common.distance')} (${translate(`common.${unit}`)})`}
                        />
                        <NumericInput.Symbol textStyle={styles.textSupporting}>{unit}</NumericInput.Symbol>
                    </FullScreenAmountMain>
                    <FullScreenAmountLayout.Pad>
                        <NumericInput.BigNumberPad />
                    </FullScreenAmountLayout.Pad>
                </FullScreenAmountLayout.Body>
                <FullScreenAmountLayout.Footer>
                    <SaveButton />
                </FullScreenAmountLayout.Footer>
            </FullScreenAmountLayout>
        </NumericInput>
    );
}

/** C2. Full-screen hours with a unit suffix and no `value`, only seeded through `numberFormRef`: `IOURequestStepHours` */
function HoursForm({implementation, cell, hasError}: ArchetypeFormProps & ErrorArchetypeProps) {
    const {styles, translate, errorText} = useArchetypeContext(hasError);
    const numberFormRef = useComparisonNumberFormRef();

    return (
        <NumberWithSymbolFormImplementation
            implementation={implementation}
            symbol={translate('iou.timeTracking.hrs')}
            shouldUseDynamicFontSize
            symbolPosition={CONST.TEXT_INPUT_SYMBOL_POSITION.SUFFIX}
            isSymbolPressable={false}
            decimals={CONST.HOURS_DECIMAL_PLACES}
            autoGrowExtraSpace={variables.w80}
            shouldShowBigNumberPad={canUseTouchScreen}
            numberFormRef={numberFormRef}
            style={styles.iouAmountTextInput}
            containerStyle={styles.iouAmountTextInputContainer}
            errorText={errorText}
            touchableInputWrapperStyle={styles.heightUndefined}
            onInputChange={cell.onInputChange}
            footer={<SaveButton />}
        />
    );
}

function HoursComposition({cell, hasError}: ArchetypeCompositionProps & ErrorArchetypeProps) {
    const {styles, translate, errorText} = useArchetypeContext(hasError);
    const numberFormRef = useComparisonNumberFormRef();
    const symbol = translate('iou.timeTracking.hrs');

    return (
        <NumericInput
            onInputChange={cell.onInputChange}
            ref={numberFormRef}
            decimals={CONST.HOURS_DECIMAL_PLACES}
            errorText={errorText}
            shouldUseDynamicFontSize
            symbol={symbol}
        >
            <FullScreenAmountLayout>
                <FullScreenAmountLayout.Body>
                    <FullScreenAmountMain>
                        <NumericInput.TextInput
                            autoGrowExtraSpace={variables.w80}
                            style={styles.iouAmountTextInput}
                            containerStyle={styles.iouAmountTextInputContainer}
                            touchableInputWrapperStyle={styles.heightUndefined}
                        />
                        <NumericInput.Symbol>{symbol}</NumericInput.Symbol>
                    </FullScreenAmountMain>
                    <FullScreenAmountLayout.Pad>
                        <NumericInput.BigNumberPad />
                    </FullScreenAmountLayout.Pad>
                </FullScreenAmountLayout.Body>
                <FullScreenAmountLayout.Footer>
                    <SaveButton />
                </FullScreenAmountLayout.Footer>
            </FullScreenAmountLayout>
        </NumericInput>
    );
}

/** D. Full-screen right-aligned percentage inside a FormProvider: `ValuePage` */
function PercentageForm({implementation, cell, hasError}: ArchetypeFormProps & ErrorArchetypeProps) {
    const {styles, errorText} = useArchetypeContext(hasError);
    const numberFormRef = useComparisonNumberFormRef();

    return (
        <View style={styles.flex1}>
            <View style={styles.flex1}>
                <NumberWithSymbolFormImplementation
                    implementation={implementation}
                    value={cell.value}
                    onInputChange={cell.onInputChange}
                    numberFormRef={numberFormRef}
                    decimals={CONST.MAX_TAX_RATE_DECIMAL_PLACES}
                    maxLength={CONST.MAX_TAX_RATE_INTEGER_PLACES}
                    symbol="%"
                    symbolPosition={CONST.TEXT_INPUT_SYMBOL_POSITION.SUFFIX}
                    autoGrowExtraSpace={variables.w80}
                    isSymbolPressable={false}
                    autoGrowMarginSide="left"
                    style={[styles.iouAmountTextInput, styles.textAlignRight]}
                    containerStyle={styles.iouAmountTextInputContainer}
                    errorText={errorText}
                />
            </View>
            <FormProviderSubmitButton />
        </View>
    );
}

/** ValuePage composed like `WorkspaceCreateTaxValuePage`, with the input props and the FormProvider submit button of ValuePage */
function PercentageComposition({cell, hasError}: ArchetypeCompositionProps & ErrorArchetypeProps) {
    const {styles, errorText} = useArchetypeContext(hasError);
    const numberFormRef = useComparisonNumberFormRef();

    return (
        // The FormProvider renders its submit button under the input, outside the layout, so there is no footer
        <View style={styles.flex1}>
            <View style={styles.flex1}>
                <NumericInput
                    value={cell.value}
                    onInputChange={cell.onInputChange}
                    ref={numberFormRef}
                    decimals={CONST.MAX_TAX_RATE_DECIMAL_PLACES}
                    maxLength={CONST.MAX_TAX_RATE_INTEGER_PLACES}
                    errorText={errorText}
                >
                    <FullScreenAmountLayout>
                        <FullScreenAmountLayout.Body>
                            <FullScreenAmountMain>
                                <NumericInput.TextInput
                                    autoGrowExtraSpace={variables.w80}
                                    autoGrowMarginSide="left"
                                    style={[styles.iouAmountTextInput, styles.textAlignRight]}
                                    containerStyle={styles.iouAmountTextInputContainer}
                                />
                                <NumericInput.Symbol>%</NumericInput.Symbol>
                            </FullScreenAmountMain>
                            <FullScreenAmountLayout.Pad>
                                <NumericInput.BigNumberPad />
                            </FullScreenAmountLayout.Pad>
                        </FullScreenAmountLayout.Body>
                    </FullScreenAmountLayout>
                </NumericInput>
            </View>
            <FormProviderSubmitButton />
        </View>
    );
}

/** E1. Plain inline field: `TaxFields`, and the `AmountForm` callers with `displayAsTextInput` */
function InlineAmountForm({implementation, cell, hasError, isDisabled}: ArchetypeFormProps & ErrorArchetypeProps & DisabledArchetypeProps) {
    const {styles, translate, currencySymbol, errorText} = useArchetypeContext(hasError);
    const numberFormRef = useComparisonNumberFormRef();

    return (
        <View style={[styles.mh4, styles.mv2]}>
            <NumberWithSymbolFormImplementation
                implementation={implementation}
                numberFormRef={numberFormRef}
                displayAsTextInput
                autoFocus={false}
                value={cell.value}
                decimals={CURRENCY_DECIMALS}
                currency={CURRENCY}
                symbol={currencySymbol}
                label={translate('iou.taxAmount')}
                errorText={errorText}
                onInputChange={cell.onInputChange}
                shouldShowBigNumberPad={false}
                disabled={isDisabled}
            />
        </View>
    );
}

/** The NumericField path `AmountForm` already renders for `displayAsTextInput` without a currency button */
function InlineAmountComposition({cell, hasError, isDisabled}: ArchetypeCompositionProps & ErrorArchetypeProps & DisabledArchetypeProps) {
    const {styles, translate, currencySymbol, errorText} = useArchetypeContext(hasError);
    const numberFormRef = useComparisonNumberFormRef();
    const label = translate('iou.taxAmount');

    return (
        <View style={[styles.mh4, styles.mv2]}>
            <NumericField
                value={cell.value}
                onInputChange={cell.onInputChange}
                decimals={CURRENCY_DECIMALS}
                errorText={errorText}
                ref={numberFormRef}
            >
                <NumericField.TextInput
                    prefixCharacter={currencySymbol}
                    accessibilityLabel={label}
                    label={label}
                    disabled={isDisabled}
                    autoFocus={false}
                />
            </NumericField>
        </View>
    );
}

/** E2. Inline field with a unit dropdown and a hidden currency symbol: `ChronosScheduleOOOPage` through `AmountForm` */
function InlineDurationForm({implementation, cell}: ArchetypeFormProps) {
    const {styles, translate, currencySymbol} = useArchetypeContext();
    const numberFormRef = useComparisonNumberFormRef();
    const durationUnitButtonLabel = translate('chronos.hour');

    return (
        <View style={[styles.ph5, styles.pv4]}>
            <NumberWithSymbolFormImplementation
                implementation={implementation}
                label={translate('chronos.durationAmount')}
                value={cell.value}
                decimals={2}
                currency={CURRENCY}
                displayAsTextInput
                onInputChange={cell.onInputChange}
                onSymbolButtonPress={noop}
                numberFormRef={numberFormRef}
                symbol={currencySymbol}
                symbolPosition={CONST.TEXT_INPUT_SYMBOL_POSITION.PREFIX}
                isSymbolPressable
                hideSymbol
                shouldShowCurrencyButton
                currencyButtonLabel={durationUnitButtonLabel}
                currencyButtonAccessibilityLabel={`${translate('common.select')}, ${durationUnitButtonLabel}`}
                disabled={false}
            />
        </View>
    );
}

function InlineDurationComposition({cell}: ArchetypeCompositionProps) {
    const {styles, translate} = useArchetypeContext();
    const numberFormRef = useComparisonNumberFormRef();
    const durationUnitButtonLabel = translate('chronos.hour');
    const label = translate('chronos.durationAmount');

    return (
        <View style={[styles.ph5, styles.pv4]}>
            <NumericField
                value={cell.value}
                onInputChange={cell.onInputChange}
                decimals={2}
                ref={numberFormRef}
            >
                <NumericField.TextInput
                    accessibilityLabel={label}
                    label={label}
                    autoFocus={false}
                    rightHandSideComponent={
                        <NumericField.CurrencyButton
                            currency={durationUnitButtonLabel}
                            accessibilityLabel={`${translate('common.select')}, ${durationUnitButtonLabel}`}
                            onPress={noop}
                        />
                    }
                />
            </NumericField>
        </View>
    );
}

type InlineSignedAmountArchetypeProps = {
    /** Whether SmartScan's "Automatic" hint is shown before the buttons */
    shouldShowAutomaticHint?: boolean;
};

/** E3. Inline signed amount with flip and currency buttons: `AmountField` on the confirmation page */
function InlineSignedAmountForm({
    implementation,
    cell,
    hasError,
    isDisabled,
    shouldShowAutomaticHint,
}: ArchetypeFormProps & ErrorArchetypeProps & DisabledArchetypeProps & InlineSignedAmountArchetypeProps) {
    const {styles, translate, currencySymbol, errorText} = useArchetypeContext(hasError);
    const numberFormRef = useComparisonNumberFormRef();

    return (
        <View style={[styles.mh4, styles.mv2]}>
            <NumberWithSymbolFormImplementation
                implementation={implementation}
                // AmountField reads the input through `ref`, the story also passes `numberFormRef` for the toolbar actions
                numberFormRef={numberFormRef}
                displayAsTextInput
                autoFocus={false}
                value={cell.value}
                decimals={CURRENCY_DECIMALS}
                currency={CURRENCY}
                symbol={currencySymbol}
                label={translate('iou.amount')}
                errorText={errorText}
                onInputChange={cell.onInputChange}
                allowNegativeInput
                shouldShowFlipButton
                shouldShowCurrencyButton
                shouldShowBigNumberPad={false}
                onCurrencyButtonPress={noop}
                leadingRightHandSideComponent={shouldShowAutomaticHint ? <AutomaticFieldHint /> : undefined}
                shouldUseBorderlessButtons
                disabled={isDisabled}
            />
        </View>
    );
}

function InlineSignedAmountComposition({
    cell,
    hasError,
    isDisabled,
    shouldShowAutomaticHint,
}: ArchetypeCompositionProps & ErrorArchetypeProps & DisabledArchetypeProps & InlineSignedAmountArchetypeProps) {
    const {styles, translate, currencySymbol, errorText} = useArchetypeContext(hasError);
    const numberFormRef = useComparisonNumberFormRef();
    const label = translate('iou.amount');

    const rightHandSideComponent = (
        <View style={[styles.flexRow, styles.gap2, styles.alignItemsCenter]}>
            {!!shouldShowAutomaticHint && <AutomaticFieldHint />}
            <NumericField.FlipButton
                isDisabled={isDisabled}
                isBorderless
            />
            <NumericField.CurrencyButton
                currency={CURRENCY}
                onPress={noop}
                isDisabled={isDisabled}
                isBorderless
            />
        </View>
    );

    return (
        <View style={[styles.mh4, styles.mv2]}>
            <NumericField
                value={cell.value}
                onInputChange={cell.onInputChange}
                decimals={CURRENCY_DECIMALS}
                allowNegative
                errorText={errorText}
                ref={numberFormRef}
            >
                <NumericField.TextInput
                    prefixCharacter={currencySymbol}
                    accessibilityLabel={label}
                    label={label}
                    disabled={isDisabled}
                    autoFocus={false}
                    rightHandSideComponent={rightHandSideComponent}
                />
            </NumericField>
        </View>
    );
}

type SplitRowArchetypeProps = {
    /** `participant` is the confirmation page split (`useSplitParticipants`), `splitExpense` the split expense page (`SplitAmountInput`) */
    variant: 'participant' | 'splitExpense';
};

/** F. Compact split row: `useSplitParticipants`, `SplitAmountInput` and `OptionRow` through `MoneyRequestAmountInput` */
function SplitRowForm({implementation, cell, variant}: ArchetypeFormProps & SplitRowArchetypeProps) {
    const {styles, translate, currencySymbol} = useArchetypeContext();
    const numberFormRef = useComparisonNumberFormRef();
    const isSplitExpense = variant === 'splitExpense';

    return (
        <View style={[styles.flexRow, styles.alignItemsCenter, styles.ph5, styles.pv3]}>
            <Text style={[styles.flex1, styles.textStrong]}>Participant</Text>
            <NumberWithSymbolFormImplementation
                implementation={implementation}
                value={cell.value}
                onInputChange={cell.onInputChange}
                numberFormRef={numberFormRef}
                decimals={CURRENCY_DECIMALS}
                currency={CURRENCY}
                symbol={currencySymbol}
                symbolPosition={CONST.TEXT_INPUT_SYMBOL_POSITION.PREFIX}
                hideSymbol
                isSymbolPressable={false}
                shouldShowBigNumberPad={false}
                autoGrow={false}
                disableKeyboard={false}
                prefixCharacter={currencySymbol}
                hideFocusedState={false}
                shouldApplyPaddingToContainer
                shouldUseDefaultLineHeightForPrefix={false}
                shouldWrapInputInContainer={false}
                style={isSplitExpense ? [styles.lineHeightUndefined] : [styles.optionRowAmountInput, styles.lineHeightUndefined]}
                containerStyle={[styles.textInputContainer, styles.pl2, styles.pr1]}
                prefixStyle={styles.lineHeightUndefined}
                prefixContainerStyle={[styles.pv0, styles.h100]}
                touchableInputWrapperStyle={[styles.ml3]}
                maxLength={FORMATTED_SPLIT_TOTAL.length + 1}
                contentWidth={(FORMATTED_SPLIT_TOTAL.length + 1) * CONST.CHARACTER_WIDTH}
                allowNegativeInput={isSplitExpense}
                keyboardType={isSplitExpense ? CONST.KEYBOARD_TYPE.NUMBERS_AND_PUNCTUATION : undefined}
                submitBehavior={isSplitExpense ? 'blurAndSubmit' : undefined}
                accessibilityLabel={`${translate('iou.amount')} (${CURRENCY})`}
            />
        </View>
    );
}

function SplitRowComposition({cell, variant}: ArchetypeCompositionProps & SplitRowArchetypeProps) {
    const {styles, translate, currencySymbol} = useArchetypeContext();
    const {numberFormat} = useLocalize();
    const numberFormRef = useComparisonNumberFormRef();
    const isSplitExpense = variant === 'splitExpense';

    return (
        <View style={[styles.flexRow, styles.alignItemsCenter, styles.ph5, styles.pv3]}>
            <Text style={[styles.flex1, styles.textStrong]}>Participant</Text>
            <NumericField
                value={cell.value}
                onInputChange={cell.onInputChange}
                allowNegative={isSplitExpense}
                decimals={CURRENCY_DECIMALS}
                maxLength={FORMATTED_SPLIT_TOTAL.length + 1}
                ref={numberFormRef}
            >
                <NumericField.TextInput
                    prefixCharacter={currencySymbol}
                    accessibilityLabel={`${translate('iou.amount')} (${CURRENCY})`}
                    autoGrow={false}
                    disableKeyboard={false}
                    hideFocusedState={false}
                    shouldApplyPaddingToContainer
                    shouldUseDefaultLineHeightForPrefix={false}
                    style={isSplitExpense ? [styles.lineHeightUndefined, styles.pr1] : [styles.optionRowAmountInput, styles.lineHeightUndefined, styles.pr1]}
                    containerStyle={[styles.textInputContainer, styles.pl2, styles.pr1]}
                    prefixStyle={styles.lineHeightUndefined}
                    prefixContainerStyle={[styles.pv0, styles.h100]}
                    touchableInputWrapperStyle={[styles.ml3]}
                    contentWidth={(FORMATTED_SPLIT_TOTAL.length + 1) * CONST.CHARACTER_WIDTH}
                    keyboardType={isSplitExpense ? CONST.KEYBOARD_TYPE.NUMBERS_AND_PUNCTUATION : undefined}
                    submitBehavior={isSplitExpense ? 'blurAndSubmit' : undefined}
                    placeholder={numberFormat(0)}
                    shouldUseFullInputHeight
                    autoCorrect={false}
                    spellCheck={false}
                />
            </NumericField>
        </View>
    );
}

/** G. Editable table cell with a parent-owned sign: `TotalCell` through `MoneyRequestAmountInput` */
function TableCellForm({implementation, cell}: ArchetypeFormProps) {
    const {styles, translate, currencySymbol} = useArchetypeContext();
    const numberFormRef = useComparisonNumberFormRef();

    return (
        // The focused EditableCell container TotalCell renders the input in
        <View style={[styles.editableCell, styles.editableCellFocus]}>
            <NumberWithSymbolFormImplementation
                implementation={implementation}
                value={cell.value}
                onInputChange={cell.onInputChange}
                numberFormRef={numberFormRef}
                decimals={CURRENCY_DECIMALS}
                currency={CURRENCY}
                symbol={currencySymbol}
                symbolPosition={CONST.TEXT_INPUT_SYMBOL_POSITION.PREFIX}
                isSymbolPressable={false}
                disableKeyboard={false}
                hideFocusedState
                shouldShowBigNumberPad={false}
                shouldWrapInputInContainer={false}
                shouldApplyPaddingToContainer={false}
                shouldRefocusOnScrollViewClick
                allowFlippingAmount
                isNegative={cell.isNegative}
                toggleNegative={cell.toggleNegative}
                clearNegative={cell.clearNegative}
                containerStyle={[styles.editableCellInputStyle]}
                style={[styles.textAlignRight, styles.pr0]}
                touchableInputWrapperStyle={styles.editableCellInputStyle}
                scrollViewStyle={[styles.flexRow, styles.justifyContentEnd]}
                symbolTextStyle={[styles.editableCellSymbolStyle]}
                negativeSymbolStyle={styles.editableCellSymbolStyle}
                accessibilityLabel={`${translate('iou.amount')} (${CURRENCY})`}
            />
        </View>
    );
}

function TableCellComposition({cell}: ArchetypeCompositionProps) {
    const {styles, translate, currencySymbol} = useArchetypeContext();
    const numberFormRef = useComparisonNumberFormRef();
    const textInputRef = useRef<BaseTextInputRef | null>(null);

    return (
        <View style={[styles.editableCell, styles.editableCellFocus]}>
            <ScrollView
                contentContainerStyle={[styles.flexGrow1, styles.flexRow, styles.justifyContentEnd]}
                style={[styles.flexGrow0, styles.cursorAuto]}
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    textInputRef.current?.focus();
                }}
            >
                <NumericInput
                    value={cell.value}
                    onInputChange={cell.onInputChange}
                    allowNegative
                    decimals={CURRENCY_DECIMALS}
                    symbol={currencySymbol}
                    ref={numberFormRef}
                >
                    <NumericInput.MinusSign style={styles.editableCellSymbolStyle} />
                    <View style={[styles.flexRow, styles.alignItemsCenter, styles.gap1]}>
                        <NumericInput.Symbol textStyle={styles.editableCellSymbolStyle}>{currencySymbol}</NumericInput.Symbol>
                    </View>
                    <NumericInput.TextInput
                        ref={textInputRef}
                        accessibilityLabel={`${translate('iou.amount')} (${CURRENCY})`}
                        disableKeyboard={false}
                        hideFocusedState
                        style={[styles.textAlignRight, styles.pr0]}
                        containerStyle={styles.editableCellInputStyle}
                        touchableInputWrapperStyle={styles.editableCellInputStyle}
                    />
                </NumericInput>
            </ScrollView>
        </View>
    );
}

export {
    CurrencyAmountComposition,
    CurrencyAmountForm,
    DistanceComposition,
    DistanceForm,
    FormAmountComposition,
    FormAmountForm,
    HoursComposition,
    HoursForm,
    InlineAmountComposition,
    InlineAmountForm,
    InlineDurationComposition,
    InlineDurationForm,
    InlineSignedAmountComposition,
    InlineSignedAmountForm,
    PercentageComposition,
    PercentageForm,
    SplitRowComposition,
    SplitRowForm,
    TableCellComposition,
    TableCellForm,
};
