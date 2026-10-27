import type {Choice} from '@components/RadioButtons';

/** PushRowWithModal takes its options keyed by value */
function getChoiceOptionsList(choices: Choice[]): Record<string, string> {
    return Object.fromEntries(choices.map((choice) => [choice.value, choice.label]));
}

export default getChoiceOptionsList;
