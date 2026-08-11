import TextWithTooltip from '@components/TextWithTooltip';

import useThemeStyles from '@hooks/useThemeStyles';

import type {ForwardedFSClassProps} from '@libs/Fullstory/types';

import type {StyleProp, TextStyle} from 'react-native';

import React from 'react';

type ListItemSubtitleProps = {
    /** Subtitle text to display */
    text: string;

    /** Whether to show tooltips on overflow */
    showTooltip: boolean;

    /** Max number of lines before truncating */
    numberOfLines?: number;

    /** FullStory class forwarded to the underlying text */
    forwardedFSClass?: ForwardedFSClassProps['forwardedFSClass'];

    /** Additional styles merged onto the subtitle */
    style?: StyleProp<TextStyle>;
};

function ListItemSubtitle({text, showTooltip, numberOfLines, forwardedFSClass, style}: ListItemSubtitleProps) {
    const styles = useThemeStyles();

    return (
        <TextWithTooltip
            shouldShowTooltip={showTooltip}
            text={text}
            numberOfLines={numberOfLines}
            style={[styles.textLabelSupporting, styles.lh16, styles.pre, style]}
            forwardedFSClass={forwardedFSClass}
        />
    );
}

export default ListItemSubtitle;
