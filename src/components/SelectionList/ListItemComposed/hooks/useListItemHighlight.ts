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

    /** Additional styles merged onto the pressable */
    pressableStyle?: StyleProp<ViewStyle>;

    /** Additional styles merged onto the pressable wrapper */
    pressableWrapperStyle?: StyleProp<ViewStyle>;
};

function useListItemHighlight({
    shouldHighlight = false,
    isSelected = false,
    variant = 'default',
    isLargeScreenWidth = false,
    isLastItem = false,
    pressableStyle,
    pressableWrapperStyle,
}: UseListItemHighlightParams = {}) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const theme = useTheme();

    const borderRadius = variant === 'searchTable' ? StyleUtils.getSearchTableHighlightBorderRadius(isLargeScreenWidth) : styles.selectionListPressableItemWrapper.borderRadius;

    const animatedHighlightStyle = useAnimatedHighlightStyle({
        borderRadius,
        shouldHighlight,
        highlightColor: theme.messageHighlightBG,
        backgroundColor: theme.highlightBG,
        shouldApplyOtherStyles: variant === 'searchTable' ? !isLargeScreenWidth : true,
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
