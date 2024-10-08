import type Report from './Report';

/** Model of Shared File */
type SharedFileData = {
    /** Shared file path */
    content: string;

    /** Shared file type */
    mimeType: string;
};

/** Model of shared file and receiver data */
type ShareFile = {
    /** Payment method's ID */
    receiver: Report;

    /** Shared file path and type */
    fileData: SharedFileData;
};

export default ShareFile;
export type {SharedFileData};
