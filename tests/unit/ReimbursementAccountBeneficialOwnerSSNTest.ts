import getNonUSDBeneficialOwnerValues from '@pages/ReimbursementAccount/NonUSD/utils/getValuesForBeneficialOwner';

import CONST from '@src/CONST';
import type {ReimbursementAccountForm} from '@src/types/form';

import createMock from '../utils/createMock';

const BENEFICIAL_OWNER_ID = 'beneficialOwnerID';

describe('Beneficial owner SSN contracts', () => {
    it('uses full ssn for Non-USD accounts with US beneficial owners', () => {
        // Given a Non-USD beneficial-owner draft with a full SSN
        const key = `${CONST.NON_USD_BANK_ACCOUNT.BENEFICIAL_OWNER_INFO_STEP.BENEFICIAL_OWNER_DATA.PREFIX}_${BENEFICIAL_OWNER_ID}_${CONST.NON_USD_BANK_ACCOUNT.BENEFICIAL_OWNER_INFO_STEP.BENEFICIAL_OWNER_DATA.SSN}`;
        const draft = createMock<ReimbursementAccountForm>({[key]: '123456789'});

        // When the Non-USD beneficial owner data is prepared
        const values = getNonUSDBeneficialOwnerValues(BENEFICIAL_OWNER_ID, draft);

        // Then it preserves the full-SSN contract required by Corpay
        expect(values.ssn).toBe('123456789');
    });
});
