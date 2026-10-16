import type {Choice} from '@components/RadioButtons';

import type {DynamicFormHTMLInputElement} from '@src/types/onyx';

function findAllowedValue(input: DynamicFormHTMLInputElement, answer: string) {
    return input.valuesAllowed?.find((value) => value.key === answer);
}

/** The allowed values of a select or radio input, as the choices its picker lists */
function getHTMLInputChoices(input: DynamicFormHTMLInputElement): Choice[] {
    return (input.valuesAllowed ?? []).map((value) => ({value: value.key, label: value.name}));
}

function isAllowedValue(input: DynamicFormHTMLInputElement, answer: string): boolean {
    return !!findAllowedValue(input, answer);
}

/** The name Wise gives an allowed value, or the answer itself once it is no longer allowed */
function getAllowedValueName(input: DynamicFormHTMLInputElement, answer: string): string {
    return findAllowedValue(input, answer)?.name ?? answer;
}

export default getHTMLInputChoices;
export {getAllowedValueName, isAllowedValue};
