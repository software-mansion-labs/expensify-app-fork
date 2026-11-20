/**
 * The key of one entry of the request status. The account key holds one bank account at a time, but a request may still
 * settle after the user opened another workspace. A request about a bank account is therefore keyed by its workspace,
 * or by the bank account when there is no workspace, so its result never shows on another workspace and never replaces
 * the status of a request that another workspace sent.
 */
import type {RequestName} from './REQUEST_NAMES';

/** The bank account that a request is about. A request that is not about one, such as the validate code, has no scope. */
type RequestScope = {
    policyID?: string;
    bankAccountID?: number;
};

type RequestKey = RequestName | `${RequestName}:${string}`;

function getRequestKey(name: RequestName, scope?: RequestScope): RequestKey {
    if (scope?.policyID) {
        return `${name}:policy-${scope.policyID}`;
    }
    if (scope?.bankAccountID) {
        return `${name}:bankAccount-${scope.bankAccountID}`;
    }
    return name;
}

export default getRequestKey;
export type {RequestKey, RequestScope};
