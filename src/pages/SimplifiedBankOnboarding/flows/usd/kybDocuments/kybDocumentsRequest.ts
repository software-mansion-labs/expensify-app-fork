/**
 * The one write of the USD document step. The mock server takes no files, so it sends the name of the first file of each
 * document that the server asked for.
 */
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import {getUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/usd/usdAnswers';
import getUSDWriteOptions from '@pages/SimplifiedBankOnboarding/flows/usd/usdWriteOptions';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import getRequiredKYBDocuments from './getRequiredKYBDocuments';

const kybDocumentsRequest: OnboardingRequest = {
    name: 'usd.kybDocuments.upload',
    build: ({bankAccount, account, draft}) => {
        const answers = getUSDAnswers(draft, account);
        const documentNames = getRequiredKYBDocuments(answers.requiredKYBDocuments)
            .map((document) => answers.kybFiles[document.inputID].at(0)?.name ?? '')
            .filter((documentName) => !!documentName);
        return {
            type: 'write',
            command: WRITE_COMMANDS.UPLOAD_KYB_DOCUMENTS,
            params: {...bankAccount, documentNames},
            ...getUSDWriteOptions(),
        };
    },
};

export default kybDocumentsRequest;
