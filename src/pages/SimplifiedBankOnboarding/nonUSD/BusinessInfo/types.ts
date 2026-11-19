/**
 * The props that the NonUSD business step passes to its sub pages.
 */
import type StepRequestSubPageProps from '@pages/SimplifiedBankOnboarding/requests/types';
import type {BusinessInfoValues} from '@pages/SimplifiedBankOnboarding/values/codecs/nonUSDBusinessInfo';
import type ResolvedValuesProps from '@pages/SimplifiedBankOnboarding/values/types';

type BusinessInfoSubPageProps = StepRequestSubPageProps & ResolvedValuesProps<BusinessInfoValues>;

export default BusinessInfoSubPageProps;
