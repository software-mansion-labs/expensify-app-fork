import {getNextOwnerSubPage, getSubPageAfterOwnerDetails} from '@pages/SimplifiedBankOnboarding/nonUSD/BeneficialOwnerInfo/ownerLoop';
import type {OwnerLoopState, OwnerQuestion} from '@pages/SimplifiedBankOnboarding/nonUSD/BeneficialOwnerInfo/ownerLoop';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import {getNextUBOSubPage, getSubPageAfterUBODetails} from '@pages/SimplifiedBankOnboarding/usd/BeneficialOwners/uboLoop';
import type {UBOLoopState, UBOQuestion} from '@pages/SimplifiedBankOnboarding/usd/BeneficialOwners/uboLoop';

const USD = SBO_CONST.USD.BENEFICIAL_OWNERS_SUB_PAGES;
const NON_USD = SBO_CONST.NON_USD.BENEFICIAL_OWNER_INFO_SUB_PAGES;
const {CURRENT_USER_KEY} = SBO_CONST.NON_USD;
const NEW_OWNER_ID = 'new';

const UBO_STATE: UBOLoopState = {ownerKeys: [], isUserUBO: false, ownerBeingModifiedID: undefined, isEditingCreatedOwner: false};

describe('USD owner loop', () => {
    it.each<[string, UBOQuestion, boolean, Partial<UBOLoopState>, ReturnType<typeof getNextUBOSubPage>]>([
        ['user owns a share', USD.IS_USER_UBO, true, {}, {draftValues: {ownsMoreThan25Percent: true}, next: {subPage: USD.IS_ANYONE_ELSE_UBO}}],
        [
            'user owns a share while the list is full',
            USD.IS_USER_UBO,
            true,
            {ownerKeys: ['a', 'b', 'c']},
            {draftValues: {ownsMoreThan25Percent: true, beneficialOwnerKeys: ['a', 'b']}, next: {subPage: USD.IS_ANYONE_ELSE_UBO}},
        ],
        ['nobody else owns a share and the user neither', USD.IS_ANYONE_ELSE_UBO, false, {}, {draftValues: {hasOtherBeneficialOwners: false}, next: {submitOwnerKeys: []}}],
        ['nobody else owns a share but the user does', USD.IS_ANYONE_ELSE_UBO, false, {isUserUBO: true}, {draftValues: {hasOtherBeneficialOwners: false}, next: {subPage: USD.UBOS_LIST}}],
        ['someone else owns a share', USD.IS_ANYONE_ELSE_UBO, true, {}, {draftValues: {hasOtherBeneficialOwners: true, ownerBeingModifiedID: NEW_OWNER_ID}, next: {subPage: USD.LEGAL_NAME}}],
        [
            'someone else owns a share but no place is left',
            USD.IS_ANYONE_ELSE_UBO,
            true,
            {ownerKeys: ['a', 'b'], isUserUBO: true},
            {draftValues: {hasOtherBeneficialOwners: true}, next: {subPage: USD.UBOS_LIST}},
        ],
        ['there are more owners', USD.ARE_THERE_MORE_UBOS, true, {ownerKeys: ['a']}, {draftValues: {ownerBeingModifiedID: NEW_OWNER_ID}, next: {subPage: USD.LEGAL_NAME}}],
        ['there are no more owners', USD.ARE_THERE_MORE_UBOS, false, {ownerKeys: ['a']}, {draftValues: {}, next: {subPage: USD.UBOS_LIST}}],
    ])('answers the question when %s', (_, question, answer, state, expected) => {
        // Given the loop state that the step resolved from the draft and the server
        // When the user answers the question
        const transition = getNextUBOSubPage(question, answer, {...UBO_STATE, ...state}, NEW_OWNER_ID);

        // Then the step merges the answer into the draft and opens the next sub page or sends the owners
        expect(transition).toEqual(expected);
    });

    it.each<[string, Partial<UBOLoopState>, ReturnType<typeof getSubPageAfterUBODetails>]>([
        [
            'a new owner with places left',
            {ownerKeys: [], ownerBeingModifiedID: 'a'},
            {draftValues: {isEditingCreatedOwner: false, beneficialOwnerKeys: ['a']}, next: {subPage: USD.ARE_THERE_MORE_UBOS}},
        ],
        [
            'a new owner that takes the last place',
            {ownerKeys: ['a', 'b'], ownerBeingModifiedID: 'c'},
            {draftValues: {isEditingCreatedOwner: false, beneficialOwnerKeys: ['a', 'b', 'c']}, next: {subPage: USD.UBOS_LIST}},
        ],
        [
            'an owner edited from the list',
            {ownerKeys: ['a'], ownerBeingModifiedID: 'a', isEditingCreatedOwner: true},
            {draftValues: {isEditingCreatedOwner: false}, next: {subPage: USD.UBOS_LIST}},
        ],
    ])('leaves the details form of %s', (_, state, expected) => {
        // Given the owner that the details form just confirmed
        // When the form finishes
        const transition = getSubPageAfterUBODetails({...UBO_STATE, ...state});

        // Then the owner joins the list once and the loop opens the matching sub page
        expect(transition).toEqual(expected);
    });
});

const OWNER_STATE: OwnerLoopState = {ownerKeys: [], isUserOwner: false, ownerBeingModifiedID: undefined, isEditingCreatedOwner: false, ownedPercentages: {}};

