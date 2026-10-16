import {clearListItemEdit, startListItemEdit} from '@userActions/DynamicForm';

import type {DynamicFormListItem} from '@src/types/onyx';

import {useEffect, useState} from 'react';

/**
 * The editor form is shared by every entry, so it is filled with this entry's answers before its inputs mount, and emptied once the editor closes.
 * The entries of a sensitive list are never drafted, so its editor starts empty and its inputs take the entry's answers from memory.
 * Returns whether this page's answers are in.
 */
function useListItemEditorDraft(pageName: string | undefined, item: DynamicFormListItem | undefined, isSensitiveList: boolean): boolean {
    const [filledPageName, setFilledPageName] = useState<string>();

    useEffect(() => {
        let isCancelled = false;
        startListItemEdit(isSensitiveList ? {} : (item ?? {})).then(() => {
            if (isCancelled) {
                return;
            }
            setFilledPageName(pageName);
        });
        return () => {
            isCancelled = true;
        };
    }, [pageName, item, isSensitiveList]);

    useEffect(() => clearListItemEdit, []);

    return filledPageName === pageName;
}

export default useListItemEditorDraft;
