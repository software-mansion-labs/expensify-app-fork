/**
 * The pressable around an expense in an open group. The Search list's arrow keys stop on it, and it shows the focused
 * background while it has the list's focus.
 */
import {PressableWithFeedback} from '@components/Pressable';
import type {PressableWithFeedbackProps} from '@components/Pressable/PressableWithFeedback';

import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';

import CONST from '@src/CONST';

import type {StyleProp, ViewStyle} from 'react-native';

import React from 'react';

import useSearchListFocusTarget from './useSearchListFocusTarget';

// Omit would merge the pressable's two accessibility shapes, so the row takes the label an accessible pressable needs on its own.
type ExpandedTransactionPressableProps = Omit<PressableWithFeedbackProps, 'ref' | 'onFocus' | 'style' | 'accessible' | 'accessibilityLabel' | 'sentryLabel'> & {
    accessibilityLabel: string;

    /** The key of the list's focus stop for the expense */
    keyForList: string;

    /** What Enter does while the expense has focus, which should be what a click on it does */
    activate?: () => void;

    isSelected: boolean;

    isDisabled: boolean;

    /** Set by OfflineWithFeedback around the row, to strike through a pending delete */
    style?: StyleProp<ViewStyle>;
};

function ExpandedTransactionPressable({keyForList, activate, isSelected, isDisabled, style, ...pressableProps}: ExpandedTransactionPressableProps) {
    const theme = useTheme();
    const StyleUtils = useStyleUtils();
    const {ref, isFocused, onFocus} = useSearchListFocusTarget({keyForList, activate});

    return (
        <PressableWithFeedback
            {...pressableProps}
            ref={ref}
            onFocus={onFocus}
            sentryLabel={CONST.SENTRY_LABEL.SEARCH.EXPANDED_TRANSACTION_ROW}
            style={[style, isFocused && StyleUtils.getItemBackgroundColorStyle(isSelected, isFocused, isDisabled, theme.activeComponentBG, theme.hoverComponentBG)]}
        />
    );
}

export default ExpandedTransactionPressable;
