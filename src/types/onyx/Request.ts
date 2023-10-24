import {OnyxUpdate} from 'react-native-onyx';
import Response from './Response';

type OnyxData = {
    successData?: OnyxUpdate[];
    failureData?: OnyxUpdate[];
    optimisticData?: OnyxUpdate[];
    independenceKey?: string;
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

type GraphRequest = Request & {
    parentRequestID?: string;
    graphChannelID?: string;
}

type GraphRequestStorage = Record<string, {
        id: string;
        // TODO: Handle it in different way
        isRoot: boolean;
        request: GraphRequest;
        children: string[];
    }>

export default Request;
export type {OnyxData, GraphRequestStorage, GraphRequest};
