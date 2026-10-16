import BaseBanner from '@components/Banner';

import useThemeStyles from '@hooks/useThemeStyles';

import type {DynamicFormBannerElement} from '@src/types/onyx';

import React from 'react';

type BannerProps = {
    element: DynamicFormBannerElement;
};

/** A notice between the inputs, such as a warning the user should read before answering */
function Banner({element}: BannerProps) {
    const styles = useThemeStyles();

    return (
        <BaseBanner
            text={element.text}
            shouldShowIcon
            containerStyles={[styles.mhn5, styles.mv2]}
        />
    );
}

export default Banner;
