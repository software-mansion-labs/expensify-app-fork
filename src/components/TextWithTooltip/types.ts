import type {ForwardedFSClassProps} from '@libs/Fullstory/types';

import type {StyleProp, TextStyle} from 'react-native';

type TextWithTooltipProps = ForwardedFSClassProps & {
    /** The text to display */
    text: string;

    shouldShowTooltip?: boolean;

    /** Additional styles */
    style?: StyleProp<TextStyle>;

    /** Custom number of lines for text wrapping */
    numberOfLines?: number;

    testID?: string;
};

export default TextWithTooltipProps;
