import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {ACHData, CorpayData, GlobalBeneficialOwner} from '@pages/SimplifiedBankOnboarding/types/onyx';
import {getOwnerInputID} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';
import {resolveAgreements as resolveNonUSDAgreements} from '@pages/SimplifiedBankOnboarding/values/codecs/nonUSDAgreements';
import {
    getFieldsToClear as getGlobalOwnerFieldsToClear,
    resolveOwnerFullName,
    toForm as globalOwnersToForm,
    toParams as globalOwnerToParams,
} from '@pages/SimplifiedBankOnboarding/values/codecs/nonUSDBeneficialOwners';
import {resolveIsUserDirector, toDirectorParams} from '@pages/SimplifiedBankOnboarding/values/codecs/nonUSDSigner';
import {toParams as usdAgreementsToParams} from '@pages/SimplifiedBankOnboarding/values/codecs/usdAgreements';
import {toForm as uboToForm, toParams as uboToParams} from '@pages/SimplifiedBankOnboarding/values/codecs/usdBeneficialOwners';
import {toParams as usdBusinessToParams} from '@pages/SimplifiedBankOnboarding/values/codecs/usdBusinessInfo';

const {CURRENT_USER_KEY} = SBO_CONST.NON_USD;

describe('NonUSD owners codec', () => {
    it('keeps a two-word owner unchanged on the way to the form and back', () => {
        // Given an owner that the server saved with a first and a last name
        const owner: GlobalBeneficialOwner = {uid: 'owner1', fullName: 'Jane Doe', ownershipPercentage: '30'};

        // When the step reads it into the form and sends it again
        const {ownerKeys, owners} = globalOwnersToForm([owner]);
        const params = globalOwnerToParams('owner1', owners.owner1);

        // Then the request holds the same owner
        expect(ownerKeys).toEqual(['owner1']);
        expect(params).toEqual(owner);
    });

    it('drops the middle part of a longer name, like the real flow', () => {
        // Given an owner with a middle name, which the server stores in one full name
        const owner: GlobalBeneficialOwner = {uid: 'owner1', fullName: 'Jane Mary Doe', ownershipPercentage: '30'};

        // When the step reads it into the two name inputs and sends it again
        const {owners} = globalOwnersToForm([owner]);
        const params = globalOwnerToParams('owner1', owners.owner1);

        // Then the middle name is lost, a loss that the frozen backend keeps and this codec confines
        expect(owners.owner1).toEqual({firstName: 'Jane', lastName: 'Doe', ownershipPercentage: '30'});
        expect(params.fullName).toBe('Jane Doe');
    });

    it('clears the answers, the loop state and every owner key of the draft after the save', () => {
        // Given a draft with an owner that the user removed from the list before saving
        const draft = {[getOwnerInputID('a', 'firstName')]: 'Ann', [getOwnerInputID('removed', 'firstName')]: 'Old'};

        // When the step builds the fields that its save makes obsolete
        const fields = getGlobalOwnerFieldsToClear(draft);

        // Then the keys of the removed owner go too, so they cannot come back on the next visit
        expect(fields).toEqual(expect.arrayContaining(['beneficialOwnerKeys', 'beneficialOwner_a_firstName', 'beneficialOwner_removed_firstName', 'ownsMoreThan25Percent']));
    });

    it('takes the owner name of the user from the draft, else the saved full name as it is', () => {
        // Given a saved owner with a middle name
        const owners: GlobalBeneficialOwner[] = [{uid: CURRENT_USER_KEY, fullName: 'Jane Mary Doe', ownershipPercentage: '30'}];

        // When the signer step asks for the name with and without an unsaved edit of the owner
        const savedName = resolveOwnerFullName(undefined, owners, CURRENT_USER_KEY);
        const editedName = resolveOwnerFullName(
            {[getOwnerInputID(CURRENT_USER_KEY, 'firstName')]: 'Janet', [getOwnerInputID(CURRENT_USER_KEY, 'lastName')]: 'Doe'},
            owners,
            CURRENT_USER_KEY,
        );

        // Then the saved name keeps its middle part, and the edit wins once there is one
        expect(savedName).toBe('Jane Mary Doe');
        expect(editedName).toBe('Janet Doe');
    });
});

