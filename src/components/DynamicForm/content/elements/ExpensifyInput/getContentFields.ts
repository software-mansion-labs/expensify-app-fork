import type {DynamicFormElement, DynamicFormExpensifyInputElement} from '@src/types/onyx';

/** The App-format fields among a page's elements, which are the ones a `showWhen` can name and the only ones that can be lists */
function getContentFields(elements: DynamicFormElement[]): DynamicFormExpensifyInputElement[] {
    return elements.filter((element): element is DynamicFormExpensifyInputElement => element.elementType === 'ExpensifyInput');
}

export default getContentFields;
