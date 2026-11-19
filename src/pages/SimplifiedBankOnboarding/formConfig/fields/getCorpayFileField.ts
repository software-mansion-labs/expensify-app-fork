import type {FileFieldConfig, FileInputID} from '@pages/SimplifiedBankOnboarding/formConfig/types';

import CONST from '@src/CONST';
import type {FileObject} from '@src/types/utils/Attachment';

/** A required document with the limits of the global provider: one file of the accepted types and size */
function getCorpayFileField(id: FileInputID, label: string, description: string | undefined, defaultValue: FileObject[]): FileFieldConfig {
    return {
        type: 'file',
        id,
        label,
        description,
        defaultValue,
        isRequired: true,
        acceptedFileTypes: [...CONST.CORPAY_DOCUMENT.ALLOWED_FILE_TYPES],
        fileLimit: CONST.CORPAY_DOCUMENT.FILE_LIMIT,
        maxFileSize: CONST.CORPAY_DOCUMENT.MAX_FILE_SIZE,
    };
}

export default getCorpayFileField;
