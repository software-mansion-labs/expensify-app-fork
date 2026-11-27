import InputWrapper from '@components/Form/InputWrapper';
import type {ValidInputs, ValueTypeKey} from '@components/Form/types';

import {usePageNavigation} from '@pages/SimplifiedBankOnboarding/core/step/pageNavigation';

import type {ComponentProps} from 'react';

import React from 'react';

/** The props of InputWrapper. A `shouldSaveDraft` of the caller is overwritten by the draft rule. */
type SubPageInputProps<TInput extends ValidInputs, TValue extends ValueTypeKey> = ComponentProps<typeof InputWrapper<TInput, TValue>>;

/**
 * InputWrapper with the draft rule of the sub page: the value goes to the draft on every change outside edit mode, and
 * only on submit in edit mode, so Back discards an edit. Same generics and props as InputWrapper.
 */
function SubPageInput<TInput extends ValidInputs, TValue extends ValueTypeKey = ValueTypeKey>(props: SubPageInputProps<TInput, TValue>) {
    const {isEditing} = usePageNavigation();

    // TypeScript cannot relate generic InputWrapper props to the JSX attributes (the FullStory augmentation of
    // IntrinsicAttributes meets the deferred props of TInput), so this is the one place that widens them. The caller's
    // props were already checked against its own input component by the signature.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- See the comment above: the props of one input fit the props of any input
    const inputProps = {...props, shouldSaveDraft: !isEditing} as ComponentProps<typeof InputWrapper>;

    return (
        <InputWrapper
            // eslint-disable-next-line react/jsx-props-no-spreading -- The wrapper passes every prop of InputWrapper through
            {...inputProps}
        />
    );
}

export default SubPageInput;
export type {SubPageInputProps};
