import useAnimatedHighlightStyle from '@hooks/useAnimatedHighlightStyle';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import variables from '@styles/variables';

import type {StyleProp, ViewStyle} from 'react-native';

type ListItemHighlightVariant = 'default' | 'searchTable';

type UseListItemHighlightParams = {
    /** Whether the row should play the highlight animation */
    shouldHighlight?: boolean;

    /** Whether the row is currently selected */
    isSelected?: boolean;

    /** Highlight animation and pressable style variant */
    variant?: ListItemHighlightVariant;

    /** Whether the viewport is wide enough for search table layout */
    isLargeScreenWidth?: boolean;

    /** Whether this is the last row in a search table (affects bottom radius) */
    isLastItem?: boolean;

    /**
     * Whether the resting background the highlight settles onto tracks selection.
     * Rows that paint `activeComponentBG` while selected must animate back to it, or the highlight
     * ends on the wrong color. Off by default so rows resting on `highlightBG` stay unchanged.
     */
    shouldTrackSelectedBackground?: boolean;

    /** Overrides the highlight border radius otherwise derived from `variant` */
    borderRadius?: number;

    /** Overrides whether the highlight animates layout alongside color, otherwise derived from `variant` */
    shouldApplyOtherStyles?: boolean;

    /** Additional styles merged onto the pressable */
    pressableStyle?: StyleProp<ViewStyle>;

    /** Additional styles merged onto the pressable wrapper */
    pressableWrapperStyle?: StyleProp<ViewStyle>;
};

/**
 * Rows owning their own pressable layout (grouped and wide/narrow search rows) take
 * `animatedHighlightStyle` alone and ignore the pressable bundle.
 */
function useListItemHighlight({
    shouldHighlight = false,
    isSelected = false,
    variant = 'default',
    isLargeScreenWidth = false,
    isLastItem = false,
    shouldTrackSelectedBackground = false,
    borderRadius,
    shouldApplyOtherStyles,
    pressableStyle,
    pressableWrapperStyle,
}: UseListItemHighlightParams = {}) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const theme = useTheme();

    const variantBorderRadius = variant === 'searchTable' ? StyleUtils.getSearchTableHighlightBorderRadius(isLargeScreenWidth) : styles.selectionListPressableItemWrapper.borderRadius;

    const animatedHighlightStyle = useAnimatedHighlightStyle({
        borderRadius: borderRadius ?? variantBorderRadius,
        shouldHighlight,
        highlightColor: theme.messageHighlightBG,
        backgroundColor: shouldTrackSelectedBackground && isSelected ? theme.activeComponentBG : theme.highlightBG,
        shouldApplyOtherStyles: shouldApplyOtherStyles ?? (variant === 'searchTable' ? !isLargeScreenWidth : true),
    });

    const basePressableStyle =
        variant === 'searchTable'
            ? [
                  styles.selectionListPressableItemWrapper,
                  styles.pv3,
                  styles.ph3,
                  styles.bgTransparent,
                  isSelected && styles.activeComponentBG,
                  styles.mh0,
                  isLargeScreenWidth &&
                      StyleUtils.getSearchTableRowPressableStyle(!!isLastItem, isSelected, {
                          vertical: variables.tableRowPaddingVertical,
                      }),
              ]
            : [styles.selectionListPressableItemWrapper, styles.mh0, shouldHighlight ? styles.bgTransparent : undefined, isSelected && styles.activeComponentBG];

    const basePressableWrapperStyle =
        variant === 'searchTable'
            ? [styles.mh5, animatedHighlightStyle, isLargeScreenWidth && isLastItem && [styles.tableBottomRadius, styles.overflowHidden]]
            : [styles.mh5, animatedHighlightStyle];

    return {
        animatedHighlightStyle,
        pressableStyle: [...basePressableStyle, pressableStyle],
        pressableWrapperStyle: [...basePressableWrapperStyle, pressableWrapperStyle],
    };
}

export default useListItemHighlight;
