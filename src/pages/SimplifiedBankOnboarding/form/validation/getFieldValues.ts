import type {OnboardingFormValues} from '@pages/SimplifiedBankOnboarding/form/types';
import type {FieldConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

/** The form holds the whole draft, so a page submits only the values of its own fields */
function getFieldValues(fields: FieldConfig[], values: OnboardingFormValues): OnboardingDraft {
    const fieldValues: OnboardingDraft = {};
    for (const field of fields) {
        // Each case narrows the ID to the inputs of one value type, so the copy keeps the type of the value
        switch (field.type) {
            case 'text':
            case 'date':
            case 'picklist':
                fieldValues[field.id] = values[field.id];
                break;
            case 'checkbox':
                fieldValues[field.id] = values[field.id];
                break;
            case 'file':
                fieldValues[field.id] = values[field.id];
                break;
            default:
                break;
        }
    }
    return fieldValues;
}

export default getFieldValues;
