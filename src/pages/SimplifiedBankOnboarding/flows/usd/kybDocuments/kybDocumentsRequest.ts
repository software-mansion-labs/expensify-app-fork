/**
 * The one write of the USD document step. The mock server takes no files, so it sends the name of the first file of each
 * document that the server asked for.
 */
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import getUSDWriteOptions from '@pages/SimplifiedBankOnboarding/flows/usd/usdWriteOptions';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import getKYBDocumentsAnswers from './getKYBDocumentsAnswers';

const kybDocumentsRequest: OnboardingRequest = {
    name: 'usd.kybDocuments.upload',
    build: (data) => {
        const documentNames = getKYBDocumentsAnswers(data)
            .map((document) => document.files.at(0)?.name ?? '')
            .filter((documentName) => !!documentName);
        return {
            type: 'write',
            command: WRITE_COMMANDS.UPLOAD_KYB_DOCUMENTS,
            params: {...data.bankAccount, documentNames},
            ...getUSDWriteOptions(),
        };
    },
};

export default kybDocumentsRequest;
