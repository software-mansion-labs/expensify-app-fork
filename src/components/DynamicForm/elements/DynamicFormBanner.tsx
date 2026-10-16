import Banner from '@components/Banner';

import useThemeStyles from '@hooks/useThemeStyles';

import type {DynamicFormBannerElement} from '@src/types/onyx';

import React from 'react';

/** A notice between the inputs, such as a warning the user should read before answering */
function DynamicFormBanner({element}: {element: DynamicFormBannerElement}) {
    const styles = useThemeStyles();

    return (
        <Banner
            text={element.text}
            shouldShowIcon
            containerStyles={[styles.mhn5, styles.mv2]}
        />
    );
}

export default DynamicFormBanner;
