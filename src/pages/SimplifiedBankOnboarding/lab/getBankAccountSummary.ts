import type {Workspace} from '@pages/SimplifiedBankOnboarding/contract/onyx';

/** Describes the bank account of a workspace in one line, from the summary that the workspace carries */
function getBankAccountSummary(workspace: Workspace): string {
    if (!workspace.achAccount) {
        return `${workspace.outputCurrency} - no bank account`;
    }
    return `${workspace.outputCurrency} - bank account ${workspace.achAccount.bankAccountID} (${workspace.achAccount.state})`;
}

export default getBankAccountSummary;
