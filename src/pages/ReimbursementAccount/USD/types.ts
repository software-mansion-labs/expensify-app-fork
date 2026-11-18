import type {Route} from '@src/ROUTES';

type USDPageProps = {
    /** Handles submit button press */
    onSubmit: () => void;

    onBackButtonPress: () => void;
    policyID?: string;
    currentSubPage?: string;

    /** Array of step names for the progress indicator */
    stepNames?: readonly string[];

    /** Back to URL for preserving navigation context */
    backTo?: Route;
};

export default USDPageProps;
