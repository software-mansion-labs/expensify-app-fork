/**
 * The props of the sub pages of the NonUSD bank step. They receive the inputs that the server described and the state of
 * the request of the step.
 */
import type StepRequestSubPageProps from '@pages/SimplifiedBankOnboarding/requests/types';
import type {BankFieldID, BankFields} from '@pages/SimplifiedBankOnboarding/types/onyx';
import type {ResolvedValues} from '@pages/SimplifiedBankOnboarding/values/resolveValue';
import type ResolvedValuesProps from '@pages/SimplifiedBankOnboarding/values/types';

import type {OnyxEntry} from 'react-native-onyx';

type BankInfoSubStepProps = StepRequestSubPageProps & ResolvedValuesProps<ResolvedValues<BankFieldID>> & {bankFields: OnyxEntry<BankFields>};

export default BankInfoSubStepProps;
