/**
 * The bank account that the entry page opens. The page is opened by a workspace ID or by a bank account ID, such as from
 * the Wallet, and both inputs become one reference, so the rest of the page asks a single question: is the account key
 * about this account?
 */
import {belongsToPolicy} from '@pages/SimplifiedBankOnboarding/model/setupStatus';
import type {ACHData, Workspaces} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

type AccountRef = {
    /** The workspace of the URL, else the workspace that the bank account is connected to */
    policyID: string | undefined;

    /** Only set when the URL names a bank account */
    bankAccountID: number | undefined;
};

function findPolicyOfBankAccount(bankAccountID: number, workspaces: OnyxEntry<Workspaces>, achData: ACHData | undefined): string | undefined {
    const workspace = Object.values(workspaces ?? {}).find((candidate) => candidate.achAccount?.bankAccountID === bankAccountID);
    if (workspace) {
        return workspace.id;
    }
    return achData?.bankAccountID === bankAccountID ? achData.policyID : undefined;
}

function getAccountRef(policyIDParam: string | undefined, bankAccountIDParam: string | undefined, workspaces: OnyxEntry<Workspaces>, achData: ACHData | undefined): AccountRef {
    const bankAccountID = bankAccountIDParam ? Number(bankAccountIDParam) : undefined;
    if (policyIDParam || !bankAccountID) {
        return {policyID: policyIDParam, bankAccountID};
    }
    return {policyID: findPolicyOfBankAccount(bankAccountID, workspaces, achData), bankAccountID};
}

/**
 * The account key is shared by every workspace, so it only describes the reference when its IDs match. An account
 * without a bank account, such as the one a start over leaves, is matched by its workspace.
 */
function isAccountOfRef(achData: ACHData | undefined, ref: AccountRef): boolean {
    if (ref.bankAccountID && achData?.bankAccountID) {
        return achData.bankAccountID === ref.bankAccountID;
    }
    return belongsToPolicy(achData, ref.policyID);
}

function hasAccountRef(ref: AccountRef): boolean {
    return !!ref.policyID || !!ref.bankAccountID;
}

export default getAccountRef;
export {hasAccountRef, isAccountOfRef};
export type {AccountRef};
