/**
 * The props of the two variants of the USD bank step. Each variant hands its values to the container, which sends the request.
 */
import type {OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';

type BankAccountValues = Partial<Pick<OnboardingForm, 'routingNumber' | 'accountNumber' | 'plaidAccountID'>>;

type BankInfoSubStepProps = {
    /** Sends the values to the container, which connects the bank account */
    onNext: (values: BankAccountValues) => void;
};

export default BankInfoSubStepProps;
export type {BankAccountValues};
