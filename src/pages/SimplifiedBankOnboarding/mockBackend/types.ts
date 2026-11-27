/**
 * Types of the mock backend: its database, its settings and the shape of a command handler.
 */
import type {ACHData, Workspaces} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import type SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';

import type {AnyOnyxUpdate} from '@src/types/onyx/Request';

import type {ValueOf} from 'type-fest';

type FailureMode = ValueOf<typeof SBO_CONST.MOCK.FAILURE_MODE>;
type ReviewOutcome = ValueOf<typeof SBO_CONST.MOCK.REVIEW_OUTCOME>;

/** A bank account row. It holds what the client sees in `achData` plus the columns that never leave the server. */
type ServerBankAccount = ACHData & {
    /** Every row belongs to a workspace, although the client type leaves the field optional */
    policyID: string;
    unmaskedAccountNumber?: string;
    validationAttempts?: number;
    uploadedKYBDocuments?: string[];
    bankStatementName?: string;
    achAuthorizationFormName?: string;
};

type MockServerSettings = {
    latencyMs: number;
    failureMode: FailureMode;

    /** The server answers the open-page read with a throttled account */
    isThrottled: boolean;

    /** The verification checks of the USD flow ask for extra documents */
    shouldRequireKYBDocuments: boolean;
};

type RequestLogEntry = {
    id: number;
    command: string;
    type: 'read' | 'write';
    status: 'success' | 'failure' | 'queued' | 'dropped';
    message?: string;
};

type MockServerDatabase = {
    user: {validated: boolean};
    workspaces: Workspaces;

    /** Bank accounts keyed by the workspace they belong to */
    bankAccounts: Record<string, ServerBankAccount>;
    lastBankAccountID: number;
    settings: MockServerSettings;
    requestLog: RequestLogEntry[];
};

type MockServerResponse = {
    jsonCode: number;
    message?: string;

    /** Onyx updates that the server sends back, applied before the success or failure data of the request */
    onyxData?: AnyOnyxUpdate[];
};

/** A command handler reads and changes the database draft that it receives, then describes the response */
type CommandHandler<TParams> = (params: TParams, database: MockServerDatabase) => MockServerResponse;

export type {CommandHandler, FailureMode, MockServerDatabase, MockServerResponse, MockServerSettings, RequestLogEntry, ReviewOutcome, ServerBankAccount};
