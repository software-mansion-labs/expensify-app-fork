import React from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import ComposableButton from '@components/ComposableButton';
import type {ButtonSize, ButtonVariant} from '@components/ComposableButton/types';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

const SIZES: ButtonSize[] = ['extraSmall', 'small', 'medium', 'large'];
const VARIANTS: ButtonVariant[] = ['default', 'success', 'danger'];

function getSizeProps(size: ButtonSize) {
    return {
        extraSmall: size === 'extraSmall',
        small: size === 'small',
        medium: size === 'medium',
        large: size === 'large',
    };
}

function getVariantProps(variant: ButtonVariant) {
    return {
        success: variant === 'success',
        danger: variant === 'danger',
        link: variant === 'link',
    };
}

function Row({label, children}: {label: string; children: React.ReactNode}) {
    const styles = useThemeStyles();
    return (
        <View style={styles.testRowContainer}>
            <Text style={[styles.textStrong, styles.textNormal, {width: 200}]}>{label}</Text>
            {children}
        </View>
    );
}

function SectionHeader({children}: {children: string}) {
    const styles = useThemeStyles();
    return <Text style={[styles.textHeadline, styles.mv2]}>{children}</Text>;
}

function ComposableButtonTestPage() {
    const styles = useThemeStyles();
    const theme = useTheme();
    const icons = useMemoizedLazyExpensifyIcons([
        'Plus',
        'ArrowRight',
        'Trashcan',
        'BackArrow',
        'RemoveMembers',
        'Filter',
        'DownArrow',
        'Crosshair',
        'Columns',
        'Eye',
        'Rotate',
        'Close',
        'Checkmark',
        'Crop',
        'Camera',
        'PlusMinus',
        'Star',
        'ArrowCircleClockwise',
        'Bank',
        'ReceiptPlus',
        'Copy',
        'Upload',
        'MagnifyingGlass',
        'Bookmark',
    ]);

    return (
        <ScrollView
            style={[styles.flex1, styles.p5]}
            contentContainerStyle={{gap: 8, paddingBottom: 60}}
        >
            <Text style={[styles.textHeadlineH1, styles.mb4]}>ComposableButton Test Page</Text>

            {/* ===== MATRIX: All sizes x variants ===== */}

            {/* Text Buttons — all sizes x variants */}
            <SectionHeader>Text Buttons</SectionHeader>
            {SIZES.map((size) =>
                VARIANTS.map((variant) => (
                    <Row
                        key={`text-${size}-${variant}`}
                        label={`${size} / ${variant}`}
                    >
                        <Button
                            text="Old Button"
                            onPress={() => {}}
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            {...getSizeProps(size)}
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            {...getVariantProps(variant)}
                        />
                        <ComposableButton.TextButton
                            text="New Button"
                            size={size}
                            variant={variant}
                            onPress={() => {}}
                        />
                    </Row>
                )),
            )}

            {/* Text + Left Icon */}
            <SectionHeader>Text + Left Icon</SectionHeader>
            {SIZES.map((size) =>
                VARIANTS.map((variant) => (
                    <Row
                        key={`icon-left-${size}-${variant}`}
                        label={`${size} / ${variant}`}
                    >
                        <Button
                            text="Old"
                            icon={icons.Plus}
                            onPress={() => {}}
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            {...getSizeProps(size)}
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            {...getVariantProps(variant)}
                        />
                        <ComposableButton.TextWithIcon
                            text="New"
                            icon={icons.Plus}
                            size={size}
                            variant={variant}
                            onPress={() => {}}
                        />
                    </Row>
                )),
            )}

            {/* Text + Right Icon */}
            <SectionHeader>Text + Right Arrow</SectionHeader>
            {SIZES.map((size) =>
                VARIANTS.map((variant) => (
                    <Row
                        key={`icon-right-${size}-${variant}`}
                        label={`${size} / ${variant}`}
                    >
                        <Button
                            text="Old"
                            shouldShowRightIcon
                            onPress={() => {}}
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            {...getSizeProps(size)}
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            {...getVariantProps(variant)}
                        />
                        <ComposableButton.TextWithRightIcon
                            text="New"
                            size={size}
                            variant={variant}
                            onPress={() => {}}
                        />
                    </Row>
                )),
            )}

            {/* Icon Only */}
            <SectionHeader>Icon Only</SectionHeader>
            {SIZES.map((size) =>
                VARIANTS.map((variant) => (
                    <Row
                        key={`icon-only-${size}-${variant}`}
                        label={`${size} / ${variant}`}
                    >
                        <Button
                            icon={icons.Trashcan}
                            onPress={() => {}}
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            {...getSizeProps(size)}
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            {...getVariantProps(variant)}
                        />
                        <ComposableButton.IconButton
                            icon={icons.Trashcan}
                            size={size}
                            variant={variant}
                            onPress={() => {}}
                        />
                    </Row>
                )),
            )}

            {/* Double Deck */}
            <SectionHeader>Double Deck</SectionHeader>
            {SIZES.map((size) => (
                <Row
                    key={`double-${size}`}
                    label={size}
                >
                    <Button
                        text="Pay $50.00"
                        secondLineText="with Expensify"
                        success
                        onPress={() => {}}
                        // eslint-disable-next-line react/jsx-props-no-spreading
                        {...getSizeProps(size)}
                    />
                    <ComposableButton.DoubleDeck
                        text="Pay $50.00"
                        secondLineText="with Expensify"
                        variant="success"
                        size={size}
                        onPress={() => {}}
                    />
                </Row>
            ))}

            {/* Link Buttons */}
            <SectionHeader>Link Buttons</SectionHeader>
            {SIZES.map((size) => (
                <Row
                    key={`link-${size}`}
                    label={size}
                >
                    <Button
                        text="Old Link"
                        link
                        onPress={() => {}}
                        // eslint-disable-next-line react/jsx-props-no-spreading
                        {...getSizeProps(size)}
                    />
                    <ComposableButton.Link
                        text="New Link"
                        size={size}
                        onPress={() => {}}
                    />
                </Row>
            ))}

            {/* Loading State */}
            <SectionHeader>Loading State</SectionHeader>
            {VARIANTS.map((variant) => (
                <Row
                    key={`loading-${variant}`}
                    label={`medium / ${variant}`}
                >
                    <Button
                        text="Loading"
                        isLoading
                        onPress={() => {}}
                        // eslint-disable-next-line react/jsx-props-no-spreading
                        {...getVariantProps(variant)}
                    />
                    <ComposableButton.TextButton
                        text="Loading"
                        isLoading
                        variant={variant}
                        onPress={() => {}}
                    />
                </Row>
            ))}

            {/* Disabled State */}
            <SectionHeader>Disabled State</SectionHeader>
            {VARIANTS.map((variant) => (
                <Row
                    key={`disabled-${variant}`}
                    label={`medium / ${variant}`}
                >
                    <Button
                        text="Disabled"
                        isDisabled
                        onPress={() => {}}
                        // eslint-disable-next-line react/jsx-props-no-spreading
                        {...getVariantProps(variant)}
                    />
                    <ComposableButton.TextButton
                        text="Disabled"
                        isDisabled
                        variant={variant}
                        onPress={() => {}}
                    />
                </Row>
            ))}

            {/* Border Radius Removal */}
            <SectionHeader>Border Radius Removal</SectionHeader>
            <Row label="removeRight">
                <Button
                    text="Old"
                    success
                    shouldRemoveRightBorderRadius
                    onPress={() => {}}
                />
                <ComposableButton.TextButton
                    text="New"
                    variant="success"
                    shouldRemoveRightBorderRadius
                    onPress={() => {}}
                />
            </Row>
            <Row label="removeLeft">
                <Button
                    text="Old"
                    success
                    shouldRemoveLeftBorderRadius
                    onPress={() => {}}
                />
                <ComposableButton.TextButton
                    text="New"
                    variant="success"
                    shouldRemoveLeftBorderRadius
                    onPress={() => {}}
                />
            </Row>
            <Row label="removeBoth">
                <Button
                    text="Old"
                    success
                    shouldRemoveRightBorderRadius
                    shouldRemoveLeftBorderRadius
                    onPress={() => {}}
                />
                <ComposableButton.TextButton
                    text="New"
                    variant="success"
                    shouldRemoveRightBorderRadius
                    shouldRemoveLeftBorderRadius
                    onPress={() => {}}
                />
            </Row>
            <Row label="split pair">
                <View style={styles.flexRow}>
                    <Button
                        text="Old Left"
                        success
                        shouldRemoveRightBorderRadius
                        onPress={() => {}}
                    />
                    <Button
                        text="Old Right"
                        danger
                        shouldRemoveLeftBorderRadius
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flexRow}>
                    <ComposableButton.TextButton
                        text="New Left"
                        variant="success"
                        shouldRemoveRightBorderRadius
                        onPress={() => {}}
                    />
                    <ComposableButton.TextButton
                        text="New Right"
                        variant="danger"
                        shouldRemoveLeftBorderRadius
                        onPress={() => {}}
                    />
                </View>
            </Row>

            {/* Blend Opacity */}
            <SectionHeader>Blend Opacity</SectionHeader>
            {VARIANTS.map((variant) => (
                <Row
                    key={`blend-${variant}`}
                    label={`medium / ${variant}`}
                >
                    <Button
                        text="Old Blend"
                        shouldBlendOpacity
                        onPress={() => {}}
                        // eslint-disable-next-line react/jsx-props-no-spreading
                        {...getVariantProps(variant)}
                    />
                    <ComposableButton.TextButton
                        text="New Blend"
                        shouldBlendOpacity
                        variant={variant}
                        onPress={() => {}}
                    />
                </Row>
            ))}
            <Row label="blend + disabled">
                <Button
                    text="Old"
                    success
                    isDisabled
                    shouldBlendOpacity
                    onPress={() => {}}
                />
                <ComposableButton.TextButton
                    text="New"
                    variant="success"
                    isDisabled
                    shouldBlendOpacity
                    onPress={() => {}}
                />
            </Row>

            {/* ===== REAL-WORLD EXAMPLES ===== */}
            <Text style={[styles.textHeadlineH1, styles.mb4, styles.mt5]}>Real-World Examples</Text>

            {/* 1. Form Submit — most common pattern (68 occurrences) */}
            <SectionHeader>Form Submit (68x)</SectionHeader>
            <Row label="success/large/enter">
                <Button
                    text="Confirm"
                    success
                    large
                    pressOnEnter
                    enterKeyEventListenerPriority={1}
                    onPress={() => {}}
                />
                <ComposableButton.TextButton
                    text="Confirm"
                    variant="success"
                    size="large"
                    pressOnEnter
                    enterKeyEventListenerPriority={1}
                    onPress={() => {}}
                />
            </Row>

            {/* 2. Add Category — success + Plus icon (13x icons.Plus) */}
            <SectionHeader>Add Action + Plus Icon (13x)</SectionHeader>
            <Row label="success/medium">
                <Button
                    text="Add category"
                    success
                    icon={icons.Plus}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Add category"
                    variant="success"
                    icon={icons.Plus}
                    onPress={() => {}}
                />
            </Row>
            <Row label="success/small">
                <Button
                    text="Create"
                    success
                    small
                    icon={icons.Plus}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Create"
                    variant="success"
                    size="small"
                    icon={icons.Plus}
                    onPress={() => {}}
                />
            </Row>

            {/* 3. Remove Members — destructive icon action (4x) */}
            <SectionHeader>Remove Members (4x)</SectionHeader>
            <Row label="default/medium">
                <Button
                    text="Remove from group"
                    icon={icons.RemoveMembers}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Remove from group"
                    icon={icons.RemoveMembers}
                    onPress={() => {}}
                />
            </Row>
            <Row label="disabled">
                <Button
                    text="Remove from group"
                    icon={icons.RemoveMembers}
                    isDisabled
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Remove from group"
                    icon={icons.RemoveMembers}
                    isDisabled
                    onPress={() => {}}
                />
            </Row>

            {/* 4. Dropdown Trigger — shouldShowRightIcon + DownArrow (5x) */}
            <SectionHeader>Dropdown Trigger (5x DownArrow)</SectionHeader>
            <Row label="small/rightIcon">
                <Button
                    text="USD"
                    small
                    shouldShowRightIcon
                    iconRight={icons.DownArrow}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithRightIcon
                    text="USD"
                    size="small"
                    iconRight={icons.DownArrow}
                    onPress={() => {}}
                />
            </Row>
            <Row label="success/rightIcon">
                <Button
                    text="Submit"
                    success
                    shouldShowRightIcon
                    iconRight={icons.DownArrow}
                    shouldRemoveRightBorderRadius
                    onPress={() => {}}
                />
                <ComposableButton.TextWithRightIcon
                    text="Submit"
                    variant="success"
                    iconRight={icons.DownArrow}
                    shouldRemoveRightBorderRadius
                    onPress={() => {}}
                />
            </Row>

            {/* 5. Carousel Arrow — icon-only, small, innerStyles (real: CarouselButtons.tsx) */}
            <SectionHeader>Carousel Arrow (icon-only)</SectionHeader>
            <Row label="back arrow">
                <Button
                    small
                    innerStyles={[styles.arrowIcon]}
                    icon={icons.BackArrow}
                    iconFill={theme.text}
                    onPress={() => {}}
                />
                <ComposableButton.IconButton
                    size="small"
                    icon={icons.BackArrow}
                    onPress={() => {}}
                />
            </Row>
            <Row label="forward arrow">
                <Button
                    small
                    innerStyles={[styles.arrowIcon]}
                    icon={icons.ArrowRight}
                    iconFill={theme.text}
                    onPress={() => {}}
                />
                <ComposableButton.IconButton
                    size="small"
                    icon={icons.ArrowRight}
                    onPress={() => {}}
                />
            </Row>

            {/* 6. GPS Crosshair — icon-only, no size (real: MapView.tsx) */}
            <SectionHeader>Map Crosshair (icon-only)</SectionHeader>
            <Row label="default">
                <Button
                    icon={icons.Crosshair}
                    iconFill={theme.icon}
                    onPress={() => {}}
                />
                <ComposableButton.IconButton
                    icon={icons.Crosshair}
                    onPress={() => {}}
                />
            </Row>

            {/* 7. Imported State — danger, small, both border radii removed */}
            <SectionHeader>Imported State Indicator</SectionHeader>
            <Row label="danger/noBorderRadius">
                <Button
                    danger
                    small
                    shouldRemoveLeftBorderRadius
                    shouldRemoveRightBorderRadius
                    text="Using imported state"
                    onPress={() => {}}
                />
                <ComposableButton.TextButton
                    variant="danger"
                    size="small"
                    shouldRemoveLeftBorderRadius
                    shouldRemoveRightBorderRadius
                    text="Using imported state"
                    onPress={() => {}}
                />
            </Row>

            {/* 8. Lock Account — danger + large + loading (real: LockAccountPageBase.tsx) */}
            <SectionHeader>Lock Account (danger+loading)</SectionHeader>
            <Row label="danger/large">
                <Button
                    danger
                    large
                    text="Lock account"
                    pressOnEnter
                    onPress={() => {}}
                />
                <ComposableButton.TextButton
                    variant="danger"
                    size="large"
                    text="Lock account"
                    pressOnEnter
                    onPress={() => {}}
                />
            </Row>
            <Row label="danger/large/loading">
                <Button
                    danger
                    large
                    text="Lock account"
                    isLoading
                    onPress={() => {}}
                />
                <ComposableButton.TextButton
                    variant="danger"
                    size="large"
                    text="Lock account"
                    isLoading
                    onPress={() => {}}
                />
            </Row>

            {/* 9. Link + Icon — search filter toolbar (real: SearchFiltersBarWide.tsx) */}
            <SectionHeader>Link + Icon (Search Filter)</SectionHeader>
            <Row label="link/small/Filter">
                <Button
                    link
                    small
                    shouldUseDefaultHover={false}
                    text="Filters"
                    iconFill={theme.link}
                    iconHoverFill={theme.linkHover}
                    icon={icons.Filter}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Filters"
                    variant="link"
                    size="small"
                    icon={icons.Filter}
                    onPress={() => {}}
                />
            </Row>
            <Row label="link/small/Columns">
                <Button
                    link
                    small
                    shouldUseDefaultHover={false}
                    text="Columns"
                    iconFill={theme.link}
                    iconHoverFill={theme.linkHover}
                    icon={icons.Columns}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Columns"
                    variant="link"
                    size="small"
                    icon={icons.Columns}
                    onPress={() => {}}
                />
            </Row>
            <Row label="link/small/Eye">
                <Button
                    link
                    small
                    shouldUseDefaultHover={false}
                    text="View"
                    iconFill={theme.link}
                    icon={icons.Eye}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="View"
                    variant="link"
                    size="small"
                    icon={icons.Eye}
                    onPress={() => {}}
                />
            </Row>

            {/* 10. Payment Double Deck — success + large + secondLineText (real: SettlementButton) */}
            <SectionHeader>Payment Double Deck</SectionHeader>
            <Row label="success/large">
                <Button
                    text="Pay $125.00"
                    secondLineText="with Expensify"
                    success
                    large
                    pressOnEnter
                    onPress={() => {}}
                />
                <ComposableButton.DoubleDeck
                    text="Pay $125.00"
                    secondLineText="with Expensify"
                    variant="success"
                    size="large"
                    pressOnEnter
                    onPress={() => {}}
                />
            </Row>
            <Row label="success/medium">
                <Button
                    text="Pay $125.00"
                    secondLineText="with Expensify"
                    success
                    onPress={() => {}}
                />
                <ComposableButton.DoubleDeck
                    text="Pay $125.00"
                    secondLineText="with Expensify"
                    variant="success"
                    onPress={() => {}}
                />
            </Row>

            {/* 11. Dropdown Split — shouldRemoveRightBorderRadius + shouldRemoveLeftBorderRadius (real: ButtonWithDropdownMenu) */}
            <SectionHeader>Dropdown Split Button</SectionHeader>
            <Row label="success/split">
                <View style={styles.flexRow}>
                    <Button
                        text="Approve"
                        success
                        shouldRemoveRightBorderRadius
                        onPress={() => {}}
                    />
                    <Button
                        success
                        shouldRemoveLeftBorderRadius
                        icon={icons.DownArrow}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flexRow}>
                    <ComposableButton.TextButton
                        text="Approve"
                        variant="success"
                        shouldRemoveRightBorderRadius
                        onPress={() => {}}
                    />
                    <ComposableButton.IconButton
                        variant="success"
                        shouldRemoveLeftBorderRadius
                        icon={icons.DownArrow}
                        onPress={() => {}}
                    />
                </View>
            </Row>

            {/* 12. Blend Opacity Submit — real: FormAlertWithSubmitButton */}
            <SectionHeader>Form Submit + Blend Opacity</SectionHeader>
            <Row label="success/large/blend">
                <Button
                    text="Save changes"
                    success
                    large
                    shouldBlendOpacity
                    pressOnEnter
                    onPress={() => {}}
                />
                <ComposableButton.TextButton
                    text="Save changes"
                    variant="success"
                    size="large"
                    shouldBlendOpacity
                    pressOnEnter
                    onPress={() => {}}
                />
            </Row>
            <Row label="danger/blend">
                <Button
                    text="Delete"
                    danger
                    large
                    shouldBlendOpacity
                    pressOnEnter
                    onPress={() => {}}
                />
                <ComposableButton.TextButton
                    text="Delete"
                    variant="danger"
                    size="large"
                    shouldBlendOpacity
                    pressOnEnter
                    onPress={() => {}}
                />
            </Row>

            {/* 13. Loading with icon — text+icon in loading state */}
            <SectionHeader>Loading + Icon Combos</SectionHeader>
            <Row label="text+leftIcon/loading">
                <Button
                    text="Add category"
                    success
                    icon={icons.Plus}
                    isLoading
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Add category"
                    variant="success"
                    icon={icons.Plus}
                    isLoading
                    onPress={() => {}}
                />
            </Row>
            <Row label="text+rightIcon/loading">
                <Button
                    text="Submit"
                    success
                    shouldShowRightIcon
                    iconRight={icons.DownArrow}
                    isLoading
                    onPress={() => {}}
                />
                <ComposableButton.TextWithRightIcon
                    text="Submit"
                    variant="success"
                    iconRight={icons.DownArrow}
                    isLoading
                    onPress={() => {}}
                />
            </Row>
            <Row label="iconOnly/loading">
                <Button
                    icon={icons.Trashcan}
                    isLoading
                    onPress={() => {}}
                />
                <ComposableButton.IconButton
                    icon={icons.Trashcan}
                    isLoading
                    onPress={() => {}}
                />
            </Row>

            {/* 14. Nested button — isNested=true (real: ActionCell) */}
            <SectionHeader>Nested Button (isNested)</SectionHeader>
            <Row label="small/nested">
                <Button
                    text="View"
                    small
                    isNested
                    onPress={() => {}}
                />
                <ComposableButton.TextButton
                    text="View"
                    size="small"
                    isNested
                    onPress={() => {}}
                />
            </Row>

            {/* 15. Haptic feedback — shouldEnableHapticFeedback (real: BigNumberPad) */}
            <SectionHeader>Haptic Feedback (NumberPad)</SectionHeader>
            <Row label="large/haptic">
                <Button
                    text="5"
                    large
                    shouldEnableHapticFeedback
                    onPress={() => {}}
                />
                <ComposableButton.TextButton
                    text="5"
                    size="large"
                    shouldEnableHapticFeedback
                    onPress={() => {}}
                />
            </Row>
            <Row label="medium/haptic">
                <Button
                    text="5"
                    shouldEnableHapticFeedback
                    onPress={() => {}}
                />
                <ComposableButton.TextButton
                    text="5"
                    shouldEnableHapticFeedback
                    onPress={() => {}}
                />
            </Row>

            {/* 16. Full-width (w100) buttons — most common layout (19x) */}
            <SectionHeader>Full-Width (w100) Buttons</SectionHeader>
            <Row label="w100/success/large">
                <View style={styles.flex1}>
                    <Button
                        text="Continue"
                        success
                        large
                        pressOnEnter
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextButton
                        text="Continue"
                        variant="success"
                        size="large"
                        pressOnEnter
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="w100+padding">
                <View style={styles.flex1}>
                    <Button
                        text="Save"
                        success
                        large
                        style={[styles.w100, styles.p5, styles.mtAuto]}
                        isLoading
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextButton
                        text="Save"
                        variant="success"
                        size="large"
                        style={[styles.w100, styles.p5, styles.mtAuto]}
                        isLoading
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="w100+flex1">
                <View style={[styles.flexRow, {gap: 8}]}>
                    <Button
                        text="Cancel"
                        style={[styles.flex1]}
                        onPress={() => {}}
                    />
                    <Button
                        text="Confirm"
                        success
                        style={[styles.flex1]}
                        onPress={() => {}}
                    />
                </View>
                <View style={[styles.flexRow, {gap: 8}]}>
                    <ComposableButton.TextButton
                        text="Cancel"
                        style={[styles.flex1]}
                        onPress={() => {}}
                    />
                    <ComposableButton.TextButton
                        text="Confirm"
                        variant="success"
                        style={[styles.flex1]}
                        onPress={() => {}}
                    />
                </View>
            </Row>

            {/* 17. Dynamic success/danger — GPS Start/Stop (real: GPSButtons) */}
            <SectionHeader>Dynamic Success/Danger</SectionHeader>
            <Row label="success (not tracking)">
                <View style={styles.flex1}>
                    <Button
                        text="Start tracking"
                        success
                        large
                        allowBubble
                        pressOnEnter
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextButton
                        text="Start tracking"
                        variant="success"
                        size="large"
                        allowBubble
                        pressOnEnter
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="danger (tracking)">
                <View style={styles.flex1}>
                    <Button
                        text="Stop tracking"
                        danger
                        large
                        allowBubble
                        pressOnEnter
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextButton
                        text="Stop tracking"
                        variant="danger"
                        size="large"
                        allowBubble
                        pressOnEnter
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>

            {/* 18. Receipt Toolbar — Close/Save/Rotate/Crop/Camera (real: TransactionReceiptModalContent) */}
            <SectionHeader>Receipt Toolbar</SectionHeader>
            <Row label="Close">
                <Button
                    text="Close"
                    icon={icons.Close}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Close"
                    icon={icons.Close}
                    onPress={() => {}}
                />
            </Row>
            <Row label="Save (success)">
                <Button
                    text="Save"
                    success
                    icon={icons.Checkmark}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Save"
                    variant="success"
                    icon={icons.Checkmark}
                    onPress={() => {}}
                />
            </Row>
            <Row label="Rotate">
                <Button
                    text="Rotate"
                    icon={icons.Rotate}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Rotate"
                    icon={icons.Rotate}
                    onPress={() => {}}
                />
            </Row>
            <Row label="Crop">
                <Button
                    text="Crop"
                    icon={icons.Crop}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Crop"
                    icon={icons.Crop}
                    onPress={() => {}}
                />
            </Row>
            <Row label="Camera">
                <Button
                    text="Take photo"
                    icon={icons.Camera}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Take photo"
                    icon={icons.Camera}
                    onPress={() => {}}
                />
            </Row>
            <Row label="Rotate (loading)">
                <Button
                    text="Rotate"
                    icon={icons.Rotate}
                    isLoading
                    isDisabled
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Rotate"
                    icon={icons.Rotate}
                    isLoading
                    isDisabled
                    onPress={() => {}}
                />
            </Row>

            {/* 19. Icon-only: Various (real: MapView, AvatarCropModal, Attachments) */}
            <SectionHeader>Icon-Only: Various</SectionHeader>
            <Row label="Rotate (avatar crop)">
                <Button
                    icon={icons.Rotate}
                    iconFill={theme.icon}
                    onPress={() => {}}
                />
                <ComposableButton.IconButton
                    icon={icons.Rotate}
                    onPress={() => {}}
                />
            </Row>
            <Row label="Retry">
                <Button
                    text="Retry"
                    icon={icons.ArrowCircleClockwise}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Retry"
                    icon={icons.ArrowCircleClockwise}
                    onPress={() => {}}
                />
            </Row>
            <Row label="Copy">
                <Button
                    text="Copy"
                    small
                    icon={icons.Copy}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Copy"
                    size="small"
                    icon={icons.Copy}
                    onPress={() => {}}
                />
            </Row>

            {/* 20. Currency selector — isContentCentered + PlusMinus (real: NumberWithSymbolForm) */}
            <SectionHeader>Currency / Number Selector</SectionHeader>
            <Row label="PlusMinus (small)">
                <Button
                    small
                    icon={icons.PlusMinus}
                    isContentCentered
                    onPress={() => {}}
                />
                <ComposableButton.IconButton
                    size="small"
                    icon={icons.PlusMinus}
                    onPress={() => {}}
                />
            </Row>
            <Row label="Currency dropdown">
                <Button
                    text="USD"
                    small
                    shouldShowRightIcon
                    iconRight={icons.DownArrow}
                    isContentCentered
                    onPress={() => {}}
                />
                <ComposableButton.TextWithRightIcon
                    text="USD"
                    size="small"
                    iconRight={icons.DownArrow}
                    onPress={() => {}}
                />
            </Row>
            <Row label="PlusMinus rightIcon">
                <Button
                    text="+/-"
                    small
                    shouldShowRightIcon
                    iconRight={icons.PlusMinus}
                    isContentCentered
                    onPress={() => {}}
                />
                <ComposableButton.TextWithRightIcon
                    text="+/-"
                    size="small"
                    iconRight={icons.PlusMinus}
                    onPress={() => {}}
                />
            </Row>

            {/* 21. CTA / Feature List — success + large + w100 + icon (real: FeatureList, SetupMethod) */}
            <SectionHeader>CTA Buttons</SectionHeader>
            <Row label="Bank + rightIcon">
                <View style={styles.flex1}>
                    <Button
                        text="Connect bank account"
                        success
                        large
                        icon={icons.Bank}
                        shouldShowRightIcon
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextWithIcon
                        text="Connect bank account"
                        variant="success"
                        size="large"
                        icon={icons.Bank}
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="Star (FreeTrial)">
                <Button
                    text="Save with Expensify"
                    success
                    icon={icons.Star}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Save with Expensify"
                    variant="success"
                    icon={icons.Star}
                    onPress={() => {}}
                />
            </Row>
            <Row label="Upload">
                <Button
                    text="Choose file"
                    icon={icons.Upload}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Choose file"
                    icon={icons.Upload}
                    onPress={() => {}}
                />
            </Row>

            {/* 22. Search buttons — Bookmark, MagnifyingGlass (real: SearchPageHeader) */}
            <SectionHeader>Search Buttons</SectionHeader>
            <Row label="Save search">
                <Button
                    text="Save search"
                    small
                    icon={icons.Bookmark}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Save search"
                    size="small"
                    icon={icons.Bookmark}
                    onPress={() => {}}
                />
            </Row>
            <Row label="Search (small)">
                <Button
                    text="Search"
                    small
                    icon={icons.MagnifyingGlass}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Search"
                    size="small"
                    icon={icons.MagnifyingGlass}
                    onPress={() => {}}
                />
            </Row>

            {/* 23. Quick creation — small + specific icon + custom textStyles (real: QuickCreationActionsBar) */}
            <SectionHeader>Quick Creation Bar</SectionHeader>
            <Row label="ReceiptPlus (small)">
                <Button
                    text="Expense"
                    small
                    icon={icons.ReceiptPlus}
                    onPress={() => {}}
                />
                <ComposableButton.TextWithIcon
                    text="Expense"
                    size="small"
                    icon={icons.ReceiptPlus}
                    onPress={() => {}}
                />
            </Row>

            {/* 24. shouldStayNormalOnDisable — looks normal when disabled (real: AnimatedSubmitButton, ActionCell) */}
            <SectionHeader>shouldStayNormalOnDisable</SectionHeader>
            <Row label="success/disabled/normal">
                <Button
                    text="Submit"
                    success
                    isDisabled
                    shouldStayNormalOnDisable
                    onPress={() => {}}
                />
                <ComposableButton.TextButton
                    text="Submit"
                    variant="success"
                    isDisabled
                    onPress={() => {}}
                />
            </Row>

            {/* 25. Attachment Send — success + large + custom textStyles (real: AttachmentModalBaseContent) */}
            <SectionHeader>Attachment Send</SectionHeader>
            <Row label="success/large/send">
                <Button
                    text="Send attachment"
                    success
                    large
                    pressOnEnter
                    onPress={() => {}}
                />
                <ComposableButton.TextButton
                    text="Send attachment"
                    variant="success"
                    size="large"
                    pressOnEnter
                    onPress={() => {}}
                />
            </Row>

            {/* 26. Various icon combos in all sizes */}
            <SectionHeader>Icon Variety x Sizes</SectionHeader>
            {(['small', 'medium', 'large'] as ButtonSize[]).map((size) => (
                <Row
                    key={`variety-${size}`}
                    label={size}
                >
                    <View style={[styles.flexRow, styles.flexWrap, {gap: 4}]}>
                        <Button
                            icon={icons.Plus}
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            {...getSizeProps(size)}
                            success
                            onPress={() => {}}
                        />
                        <Button
                            icon={icons.Trashcan}
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            {...getSizeProps(size)}
                            danger
                            onPress={() => {}}
                        />
                        <Button
                            icon={icons.Rotate}
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            {...getSizeProps(size)}
                            onPress={() => {}}
                        />
                        <Button
                            icon={icons.Close}
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            {...getSizeProps(size)}
                            onPress={() => {}}
                        />
                    </View>
                    <View style={[styles.flexRow, styles.flexWrap, {gap: 4}]}>
                        <ComposableButton.IconButton
                            icon={icons.Plus}
                            size={size}
                            variant="success"
                            onPress={() => {}}
                        />
                        <ComposableButton.IconButton
                            icon={icons.Trashcan}
                            size={size}
                            variant="danger"
                            onPress={() => {}}
                        />
                        <ComposableButton.IconButton
                            icon={icons.Rotate}
                            size={size}
                            onPress={() => {}}
                        />
                        <ComposableButton.IconButton
                            icon={icons.Close}
                            size={size}
                            onPress={() => {}}
                        />
                    </View>
                </Row>
            ))}

            {/* 27. Decision Modal — Two-option pattern (real: ConfirmContent, DecisionModal) */}
            <SectionHeader>Decision Modal</SectionHeader>
            <Row label="two options">
                <View style={{gap: 8}}>
                    <Button
                        text="Accept invitation"
                        success
                        large
                        pressOnEnter
                        onPress={() => {}}
                    />
                    <Button
                        text="Decline"
                        danger
                        large
                        onPress={() => {}}
                    />
                </View>
                <View style={{gap: 8}}>
                    <ComposableButton.TextButton
                        text="Accept invitation"
                        variant="success"
                        size="large"
                        pressOnEnter
                        onPress={() => {}}
                    />
                    <ComposableButton.TextButton
                        text="Decline"
                        variant="danger"
                        size="large"
                        onPress={() => {}}
                    />
                </View>
            </Row>

            {/* 28. Moderation / Action buttons (real: ReportActionItemMessage) */}
            <SectionHeader>Moderation Actions</SectionHeader>
            <Row label="default/alignStart">
                <Button
                    text="Enter signer info"
                    style={[styles.alignSelfStart, styles.mt3]}
                    onPress={() => {}}
                />
                <ComposableButton.TextButton
                    text="Enter signer info"
                    style={[styles.alignSelfStart, styles.mt3]}
                    onPress={() => {}}
                />
            </Row>
            <Row label="success/alignStart">
                <Button
                    text="Add bank account"
                    success
                    style={[styles.alignSelfStart, styles.mt3]}
                    onPress={() => {}}
                />
                <ComposableButton.TextButton
                    text="Add bank account"
                    variant="success"
                    style={[styles.alignSelfStart, styles.mt3]}
                    onPress={() => {}}
                />
            </Row>
            {/* 29. Full-Width + Left Icon (real: WorkspaceCategoriesPage, SearchActionsBarCreateButton, SetupMethod) */}
            <SectionHeader>Full-Width + Left Icon</SectionHeader>
            <Row label="w100/success/Plus">
                <View style={styles.flex1}>
                    <Button
                        text="Add category"
                        success
                        large
                        icon={icons.Plus}
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextWithIcon
                        text="Add category"
                        variant="success"
                        size="large"
                        icon={icons.Plus}
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="w100/default/Bank">
                <View style={styles.flex1}>
                    <Button
                        text="Connect bank account"
                        large
                        icon={icons.Bank}
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextWithIcon
                        text="Connect bank account"
                        size="large"
                        icon={icons.Bank}
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="w100/success/Upload">
                <View style={styles.flex1}>
                    <Button
                        text="Choose file"
                        success
                        large
                        icon={icons.Upload}
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextWithIcon
                        text="Choose file"
                        variant="success"
                        size="large"
                        icon={icons.Upload}
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="w100/success/Star">
                <View style={styles.flex1}>
                    <Button
                        text="Save with Expensify"
                        success
                        large
                        icon={icons.Star}
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextWithIcon
                        text="Save with Expensify"
                        variant="success"
                        size="large"
                        icon={icons.Star}
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="w100/Remove+disabled">
                <View style={styles.flex1}>
                    <Button
                        text="Remove from group"
                        large
                        icon={icons.RemoveMembers}
                        isDisabled
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextWithIcon
                        text="Remove from group"
                        size="large"
                        icon={icons.RemoveMembers}
                        isDisabled
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="w100/success/icon/load">
                <View style={styles.flex1}>
                    <Button
                        text="Add category"
                        success
                        large
                        icon={icons.Plus}
                        isLoading
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextWithIcon
                        text="Add category"
                        variant="success"
                        size="large"
                        icon={icons.Plus}
                        isLoading
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>

            {/* 30. Full-Width + Right Icon (real: ButtonWithDropdownMenu non-split, SetupMethod) */}
            <SectionHeader>Full-Width + Right Icon</SectionHeader>
            <Row label="w100/success/Arrow">
                <View style={styles.flex1}>
                    <Button
                        text="Submit"
                        success
                        large
                        shouldShowRightIcon
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextWithRightIcon
                        text="Submit"
                        variant="success"
                        size="large"
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="w100/success/DownArr">
                <View style={styles.flex1}>
                    <Button
                        text="Approve"
                        success
                        large
                        shouldShowRightIcon
                        iconRight={icons.DownArrow}
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextWithRightIcon
                        text="Approve"
                        variant="success"
                        size="large"
                        iconRight={icons.DownArrow}
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="w100/default/Arrow">
                <View style={styles.flex1}>
                    <Button
                        text="Select option"
                        large
                        shouldShowRightIcon
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextWithRightIcon
                        text="Select option"
                        size="large"
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="w100/rightIcon/load">
                <View style={styles.flex1}>
                    <Button
                        text="Submit"
                        success
                        large
                        shouldShowRightIcon
                        iconRight={icons.DownArrow}
                        isLoading
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextWithRightIcon
                        text="Submit"
                        variant="success"
                        size="large"
                        iconRight={icons.DownArrow}
                        isLoading
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>

            {/* 31. Full-Width Double Deck (real: SettlementButton via ButtonWithDropdownMenu) */}
            <SectionHeader>Full-Width Double Deck</SectionHeader>
            <Row label="w100/success/large">
                <View style={styles.flex1}>
                    <Button
                        text="Pay $125.00"
                        secondLineText="with Expensify"
                        success
                        large
                        pressOnEnter
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.DoubleDeck
                        text="Pay $125.00"
                        secondLineText="with Expensify"
                        variant="success"
                        size="large"
                        pressOnEnter
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="w100/success/medium">
                <View style={styles.flex1}>
                    <Button
                        text="Pay $50.00"
                        secondLineText="with Expensify"
                        success
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.DoubleDeck
                        text="Pay $50.00"
                        secondLineText="with Expensify"
                        variant="success"
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="w100/DD/loading">
                <View style={styles.flex1}>
                    <Button
                        text="Pay $125.00"
                        secondLineText="with Expensify"
                        success
                        large
                        isLoading
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.DoubleDeck
                        text="Pay $125.00"
                        secondLineText="with Expensify"
                        variant="success"
                        size="large"
                        isLoading
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="w100/DD/disabled">
                <View style={styles.flex1}>
                    <Button
                        text="Pay $125.00"
                        secondLineText="with Expensify"
                        success
                        large
                        isDisabled
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.DoubleDeck
                        text="Pay $125.00"
                        secondLineText="with Expensify"
                        variant="success"
                        size="large"
                        isDisabled
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>

            {/* 32. Full-Width Double Deck + Right Icon (real: ButtonWithDropdownMenu with secondLineText + shouldShowRightIcon) */}
            <SectionHeader>Full-Width DD + Right Icon</SectionHeader>
            <Row label="w100/DD/DownArrow">
                <View style={styles.flex1}>
                    <Button
                        text="Pay $125.00"
                        secondLineText="with Expensify"
                        success
                        large
                        shouldShowRightIcon
                        iconRight={icons.DownArrow}
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.DoubleDeck
                        text="Pay $125.00"
                        secondLineText="with Expensify"
                        variant="success"
                        size="large"
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>

            {/* 33. Full-Width Double Deck + Left Icon (real: ButtonWithDropdownMenu with secondLineText + icon) */}
            <SectionHeader>Full-Width DD + Left Icon</SectionHeader>
            <Row label="w100/DD/Plus">
                <View style={styles.flex1}>
                    <Button
                        text="Create expense"
                        secondLineText="from receipt"
                        success
                        large
                        icon={icons.Plus}
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.DoubleDeck
                        text="Create expense"
                        secondLineText="from receipt"
                        variant="success"
                        size="large"
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>

            {/* 34. Full-Width + Split Pair (real: ButtonWithDropdownMenu split mode) */}
            <SectionHeader>Full-Width Split Pair</SectionHeader>
            <Row label="w100/split/success">
                <View style={[styles.flex1, styles.flexRow]}>
                    <Button
                        text="Approve"
                        success
                        large
                        shouldRemoveRightBorderRadius
                        style={[styles.flex1]}
                        onPress={() => {}}
                    />
                    <Button
                        success
                        large
                        shouldRemoveLeftBorderRadius
                        icon={icons.DownArrow}
                        onPress={() => {}}
                    />
                </View>
                <View style={[styles.flex1, styles.flexRow]}>
                    <ComposableButton.TextButton
                        text="Approve"
                        variant="success"
                        size="large"
                        shouldRemoveRightBorderRadius
                        style={[styles.flex1]}
                        onPress={() => {}}
                    />
                    <ComposableButton.IconButton
                        variant="success"
                        size="large"
                        shouldRemoveLeftBorderRadius
                        icon={icons.DownArrow}
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="w100/split/DD">
                <View style={[styles.flex1, styles.flexRow]}>
                    <Button
                        text="Pay $125.00"
                        secondLineText="with Expensify"
                        success
                        large
                        shouldRemoveRightBorderRadius
                        style={[styles.flex1]}
                        onPress={() => {}}
                    />
                    <Button
                        success
                        large
                        shouldRemoveLeftBorderRadius
                        icon={icons.DownArrow}
                        onPress={() => {}}
                    />
                </View>
                <View style={[styles.flex1, styles.flexRow]}>
                    <ComposableButton.DoubleDeck
                        text="Pay $125.00"
                        secondLineText="with Expensify"
                        variant="success"
                        size="large"
                        shouldRemoveRightBorderRadius
                        style={[styles.flex1]}
                        onPress={() => {}}
                    />
                    <ComposableButton.IconButton
                        variant="success"
                        size="large"
                        shouldRemoveLeftBorderRadius
                        icon={icons.DownArrow}
                        onPress={() => {}}
                    />
                </View>
            </Row>

            {/* 35. Full-Width Danger variants */}
            <SectionHeader>Full-Width Danger</SectionHeader>
            <Row label="w100/danger/large">
                <View style={styles.flex1}>
                    <Button
                        text="Lock account"
                        danger
                        large
                        pressOnEnter
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextButton
                        text="Lock account"
                        variant="danger"
                        size="large"
                        pressOnEnter
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="w100/danger/icon">
                <View style={styles.flex1}>
                    <Button
                        text="Remove members"
                        danger
                        large
                        icon={icons.RemoveMembers}
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextWithIcon
                        text="Remove members"
                        variant="danger"
                        size="large"
                        icon={icons.RemoveMembers}
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>
            <Row label="w100/danger/loading">
                <View style={styles.flex1}>
                    <Button
                        text="Delete workspace"
                        danger
                        large
                        isLoading
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.TextButton
                        text="Delete workspace"
                        variant="danger"
                        size="large"
                        isLoading
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>

            {/* 36. Full-Width Icon-Only (real: FloatingGPSButton, ReceiptPreview circular) */}
            <SectionHeader>Full-Width Icon-Only</SectionHeader>
            <Row label="w100/iconOnly/success">
                <View style={styles.flex1}>
                    <Button
                        icon={icons.Plus}
                        success
                        large
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
                <View style={styles.flex1}>
                    <ComposableButton.IconButton
                        icon={icons.Plus}
                        variant="success"
                        size="large"
                        style={[styles.w100]}
                        onPress={() => {}}
                    />
                </View>
            </Row>
        </ScrollView>
    );
}

export default ComposableButtonTestPage;
