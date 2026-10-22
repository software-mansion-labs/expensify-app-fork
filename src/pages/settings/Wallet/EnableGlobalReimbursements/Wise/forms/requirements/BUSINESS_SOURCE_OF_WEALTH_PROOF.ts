import CONST from '@src/CONST';
import type {DynamicFormPage} from '@src/types/onyx';

import {SOURCE_OF_WEALTH_DOCUMENT_TYPE_OPTIONS, SOURCE_OF_WEALTH_OPTIONS} from './sourceOfWealthOptions';

/** A document proving the source of wealth. It asks for the source again, since Wise can also ask for this proof alone after Submit. */
const BUSINESS_SOURCE_OF_WEALTH_PROOF: DynamicFormPage = {
    key: CONST.WISE.KYC_REQUIREMENT.BUSINESS_SOURCE_OF_WEALTH_PROOF,
    titleKey: 'walletPage.wiseOnboarding.sourceOfWealthProof.title',
    descriptionKey: 'walletPage.wiseOnboarding.sourceOfWealthProof.description',
    content: [
        {key: 'sourceOfWealthType', type: 'select', required: true, labelKey: 'walletPage.wiseOnboarding.sourceOfWealth.label', values: SOURCE_OF_WEALTH_OPTIONS},
        {key: 'documentType', type: 'select', required: true, labelKey: 'walletPage.wiseOnboarding.sourceOfWealthProof.documentType', values: SOURCE_OF_WEALTH_DOCUMENT_TYPE_OPTIONS},
        {
            key: 'proofFile',
            type: 'file',
            required: true,
            maxFiles: 2,
            labelKey: 'walletPage.wiseOnboarding.sourceOfWealthProof.file',
            descriptionKey: 'walletPage.wiseOnboarding.sourceOfWealthProof.fileDescription',
        },
    ],
};

export default BUSINESS_SOURCE_OF_WEALTH_PROOF;
