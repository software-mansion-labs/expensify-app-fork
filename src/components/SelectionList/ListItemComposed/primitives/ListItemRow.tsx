import type {ForwardedFSClassProps} from '@libs/Fullstory/types';

import type {ReactNode} from 'react';
import type {StyleProp, ViewStyle} from 'react-native';

import React from 'react';
import {View} from 'react-native';

type ListItemRowProps = {
    /** Row content (text column, avatar, right-side blocks, ...) */
    children?: ReactNode;

    /** Styles for the row wrapper view */
    style?: StyleProp<ViewStyle>;

    /** Test ID of the row. Used to locate this view in end-to-end tests. */
    testID?: string;

    /** FullStory class forwarded to the row wrapper */
    forwardedFSClass?: ForwardedFSClassProps['forwardedFSClass'];
};

/**
 * The main content row inside ListItemPressable. Composed rows render it themselves (optionally
 * followed by siblings such as a footer), instead of configuring BaseListItem's wrapperStyle prop.
 */
function ListItemRow({children, style, testID, forwardedFSClass}: ListItemRowProps) {
    return (
        <View
            testID={testID}
            style={style}
            fsClass={forwardedFSClass}
        >
            {children}
        </View>
    );
}

export default ListItemRow;
