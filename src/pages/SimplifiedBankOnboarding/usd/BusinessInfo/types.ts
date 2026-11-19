/**
 * The props that the USD business step passes to its sub pages.
 */
import type StepRequestSubPageProps from '@pages/SimplifiedBankOnboarding/requests/types';
import type {BusinessInfoValues} from '@pages/SimplifiedBankOnboarding/values/codecs/usdBusinessInfo';
import type ResolvedValuesProps from '@pages/SimplifiedBankOnboarding/values/types';

type BusinessInfoSubPageProps = StepRequestSubPageProps &
    ResolvedValuesProps<BusinessInfoValues> & {
        /** True once the account is past the review, when a saved company name or tax ID can no longer change */
        isLocked: boolean;
    };

export default BusinessInfoSubPageProps;
