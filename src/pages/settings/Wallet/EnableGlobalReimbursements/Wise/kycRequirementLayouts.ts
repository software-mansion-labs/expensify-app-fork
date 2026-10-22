import CONST from '@src/CONST';
import type {DynamicFormPage} from '@src/types/onyx';
import type {WiseKYCRequirement} from '@src/types/onyx/WiseKYCReview';

import BUSINESS_SOURCE_OF_WEALTH_INFO from './forms/requirements/BUSINESS_SOURCE_OF_WEALTH_INFO';
import BUSINESS_SOURCE_OF_WEALTH_PROOF from './forms/requirements/BUSINESS_SOURCE_OF_WEALTH_PROOF';

/** The pages the App draws itself, keyed by Wise's requirement type. Wise's embedded page collects every other type. */
const KYC_REQUIREMENT_LAYOUTS: Partial<Record<string, DynamicFormPage>> = {
    [CONST.WISE.KYC_REQUIREMENT.BUSINESS_SOURCE_OF_WEALTH_INFO]: BUSINESS_SOURCE_OF_WEALTH_INFO,
    [CONST.WISE.KYC_REQUIREMENT.BUSINESS_SOURCE_OF_WEALTH_PROOF]: BUSINESS_SOURCE_OF_WEALTH_PROOF,
};

/** The App's page for a requirement, or undefined when only Wise's embedded page can collect it */
function getKYCRequirementPage(requirement: WiseKYCRequirement): DynamicFormPage | undefined {
    if (requirement.isHostedOnly) {
        return undefined;
    }
    return KYC_REQUIREMENT_LAYOUTS[requirement.key];
}

export default KYC_REQUIREMENT_LAYOUTS;
export {getKYCRequirementPage};
