import type {InputFieldConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import getBankFieldRuleError from '@pages/SimplifiedBankOnboarding/model/bankFields/getBankFieldRuleError';
import type {BankFormField} from '@pages/SimplifiedBankOnboarding/types/onyx';

/** A bank input that the server describes. An input with a value set becomes a picklist of those values, any other a text input checked by the server rules. */
function getBankFieldConfig(field: BankFormField, defaultValue: string): InputFieldConfig {
    if (field.valueSet) {
        return {
            type: 'picklist',
            id: field.id,
            label: field.label,
            defaultValue,
            options: field.valueSet.map((option) => ({value: option.id, label: option.text})),
            isRequired: field.isRequired,
        };
    }
    return {
        type: 'text',
        id: field.id,
        label: field.label,
        defaultValue,
        isRequired: field.isRequired,
        validate: (value) => getBankFieldRuleError(field, value),
    };
}

export default getBankFieldConfig;