describe('NonUSD owner loop', () => {
    it.each<[string, OwnerQuestion, boolean, Partial<OwnerLoopState>, ReturnType<typeof getNextOwnerSubPage>]>([
        [
            'user owns a share',
            NON_USD.IS_USER_BENEFICIAL_OWNER,
            true,
            {},
            {draftValues: {ownsMoreThan25Percent: true, ownerBeingModifiedID: CURRENT_USER_KEY}, next: {subPage: NON_USD.NAME}},
        ],
        [
            'user owns a share next to four owners',
            NON_USD.IS_USER_BENEFICIAL_OWNER,
            true,
            {ownerKeys: ['a', 'b', 'c', 'd']},
            {draftValues: {ownsMoreThan25Percent: true, beneficialOwnerKeys: ['a', 'b', 'c'], ownerBeingModifiedID: CURRENT_USER_KEY}, next: {subPage: NON_USD.NAME}},
        ],
        [
            'user no longer owns a share',
            NON_USD.IS_USER_BENEFICIAL_OWNER,
            false,
            {ownerKeys: [CURRENT_USER_KEY, 'a']},
            {draftValues: {ownsMoreThan25Percent: false, beneficialOwnerKeys: ['a']}, next: {subPage: NON_USD.IS_ANYONE_ELSE_BENEFICIAL_OWNER}},
        ],
        [
            'nobody owns a share',
            NON_USD.IS_ANYONE_ELSE_BENEFICIAL_OWNER,
            false,
            {},
            {draftValues: {anyIndividualOwn25PercentOrMore: false, beneficialOwnerKeys: []}, next: {submitOwnerKeys: []}},
        ],
        [
            'only the user owns a share',
            NON_USD.IS_ANYONE_ELSE_BENEFICIAL_OWNER,
            false,
            {isUserOwner: true},
            {draftValues: {anyIndividualOwn25PercentOrMore: false, beneficialOwnerKeys: [CURRENT_USER_KEY]}, next: {subPage: NON_USD.BENEFICIAL_OWNERS_LIST}},
        ],
        [
            'someone else owns a share',
            NON_USD.IS_ANYONE_ELSE_BENEFICIAL_OWNER,
            true,
            {},
            {draftValues: {anyIndividualOwn25PercentOrMore: true, ownerBeingModifiedID: NEW_OWNER_ID}, next: {subPage: NON_USD.NAME}},
        ],
        [
            'someone else owns a share but the shares leave no room',
            NON_USD.IS_ANYONE_ELSE_BENEFICIAL_OWNER,
            true,
            {ownerKeys: ['a', 'b'], ownedPercentages: {a: 50, b: 30}},
            {draftValues: {anyIndividualOwn25PercentOrMore: true}, next: {subPage: NON_USD.BENEFICIAL_OWNERS_LIST}},
        ],
        [
            'there are more owners',
            NON_USD.ARE_THERE_MORE_BENEFICIAL_OWNERS,
            true,
            {ownerKeys: ['a'], ownedPercentages: {a: 50}},
            {draftValues: {anyIndividualOwn25PercentOrMore: true, ownerBeingModifiedID: NEW_OWNER_ID}, next: {subPage: NON_USD.NAME}},
        ],
        ['there are no more owners', NON_USD.ARE_THERE_MORE_BENEFICIAL_OWNERS, false, {ownerKeys: ['a']}, {draftValues: {}, next: {subPage: NON_USD.BENEFICIAL_OWNERS_LIST}}],
    ])('answers the question when %s', (_, question, answer, state, expected) => {
        // Given the loop state that the step resolved from the draft and the server
        // When the user answers the question
        const transition = getNextOwnerSubPage(question, answer, {...OWNER_STATE, ...state}, NEW_OWNER_ID);

        // Then the step merges the answer into the draft and opens the next sub page or sends the owners
        expect(transition).toEqual(expected);
    });

    it.each<[string, Partial<OwnerLoopState>, ReturnType<typeof getSubPageAfterOwnerDetails>]>([
        [
            'the user',
            {ownerBeingModifiedID: CURRENT_USER_KEY, ownedPercentages: {[CURRENT_USER_KEY]: 30}},
            {draftValues: {beneficialOwnerKeys: [CURRENT_USER_KEY]}, next: {subPage: NON_USD.IS_ANYONE_ELSE_BENEFICIAL_OWNER}},
        ],
        [
            'another owner with room left',
            {ownerKeys: [CURRENT_USER_KEY], ownerBeingModifiedID: 'a', ownedPercentages: {[CURRENT_USER_KEY]: 25, a: 25}},
            {draftValues: {beneficialOwnerKeys: [CURRENT_USER_KEY, 'a']}, next: {subPage: NON_USD.ARE_THERE_MORE_BENEFICIAL_OWNERS}},
        ],
        [
            'an owner whose share leaves no room',
            {ownerKeys: ['a'], ownerBeingModifiedID: 'b', ownedPercentages: {a: 50, b: 30}},
            {draftValues: {beneficialOwnerKeys: ['a', 'b'], isEditingCreatedOwner: false}, next: {subPage: NON_USD.BENEFICIAL_OWNERS_LIST}},
        ],
        [
            'an owner edited from the list',
            {ownerKeys: ['a'], ownerBeingModifiedID: 'a', isEditingCreatedOwner: true, ownedPercentages: {a: 30}},
            {draftValues: {isEditingCreatedOwner: false}, next: {subPage: NON_USD.BENEFICIAL_OWNERS_LIST}},
        ],
    ])('leaves the details form of %s', (_, state, expected) => {
        // Given the owner that the details form just confirmed
        // When the form finishes
        const transition = getSubPageAfterOwnerDetails({...OWNER_STATE, ...state});

        // Then the owner joins the list once and the loop opens the matching sub page
        expect(transition).toEqual(expected);
    });
});
