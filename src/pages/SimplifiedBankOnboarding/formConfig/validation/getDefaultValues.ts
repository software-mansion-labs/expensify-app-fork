import type {FieldConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

/** The values that the fields of a page start with, which are the answers that the flow already holds */
function getDefaultValues(fields: FieldConfig[]): OnboardingDraft {
    const values: OnboardingDraft = {};
    for (const field of fields) {
        // Each case narrows the ID to the inputs of one value type, so the copy keeps the type of the value
        switch (field.type) {
            case 'text':
            case 'date':
            case 'picklist':
                values[field.id] = field.defaultValue;
                break;
            case 'checkbox':
                values[field.id] = field.defaultValue;
                break;
            case 'file':
                values[field.id] = field.defaultValue;
                break;
            default:
                break;
        }
    }
    return values;
}

export default getDefaultValues;
