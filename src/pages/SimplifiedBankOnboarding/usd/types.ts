/**
 * The props that the USD flow page passes to every step.
 */
type USDPageProps = {
    /** Goes to the next step of the flow */
    onSubmit: () => void;

    /** Goes to the previous step of the flow */
    onBackButtonPress: () => void;
    policyID?: string;

    /** The sub page from the URL, for the steps that pick their own content with it */
    currentSubPage?: string;
    stepNames?: readonly string[];

    /** Position of the step in the step counter of the header */
    startStepIndex?: number;
    backTo?: string;
};

export default USDPageProps;
