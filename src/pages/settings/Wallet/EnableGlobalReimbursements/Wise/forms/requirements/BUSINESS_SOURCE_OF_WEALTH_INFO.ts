import CONST from '@src/CONST';
import type {DynamicFormPage} from '@src/types/onyx';

import {SOURCE_OF_WEALTH_OPTIONS} from './sourceOfWealthOptions';

/** Where the company's money comes from. The field key is Wise's, so the server forwards the answer as it is. */
const BUSINESS_SOURCE_OF_WEALTH_INFO: DynamicFormPage = {
    key: CONST.WISE.KYC_REQUIREMENT.BUSINESS_SOURCE_OF_WEALTH_INFO,
    titleKey: 'walletPage.wiseOnboarding.sourceOfWealth.title',
    descriptionKey: 'walletPage.wiseOnboarding.sourceOfWealth.description',
    content: [{key: 'businessSourceOfWealthInfo', type: 'radio', required: true, labelKey: 'walletPage.wiseOnboarding.sourceOfWealth.label', values: SOURCE_OF_WEALTH_OPTIONS}],
};

export default BUSINESS_SOURCE_OF_WEALTH_INFO;
