import type {PageConfig, StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {InputID} from '@pages/SimplifiedBankOnboarding/types/form';

/** Files never come back from the server, so a document stays in the draft and the step can still show it */
function getPageInputIDs(page: PageConfig): InputID[] {
    if (page.kind === 'question') {
        return [page.fieldID];
    }
    if (page.kind !== 'form') {
        return [];
    }
    return page.fields.flatMap((field) => (field.type === 'readOnly' || field.type === 'file' ? [] : [field.id]));
}

/**
 * The inputs that the draft drops once the step request succeeded. The server holds their values then, so the answers
 * come from the server again and an old draft value never hides a newer server value. Inputs that only the client
 * needs, such as the owner being edited, are no longer needed after the step.
 */
function getStepInputIDsToClear(step: StepConfig): InputID[] {
    return step.pages.flatMap(getPageInputIDs);
}

export default getStepInputIDsToClear;
