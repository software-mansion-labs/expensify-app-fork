/** The value of every bank input that a country can ask for: the draft value, then the one that the global provider saved (BC-08) */
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {BankFieldID} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';

function getBankInfoAnswers({draft, account}: FlowData): {bankFieldValues: Record<BankFieldID, string>} {
    const corpay = account?.achData?.corpay;

    return {
        bankFieldValues: {
            [INPUT_IDS.IBAN]: draft.iban ?? corpay?.iban ?? '',
            [INPUT_IDS.SWIFT_BIC_CODE]: draft.swiftBicCode ?? corpay?.swiftBicCode ?? '',
            [INPUT_IDS.BSB_NUMBER]: draft.bsbNumber ?? corpay?.bsbNumber ?? '',
            [INPUT_IDS.ACCOUNT_NUMBER]: draft.accountNumber ?? corpay?.accountNumber ?? '',
            [INPUT_IDS.BANK_NAME]: draft.bankName ?? corpay?.bankName ?? '',
            [INPUT_IDS.ACCOUNT_HOLDER_NAME]: draft.accountHolderName ?? corpay?.accountHolderName ?? '',
            [INPUT_IDS.ACCOUNT_HOLDER_COUNTRY]: draft.accountHolderCountry ?? corpay?.accountHolderCountry ?? '',
            [INPUT_IDS.ACCOUNT_HOLDER_REGION]: draft.accountHolderRegion ?? corpay?.accountHolderRegion ?? '',
        },
    };
}

export default getBankInfoAnswers;
