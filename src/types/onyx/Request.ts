import {OnyxUpdate} from 'react-native-onyx';
import Response from './Response';

type OnyxData = {
    successData?: OnyxUpdate[];
    failureData?: OnyxUpdate[];
    optimisticData?: OnyxUpdate[];

    // If parentRequestID is not found it will use channelID to find the parent
    parentRequestID?: string;

    // It is used only if parentRequestID is not found, it will be used to find the parent
    // If parentRequestID is not found and channelID is not found, it will be considered as a SequentialRequest
    channelID?: string;
};

type RequestData = {
    command: string;
    commandName?: string;
    data?: Record<string, unknown>;
    type?: string;
    shouldUseSecure?: boolean;
    successData?: OnyxUpdate[];
    failureData?: OnyxUpdate[];

    resolve?: (value: Response) => void;
    reject?: (value?: unknown) => void;
};

type Request = RequestData & OnyxData;

type GraphRequest = Request;

type GraphRequestID = string;

type GraphRequestStorageEntry = {
    id: GraphRequestID;
    request: GraphRequest;
    children: GraphRequestID[];
    isRoot: boolean;
    isProcessed: boolean;
};

type GraphRequestStorage = Record<string, GraphRequestStorageEntry>;

export default Request;
export type {OnyxData, GraphRequestStorage, GraphRequest, GraphRequestID, GraphRequestStorageEntry};
