import type {DynamicFormElement as DynamicFormElementType} from '@src/types/onyx';

import React from 'react';

import type {ExpensifyInputProps} from './ExpensifyInput/types';

import Banner from './Banner';
import Description from './Description';
import ExpensifyInput from './ExpensifyInput';
import Heading from './Heading';
import HTMLInput from './HTMLInput';

type DynamicFormElementProps = Omit<ExpensifyInputProps, 'element'> & {
    element: DynamicFormElementType;

    /** The element opens the page, so a heading needs no space above it */
    isFirst: boolean;
};

/** One element of a page, drawn by the component its `elementType` names. Each component reads only its own element's format. */
function DynamicFormElement({element, isFirst, ...expensifyInputProps}: DynamicFormElementProps) {
    switch (element.elementType) {
        case 'HTMLInput':
            return (
                <HTMLInput
                    element={element}
                    values={expensifyInputProps.values}
                    onRefreshRequirements={expensifyInputProps.onRefreshRequirements}
                />
            );
        case 'ExpensifyInput':
            return (
                <ExpensifyInput
                    element={element}
                    {...expensifyInputProps}
                />
            );
        case 'Heading':
            return (
                <Heading
                    element={element}
                    isFirst={isFirst}
                />
            );
        case 'Banner':
            return <Banner element={element} />;
        case 'Description':
            return <Description element={element} />;
        default: {
            const exhaustiveCheck: never = element;
            return exhaustiveCheck;
        }
    }
}

export default DynamicFormElement;
