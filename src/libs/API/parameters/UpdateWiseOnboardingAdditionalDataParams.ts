import type {FileObject} from '@src/types/utils/Attachment';

type UpdateWiseOnboardingAdditionalDataParams = {
    bankAccountID: number;

    /** The onboarding step or Wise's requirement type the page saves under */
    step: string;

    /** That page's answers as JSON, keyed by field */
    inputs: string;

    /** Each file of a file field as its own parameter, named `<fieldKey>_<index>`, since a request carries only files and plain values */
    [fileKey: `${string}_${number}`]: FileObject;
};

export default UpdateWiseOnboardingAdditionalDataParams;
