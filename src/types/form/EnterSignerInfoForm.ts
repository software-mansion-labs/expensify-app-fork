import type {FileObject} from '@src/types/utils/Attachment';

import type {ValueOf} from 'type-fest';

import type Form from './Form';

const INPUT_IDS = {
    SIGNER_FULL_NAME: 'signerFullName',
    SIGNER_DATE_OF_BIRTH: 'signerDateOfBirth',
    SIGNER_JOB_TITLE: 'signerJobTitle',
    SIGNER_EMAIL: 'signerEmail',
    SIGNER_STREET: 'signer_street',
    SIGNER_COPY_OF_ID: 'signerCopyOfID',
    SIGNER_ADDRESS_PROOF: 'signerAddressProof',
    SIGNER_CODICE_FISCALE: 'signerCodiceFiscaleTaxID',
    PROOF_OF_DIRECTORS: 'proofOfDirectors',
    DOWNLOADED_PDS_AND_FSG: 'downloadedPDSandFSG',
} as const;

type InputID = ValueOf<typeof INPUT_IDS>;

type EnterSignerInfoForm = Form<
    InputID,
    {
        [INPUT_IDS.SIGNER_FULL_NAME]: string;
        [INPUT_IDS.SIGNER_DATE_OF_BIRTH]: string;
        [INPUT_IDS.SIGNER_JOB_TITLE]: string;
        [INPUT_IDS.SIGNER_EMAIL]: string;
        [INPUT_IDS.SIGNER_STREET]: string;
        [INPUT_IDS.DOWNLOADED_PDS_AND_FSG]: boolean;
        [INPUT_IDS.SIGNER_COPY_OF_ID]: FileObject[];
        [INPUT_IDS.SIGNER_ADDRESS_PROOF]: FileObject[];
        [INPUT_IDS.SIGNER_CODICE_FISCALE]: FileObject[];
        [INPUT_IDS.PROOF_OF_DIRECTORS]: FileObject[];
    }
> & {isSavingSignerInformation?: boolean; isSuccess?: boolean};

export type {EnterSignerInfoForm};
export default INPUT_IDS;
