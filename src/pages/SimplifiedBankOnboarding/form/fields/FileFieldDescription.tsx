import Text from '@components/Text';

import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';

type FileFieldDescriptionProps = {
    children: string;
};

/** The muted text under the file button of a `FileField`, such as what the document must show */
function FileFieldDescription({children}: FileFieldDescriptionProps) {
    const styles = useThemeStyles();
    return <Text style={[styles.mutedTextLabel, styles.mt3]}>{children}</Text>;
}

export default FileFieldDescription;
