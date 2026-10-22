import CONST from '@src/CONST';
import type {DynamicFormFieldOption} from '@src/types/onyx';

/** Wise's sources of wealth, in Wise's order */
const SOURCE_OF_WEALTH_OPTIONS: DynamicFormFieldOption[] = Object.values(CONST.WISE.SOURCE_OF_WEALTH).map((key) => ({
    key,
    labelKey: `walletPage.wiseOnboarding.sourceOfWealth.options.${key}`,
}));

/** The document types Wise accepts as proof of the source of wealth */
const SOURCE_OF_WEALTH_DOCUMENT_TYPE_OPTIONS: DynamicFormFieldOption[] = Object.values(CONST.WISE.SOURCE_OF_WEALTH_DOCUMENT_TYPE).map((key) => ({
    key,
    labelKey: `walletPage.wiseOnboarding.sourceOfWealthProof.documentTypes.${key}`,
}));

export {SOURCE_OF_WEALTH_DOCUMENT_TYPE_OPTIONS, SOURCE_OF_WEALTH_OPTIONS};
