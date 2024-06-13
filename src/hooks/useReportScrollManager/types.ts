type ReportScrollManagerData<T> = {
    ref: T;
    scrollToIndex: (index: number, isEditing?: boolean) => void;
    scrollToBottom: () => void;
};

export default ReportScrollManagerData;
