import type {DynamicFormInputOptions, DynamicFormValues} from '@components/DynamicForm/types';
import type {InputComponentBaseProps} from '@components/Form/types';

type RefreshHandlers = Pick<InputComponentBaseProps, 'onValueChange'> & {
    onBlur?: () => void;
};

type RefreshHandlersOptions = Pick<DynamicFormInputOptions, 'onRefreshRequirements'> & {
    inputID: string;

    /** The schema asks for new requirements when this answer changes */
    shouldRefresh: boolean;

    /** The answer is typed, so it changes on every keystroke */
    isTyped: boolean;

    /** Current answers, which a typed answer is read from when the user leaves the input */
    values: DynamicFormValues;
};

/** A picked answer asks for new requirements as it changes. A typed one asks when the user leaves the input, since it changes on every keystroke. */
function getRefreshHandlers({inputID, shouldRefresh, isTyped, values, onRefreshRequirements}: RefreshHandlersOptions): RefreshHandlers {
    if (!shouldRefresh || !onRefreshRequirements) {
        return {};
    }
    if (!isTyped) {
        return {onValueChange: (value, key) => onRefreshRequirements(key, value)};
    }
    return {
        onBlur: () => {
            const value = values[inputID];
            if (value !== undefined) {
                onRefreshRequirements(inputID, value);
            }
        },
    };
}

export default getRefreshHandlers;
export type {RefreshHandlers};