describe('USD owners codec', () => {
    it('matches the saved owners to the client IDs by position', () => {
        // Given a server that keeps the owner IDs in the same order as the owners
        const achData: ACHData = {
            beneficialOwnerKeys: ['a', 'b'],
            beneficialOwners: [
                {firstName: 'Ann', lastName: 'One', dob: '1990-01-01'},
                {firstName: 'Bob', lastName: 'Two', dob: '1991-01-01'},
            ],
        };

        // When the step reads the owners into the form and sends the second one again
        const {ownerKeys, owners} = uboToForm(achData);

        // Then each ID gets its owner, and the request holds the same owner
        expect(ownerKeys).toEqual(['a', 'b']);
        expect(owners.b).toEqual({firstName: 'Bob', lastName: 'Two', dob: '1991-01-01'});
        expect(uboToParams(owners.b)).toEqual(achData.beneficialOwners?.at(1));
    });
});

describe('USD business codec', () => {
    it('sends the tax ID as digits only', () => {
        // Given a tax ID that the user typed with a separator
        // When the step builds the request
        const params = usdBusinessToParams({companyName: 'Acme', companyTaxID: '12-3456789', incorporationType: 'LLC'});

        // Then only the digits are sent and the other fields stay as they are
        expect(params).toEqual({companyName: 'Acme', companyTaxID: '123456789', incorporationType: 'LLC'});
    });
});

describe('agreements codecs', () => {
    it('sends an unchecked USD checkbox as false', () => {
        // Given a form that leaves an unchecked checkbox undefined
        // When the step builds the request
        const params = usdAgreementsToParams({isAuthorizedToUseBankAccount: true});

        // Then every answer is a boolean
        expect(params).toEqual({isAuthorizedToUseBankAccount: true, certifyTrueInformation: false, acceptTermsAndConditions: false});
    });

    it('lets an unchecked NonUSD box in the draft win over the saved answer', () => {
        // Given saved agreements and a user who unchecked one of them again
        const corpay: CorpayData = {authorizedToBindClientToAgreement: true, agreeToTermsAndConditions: true, consentToPrivacyNotice: true};

        // When the step resolves the agreements
        const values = resolveNonUSDAgreements({consentToPrivacyNotice: false}, {corpay});

        // Then the unchecked box stays unchecked
        expect(values).toEqual({authorizedToBindClientToAgreement: true, agreeToTermsAndConditions: true, consentToPrivacyNotice: false});
    });
});

describe('NonUSD signer codec', () => {
    it('answers the director question with yes once the server holds a director, until the user changes it', () => {
        // Given a saved director
        const corpay: CorpayData = {signerFullName: 'Jane Doe'};

        // When the step resolves the answer with and without a draft answer
        // Then the saved director means yes, and the answer of the user wins
        expect(resolveIsUserDirector(undefined, corpay)).toBe(true);
        expect(resolveIsUserDirector({isUserDirector: false}, corpay)).toBe(false);
        expect(resolveIsUserDirector(undefined, undefined)).toBe(false);
    });

    it('takes the owner name for a director who is also an owner', () => {
        // Given signer values with a name the user may have entered before becoming an owner
        const values = {signerFullName: 'Old Name', signerJobTitle: 'CEO'};

        // When the step builds the director request for an owner and for a user who is not an owner
        // Then the owner name replaces the signer name only for the owner
        expect(toDirectorParams(values, 'Jane Doe')).toEqual({signerFullName: 'Jane Doe', signerJobTitle: 'CEO'});
        expect(toDirectorParams(values, undefined)).toEqual(values);
    });
});
