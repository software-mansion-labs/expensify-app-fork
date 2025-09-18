/* eslint-disable @lwc/lwc/no-async-await */
import {PermissionsAndroid, Platform} from 'react-native';
import type {FetchBlobResponse} from 'react-native-blob-util';
import RNFetchBlob from 'react-native-blob-util';
import RNFS from 'react-native-fs';
import CONST from '@src/CONST';
import {appendTimeToFileName, getFileName, showGeneralErrorAlert, showPermissionErrorAlert, showSuccessAlert} from './FileUtils';
import type {FileDownload} from './types';

/**
 * Android permission check to store images
 */
function hasAndroidPermission(): Promise<boolean> {
    // On Android API Level 33 and above, these permissions do nothing and always return 'never_ask_again'
    // More info here: https://stackoverflow.com/a/74296799
    if (Number(Platform.Version) >= 33) {
        return Promise.resolve(true);
    }

    // Read and write permission
    const writePromise = PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
    const readPromise = PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);

    return Promise.all([writePromise, readPromise]).then(([hasWritePermission, hasReadPermission]) => {
        if (hasWritePermission && hasReadPermission) {
            return true; // Return true if permission is already given
        }

        // Ask for permission if not given
        return PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE, PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE]).then(
            (status) => status['android.permission.READ_EXTERNAL_STORAGE'] === 'granted' && status['android.permission.WRITE_EXTERNAL_STORAGE'] === 'granted',
        );
    });
}

/**
 * Handling the download
 */
function handleDownload(url: string, fileName?: string, successMessage?: string, shouldUnlink = true): Promise<void> {
    return new Promise((resolve) => {
        const dirs = RNFetchBlob.fs.dirs;

        // Android files will download to Download directory
        const path = dirs.DownloadDir;
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Disabling this line for safeness as nullish coalescing works only if the value is undefined or null, and since fileName can be an empty string we want to default to `FileUtils.getFileName(url)`
        const attachmentName = appendTimeToFileName(fileName || getFileName(url));

        const isLocalFile = url.startsWith('file://');

        let attachmentPath = isLocalFile ? url : undefined;
        let fetchedAttachment: Promise<void | FetchBlobResponse> = Promise.resolve();

        if (!isLocalFile) {
            // Fetching the attachment
            fetchedAttachment = RNFetchBlob.config({
                fileCache: true,
                path: `${path}/${attachmentName}`,
                addAndroidDownloads: {
                    useDownloadManager: true,
                    notification: false,
                    path: `${path}/Expensify/${attachmentName}`,
                },
            }).fetch('GET', url);
        }

        // Resolving the fetched attachment
        fetchedAttachment
            .then((attachment) => {
                if (!isLocalFile && (!attachment || !attachment.info())) {
                    return Promise.reject();
                }

                if (!isLocalFile) {
                    attachmentPath = (attachment as FetchBlobResponse).path();
                }

                return RNFetchBlob.MediaCollection.copyToMediaStore(
                    {
                        name: attachmentName,
                        parentFolder: 'Expensify',
                        mimeType: null,
                    },
                    'Download',
                    attachmentPath ?? '',
                );
            })
            .then(() => {
                if (attachmentPath && shouldUnlink) {
                    RNFetchBlob.fs.unlink(attachmentPath);
                }
                showSuccessAlert(successMessage);
            })
            .catch(() => {
                showGeneralErrorAlert();
            })
            .finally(() => resolve());
    });
}

const postDownloadFile = async (url: string, fileName?: string, formData?: FormData, onDownloadFailed?: () => void): Promise<void> => {
    try {
        const fetchOptions: RequestInit = {
            method: 'POST',
            body: formData,
        };

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            throw new Error('Failed to download file');
        }

        const contentType = response.headers.get('content-type');
        if (contentType === 'application/json' && fileName?.includes('.csv')) {
            throw new Error();
        }

        const fileData = await response.text();
        const finalFileName = appendTimeToFileName(fileName ?? 'Expensify');
        const downloadPath = `${RNFS.DownloadDirectoryPath}/${finalFileName}`;

        await RNFS.writeFile(downloadPath, fileData, 'utf8');

        await RNFetchBlob.MediaCollection.copyToMediaStore(
            {
                name: getFileName(downloadPath),
                parentFolder: 'Expensify',
                mimeType: null,
            },
            'Download',
            downloadPath,
        );

        await RNFetchBlob.fs.unlink(downloadPath);

        showSuccessAlert();
    } catch (error) {
        if (!onDownloadFailed) {
            showGeneralErrorAlert();
        }
        onDownloadFailed?.();
    }
};

/**
 * Checks permission and downloads the file for Android
 */
const fileDownload: FileDownload = (url, fileName, successMessage, _, formData, requestType, onDownloadFailed, shouldUnlink) =>
    new Promise((resolve) => {
        hasAndroidPermission()
            .then((hasPermission) => {
                if (hasPermission) {
                    if (requestType === CONST.NETWORK.METHOD.POST) {
                        return postDownloadFile(url, fileName, formData, onDownloadFailed);
                    }
                    return handleDownload(url, fileName, successMessage, shouldUnlink);
                }
                showPermissionErrorAlert();
            })
            .catch(() => {
                showPermissionErrorAlert();
            })
            .finally(() => resolve());
    });

export default fileDownload;
