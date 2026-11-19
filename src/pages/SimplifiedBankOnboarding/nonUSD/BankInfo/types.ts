/**
 * The props of the sub pages of the NonUSD bank step. They receive the inputs that the server described from the step.
 */
import type {SubPageProps} from '@hooks/useSubPage/types';

import type {BankFields} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

type BankInfoSubStepProps = SubPageProps & {bankFields: OnyxEntry<BankFields>};

export default BankInfoSubStepProps;
