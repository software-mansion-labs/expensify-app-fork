import {createContext, useContext} from 'react';
import type {ButtonContextValue} from '@components/ComposableButton/types';

const ButtonWrapperContext = createContext<ButtonContextValue | undefined>(undefined);

function useButtonContext(): ButtonContextValue {
    const context = useContext(ButtonWrapperContext);
    if (context === undefined) {
        throw new Error('useButtonContext must be used within a ButtonWrapper');
    }
    return context;
}

export default ButtonWrapperContext;
export {useButtonContext};
