import type {PageConfig, StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import getInputIDs from '@pages/SimplifiedBankOnboarding/formConfig/validation/getInputIDs';
import type {FileInputID, InputID} from '@pages/SimplifiedBankOnboarding/types/form';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

/** Files never come back from the server, so a document stays in the draft and the step can still show it */
const FILE_INPUT_IDS = {
    [INPUT_IDS.COMPANY_TAX_ID_DOCUMENT]: true,
    [INPUT_IDS.COMPANY_ADDRESS_DOCUMENT]: true,
    [INPUT_IDS.BANK_STATEMENT]: true,
    [INPUT_IDS.ACH_AUTHORIZATION_FORM]: true,
} satisfies Record<FileInputID, true>;

function isFileInputID(inputID: InputID): boolean {
    return inputID in FILE_INPUT_IDS;
}

function getPageInputIDs(page: PageConfig): InputID[] {
    if (page.kind === 'question') {
        return [page.fieldID];
    }
    if (page.kind !== 'form') {
        return [];
    }
    return getInputIDs(page.inputs).filter((inputID) => !isFileInputID(inputID));
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
