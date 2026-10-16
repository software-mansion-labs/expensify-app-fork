import Text from '@components/Text';

import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';

type DynamicFormPageHeaderProps = {
    /** Headline of the page. Nothing is drawn for it when empty. */
    title?: string;

    /** Supporting text under the headline */
    description?: string;
};

/** The headline and description that open a page of the flow */
function DynamicFormPageHeader({title, description}: DynamicFormPageHeaderProps) {
    const styles = useThemeStyles();

    return (
        <>
            {!!title && (
                <Text
                    style={[styles.textHeadlineLineHeightXXL, styles.mb3]}
                    accessibilityRole={CONST.ROLE.HEADER}
                >
                    {title}
                </Text>
            )}
            {!!description && <Text style={[styles.textSupporting, styles.mb3]}>{description}</Text>}
        </>
    );
}

export default DynamicFormPageHeader;
