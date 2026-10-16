import hasText from '@components/DynamicForm/content/elements/shared/hasText';
import type {StaticElementDefinition} from '@components/DynamicForm/content/elements/types';

import type {DynamicFormBannerElement, DynamicFormSchemaElement} from '@src/types/onyx';

function isBannerElement(element: DynamicFormSchemaElement): element is DynamicFormBannerElement {
    return element.elementType === 'Banner' && 'text' in element && hasText(element.text);
}

const bannerDefinition: StaticElementDefinition<'Banner'> = {
    parse: (element) => (isBannerElement(element) ? element : undefined),
    getCondition: () => undefined,
    introducesInputs: false,
};

export default bannerDefinition;
