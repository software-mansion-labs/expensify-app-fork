import getContentFields from '@components/DynamicForm/content/elements/ExpensifyInput/getContentFields';
import parseContent from '@components/DynamicForm/content/parseContent';
import type {DynamicFormFlowPage} from '@components/DynamicForm/flow/types';

import CONST from '@src/CONST';
import type {DynamicFormField, DynamicFormSchema} from '@src/types/onyx';

import paginate from './paginate';

function toSlug(key: string): string {
    return key
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, '-')
        .replaceAll(/^-+|-+$/g, '');
}

/** Every page's key becomes a URL-safe route segment that is unique and never the confirmation page's. Pages with no usable key get `page-N`. */
function withRouteKeys(pages: DynamicFormFlowPage[]): DynamicFormFlowPage[] {
    const takenKeys = new Set<string>([CONST.DYNAMIC_FORM.CONFIRMATION_PAGE_KEY]);
    return pages.map((page, index) => {
        const baseKey = toSlug(page.key) || `page-${index + 1}`;
        let key = baseKey;
        for (let suffix = 2; takenKeys.has(key); suffix++) {
            key = `${baseKey}-${suffix}`;
        }
        takenKeys.add(key);
        return {...page, key};
    });
}

/** The pages of a schema, as the server grouped them or as `paginate` builds them. Their content is parsed here, once for the whole flow. */
function getPages(schema: DynamicFormSchema): DynamicFormFlowPage[] {
    const pages = 'pages' in schema ? schema.pages.map((page) => ({...page, content: parseContent(page.content)})) : paginate(parseContent(schema.elements));
    return withRouteKeys(pages);
}

/** Every App-format field of every page, which is where a `showWhen` finds its controller */
function getAllFields(pages: DynamicFormFlowPage[]): DynamicFormField[] {
    return pages.flatMap((page) => getContentFields(page.content));
}

export default getPages;
export {getAllFields};
