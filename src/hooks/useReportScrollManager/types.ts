import type {ReportAction} from '@src/types/onyx';
import type {FlashList} from '@shopify/flash-list';
import type {Ref} from 'react';

type ReportScrollManagerData = {
    ref: Ref<FlashList<ReportAction>>;
    scrollToIndex: (index: number, isEditing?: boolean) => void;
    scrollToBottom: () => void;
};

export default ReportScrollManagerData;
