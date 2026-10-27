import {createContext, useContext} from 'react';

import type {DynamicFieldContextValue} from './types';

const DynamicFieldContext = createContext<DynamicFieldContextValue | undefined>(undefined);

function useDynamicFieldContext(): DynamicFieldContextValue {
    const context = useContext(DynamicFieldContext);
    if (!context) {
        throw new Error('useDynamicFieldContext must be used inside DynamicFormFieldRow');
    }
    return context;
}

export default DynamicFieldContext;
export {useDynamicFieldContext};
