import BaseBanner from '@components/Banner';
import {hasText} from '@components/DynamicForm/shared';

import useThemeStyles from '@hooks/useThemeStyles';

import type {DynamicFormBannerElement, DynamicFormSchemaElement} from '@src/types/onyx';

import React from 'react';

import type {StaticElementDefinition} from './types';

function isBannerElement(element: DynamicFormSchemaElement): element is DynamicFormBannerElement {
    return element.elementType === 'Banner' && 'text' in element && hasText(element.text);
}

const bannerDefinition: StaticElementDefinition<'Banner'> = {
    parse: (element) => (isBannerElement(element) ? element : undefined),
    getCondition: () => undefined,
    introducesInputs: false,
};

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
export {bannerDefinition};
