/**
 * The props that a step passes to the sub page that sends its request, so the sub page shows the state of that request
 * and not the shared flags of the account.
 */
import type {SubPageProps} from '@hooks/useSubPage/types';

type StepRequestProps = {
    /** True while the confirmed request of the step waits for an answer. Background saves of the step never set it */
    isRequestPending: boolean;

    /** The error of the last failed request of the step, or an empty string */
    requestErrorMessage: string;
};

type StepRequestSubPageProps = SubPageProps & StepRequestProps;

export default StepRequestSubPageProps;
export type {StepRequestProps};
