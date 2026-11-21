import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {ConfirmationRow, PageID, StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

/**
 * The rows of a confirmation page: the summary rows of every field on the form pages that precede it in its step. Each
 * row opens the page of its field, so a plan never lists what a confirmation shows. A page that the answers left out of
 * the plan has no row either.
 */
function getConfirmationRows(step: StepConfig, confirmationPageID: PageID, answers: OnboardingDraft, translate: LocalizedTranslate): ConfirmationRow[] {
    const confirmationIndex = step.pages.findIndex((page) => page.id === confirmationPageID);

    return step.pages.slice(0, Math.max(confirmationIndex, 0)).flatMap((page) => {
        if (page.kind !== 'form') {
            return [];
        }
        return page.fields.flatMap((field) => field.getSummaryRows?.(answers, translate) ?? []).map((row) => ({...row, editPageID: page.id}));
    });
}

export default getConfirmationRows;
