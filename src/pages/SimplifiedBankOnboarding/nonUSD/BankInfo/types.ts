/**
 * The props of the sub pages of the NonUSD bank step. They receive the inputs that the server described and the state of
 * the request of the step.
 */
import type StepRequestSubPageProps from '@pages/SimplifiedBankOnboarding/requests/types';
import type {BankFields} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

type BankInfoSubStepProps = StepRequestSubPageProps & {bankFields: OnyxEntry<BankFields>};

export default BankInfoSubStepProps;
