import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {FileObject} from '@src/types/utils/Attachment';

/** The first file of a file answer, for APIs that take one file per document */
function getFirstFile(answer: DynamicFormValues[string]): FileObject | undefined {
    return Array.isArray(answer) ? answer.find((item): item is FileObject => typeof item === 'object' && item !== null) : undefined;
}

export default getFirstFile;
