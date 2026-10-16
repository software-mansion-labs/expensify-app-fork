import type {DynamicFormFieldRowProps} from '@components/DynamicForm/components/DynamicFormFieldRow';
import DynamicFormFieldRow from '@components/DynamicForm/components/DynamicFormFieldRow';
import DynamicFormHeadingRow from '@components/DynamicForm/components/DynamicFormHeadingRow';

import type {DynamicFormElement as DynamicFormElementType} from '@src/types/onyx';

import React from 'react';

import DynamicFormBanner from './DynamicFormBanner';
import DynamicFormDescription from './DynamicFormDescription';
import HTMLInput from './HTMLInput';

type DynamicFormElementProps = Omit<DynamicFormFieldRowProps, 'field'> & {
    element: DynamicFormElementType;

    /** The element opens the page, so a heading needs no space above it */
    isFirst: boolean;
};

/** One element of a page, drawn by the component its `elementType` names. Each component reads only its own element's format. */
function DynamicFormElement({element, isFirst, ...fieldRowProps}: DynamicFormElementProps) {
    switch (element.elementType) {
        case 'HTMLInput':
            return (
                <HTMLInput
                    element={element}
                    values={fieldRowProps.values}
                    onRefreshRequirements={fieldRowProps.onRefreshRequirements}
                />
            );
        case 'ExpensifyInput':
            return (
                <DynamicFormFieldRow
                    field={element}
                    {...fieldRowProps}
                />
            );
        case 'Heading':
            return (
                <DynamicFormHeadingRow
                    heading={element}
                    isFirst={isFirst}
                />
            );
        case 'Banner':
            return <DynamicFormBanner element={element} />;
        case 'Description':
            return <DynamicFormDescription element={element} />;
        default:
            return null;
    }
}

export default DynamicFormElement;
