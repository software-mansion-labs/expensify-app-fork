/**
 * The props that the NonUSD flow page passes to every step.
 */
type NonUSDPageProps = {
    /** Goes to the next step of the flow */
    onSubmit: () => void;

    /** Goes to the previous step of the flow */
    onBackButtonPress: () => void;
    policyID?: string;

    /** The currency of the workspace, which decides the countries, the bank inputs and the extra steps */
    currency?: string;

    /** The names of the steps in the step counter of the header */
    stepNames?: readonly string[];

    /** The sub page from the URL, for the steps that pick their own content with it */
    currentSubPage?: string;

    /** The route that the flow returns to when the user leaves it */
    backTo?: string;
};

export default NonUSDPageProps;
