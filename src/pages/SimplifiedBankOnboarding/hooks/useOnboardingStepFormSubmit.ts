/**
 * Builds the submit handler of a one-field form of the onboarding. It saves the values to the draft only outside of the
 * edit mode, where the confirmation page saves them instead. It mirrors `useReimbursementAccountStepFormSubmit`.
 */
import type {FormOnyxKeys} from '@components/Form/types';

import useStepFormSubmit from '@hooks/useStepFormSubmit';
import type {SubPageProps} from '@hooks/useSubPage/types';

import ONYXKEYS from '@src/ONYXKEYS';

type UseOnboardingStepFormSubmitParams = Pick<SubPageProps, 'onNext'> & {
    fieldIds: Array<FormOnyxKeys<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>>;
    shouldSaveDraft: boolean;
};

function useOnboardingStepFormSubmit({onNext, fieldIds, shouldSaveDraft}: UseOnboardingStepFormSubmitParams) {
    return useStepFormSubmit<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>({
        formId: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM,
        onNext,
        fieldIds,
        shouldSaveDraft,
    });
}

export default useOnboardingStepFormSubmit;
