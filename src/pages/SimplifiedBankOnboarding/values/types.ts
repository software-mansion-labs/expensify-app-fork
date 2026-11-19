/**
 * The props that a step passes to its sub pages. The step resolves the values once, so every sub page and the
 * confirmation page of the step show the same value for an input.
 */
type ResolvedValuesProps<TValues> = {
    /** The values of the step, from the draft first and then from the server data */
    values: TValues;
};

export default ResolvedValuesProps;
