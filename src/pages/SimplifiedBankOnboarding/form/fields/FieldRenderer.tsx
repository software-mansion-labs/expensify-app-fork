/**
 * The form pages only know field configs, not input components. This file maps each field type to the input that
 * renders it, so a plan can describe a form without importing any UI.
 */
import type {FieldConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {OnboardingFormID} from '@pages/SimplifiedBankOnboarding/formConfig/validation/types';

import React from 'react';

import CheckboxField from './CheckboxField';
import DateField from './DateField';
import FileField from './FileField';
import PicklistField from './PicklistField';
import ReadOnlyField from './ReadOnlyField';
import TextField from './TextField';

type FieldRendererProps = {
    /** The form of the page. The file field writes its draft and its upload error to it. */
    formID: OnboardingFormID;
    field: FieldConfig;

    /** False in edit mode, so a value the user changed but did not confirm never reaches the draft */
    shouldSaveDraft: boolean;
};

/** Picks the input component of a field by its type */
function FieldRenderer({formID, field, shouldSaveDraft}: FieldRendererProps) {
    switch (field.type) {
        case 'text':
            return (
                <TextField
                    field={field}
                    shouldSaveDraft={shouldSaveDraft}
                />
            );
        case 'date':
            return (
                <DateField
                    field={field}
                    shouldSaveDraft={shouldSaveDraft}
                />
            );
        case 'picklist':
            return (
                <PicklistField
                    field={field}
                    shouldSaveDraft={shouldSaveDraft}
                />
            );
        case 'checkbox':
            return (
                <CheckboxField
                    field={field}
                    shouldSaveDraft={shouldSaveDraft}
                />
            );
        case 'file':
            return (
                <FileField
                    formID={formID}
                    field={field}
                    shouldSaveDraft={shouldSaveDraft}
                />
            );
        case 'readOnly':
            return <ReadOnlyField field={field} />;
        default:
            return null;
    }
}

export default FieldRenderer;
