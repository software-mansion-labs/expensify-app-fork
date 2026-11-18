import getAddressInputKeys from '@components/DynamicForm/utils/getAddressInputKeys';
import getContentFields from '@components/DynamicForm/utils/getContentFields';

import getSignerDetailsForm, {getSignerDetailsParams, getSignerDetailsPrefill} from '@pages/ReimbursementAccount/utils/getSignerDetailsForm';

import CONST from '@src/CONST';
import type {FileObject} from '@src/types/utils/Attachment';

const idFile: FileObject = {name: 'id.pdf', uri: 'file://id.pdf'};
const directorsFile: FileObject = {name: 'directors.pdf', uri: 'file://directors.pdf'};
const SIGNER_ADDRESS = getAddressInputKeys('signer_street');
const OWNER = 'beneficialOwner_currentUser';
const OWNER_ADDRESS = getAddressInputKeys(`${OWNER}_street`);

describe('getSignerDetailsForm', () => {
    it('asks an Australian signer for every document and the PDS and FSG download', () => {
        // Given a signer of an Australian bank account
        // When the form is built
        const {pages} = getSignerDetailsForm({currency: CONST.CURRENCY.AUD, country: CONST.COUNTRY.AU, isUserOwner: false});

        // Then all personal pages come first and the upload page asks for each document Corpay needs in Australia
        expect(pages.map((page) => page.key)).toEqual(['name', 'job-title', 'date-of-birth', 'address', 'upload-documents']);
        const uploadFields = getContentFields(pages.at(-1)?.content ?? []);
        expect(uploadFields.map((field) => field.key)).toEqual(['signerCopyOfID', 'signerAddressProof', 'proofOfDirectors', 'downloadedPDSandFSG']);
    });

    it('asks an owner only for the job title and the documents', () => {
        // Given a user who already gave their name, date of birth and address as an owner, with a British bank account
        // When the form is built
        const {pages} = getSignerDetailsForm({currency: CONST.CURRENCY.GBP, country: CONST.COUNTRY.GB, isUserOwner: true});

        // Then the personal pages are left out, and the upload page asks for the ID and proof of address only
        expect(pages.map((page) => page.key)).toEqual(['job-title', 'upload-documents']);
        expect(getContentFields(pages.at(-1)?.content ?? []).map((field) => field.key)).toEqual(['signerCopyOfID', 'signerAddressProof']);
    });
});

describe('getSignerDetailsParams', () => {
    it('sends the answers in the shape the director information command takes', () => {
        // Given a signer who answered every page and has no state in their address
        const answers = {
            signerFullName: 'Jane Doe',
            signerJobTitle: 'CEO',
            signerDateOfBirth: '1990-01-01',
            [SIGNER_ADDRESS.street]: '1 King St',
            [SIGNER_ADDRESS.city]: 'Sydney',
            [SIGNER_ADDRESS.zipCode]: '2000',
            downloadedPDSandFSG: true,
            signerCopyOfID: [idFile],
            proofOfDirectors: [directorsFile],
        };

        // When the answers are mapped
        const params = getSignerDetailsParams(answers, 'jane@example.com');

        // Then the empty state keeps its place in the address, so it splits back the same way, and each document sends its first file
        expect(params).toEqual({
            signerDetails: {
                signerFullName: 'Jane Doe',
                signerEmail: 'jane@example.com',
                signerJobTitle: 'CEO',
                signerDateOfBirth: '1990-01-01',
                signerCompleteResidentialAddress: '1 King St, Sydney, , 2000',
                downloadedPDSandFSG: true,
            },
            signerFiles: {signerCopyOfID: idFile, proofOfDirectors: directorsFile},
        });
    });

    it("takes an owner's name, date of birth and address from their owner details", () => {
        // Given an owner whose address the owners step drafted under its street key
        const ownerDraft = {
            [`${OWNER}_firstName`]: 'Jane',
            [`${OWNER}_lastName`]: 'Doe',
            [`${OWNER}_dob`]: '1990-01-01',
            [OWNER_ADDRESS.street]: '1 High St',
            [OWNER_ADDRESS.city]: 'London',
            [OWNER_ADDRESS.zipCode]: 'N1 1AA',
        };

        // When the job title page answers are mapped
        const {signerDetails} = getSignerDetailsParams({signerJobTitle: 'CEO'}, 'jane@example.com', ownerDraft);

        // Then the owner details fill the rest
        expect(signerDetails).toEqual({
            signerFullName: 'Jane Doe',
            signerEmail: 'jane@example.com',
            signerJobTitle: 'CEO',
            signerDateOfBirth: '1990-01-01',
            signerCompleteResidentialAddress: '1 High St, London, , N1 1AA',
        });
    });
});

describe('getSignerDetailsPrefill', () => {
    it('splits the saved address back into its parts', () => {
        // Given a bank account that already holds the signer details
        // When the prefill is read
        const prefill = getSignerDetailsPrefill({signerFullName: 'Jane Doe', signerCompleteResidentialAddress: '1 King St, Sydney, NSW, 2000', downloadedPDSandFSG: true});

        // Then each part lands under the address field's own keys
        expect(prefill).toMatchObject({
            signerFullName: 'Jane Doe',
            [SIGNER_ADDRESS.street]: '1 King St',
            [SIGNER_ADDRESS.city]: 'Sydney',
            [SIGNER_ADDRESS.state]: 'NSW',
            [SIGNER_ADDRESS.zipCode]: '2000',
            downloadedPDSandFSG: true,
        });
    });
});
