/**
 * What a flow gives the shared owner step: its owners, its page IDs, its copy and the rules where the flows differ. The
 * USD flow keeps the user out of its list, the NonUSD flow lists the user under a fixed ID and asks for a share.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {PageID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {ListRow} from '@pages/SimplifiedBankOnboarding/core';
import type {FormPageConfig, PageTransition} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';

import type {OwnerBuffer, OwnerDraftMapping} from './ownerBuffer';
import type {Owner} from './ownerList';

/** The owner answers that both flows share. A flow adds its own owner list to them. */
type OwnerQuestionAnswers = OwnerBuffer & {
    ownsMoreThan25Percent: boolean | undefined;
    hasOtherBeneficialOwners: boolean | undefined;

    /** Asked after each new owner and never saved, so only the draft knows it */
    hasMoreBeneficialOwners: boolean | undefined;

    /** Null while the user adds a new owner */
    ownerBeingModifiedID: string | null;
};

type OwnerSubPages = {
    isUserOwner: PageID;
    isAnyoneElseOwner: PageID;
    confirmation: PageID;
    areThereMoreOwners: PageID;
    ownersList: PageID;
};

type OwnerQuestionCopy = {
    isUserOwnerTitle: string;
    isAnyoneElseOwnerTitle: string;
    areThereMoreOwnersTitle: string;
    description: string;
};

/** A page that edits the owner buffer. The shared step decides its completeness and where Back leads from the first one. */
type OwnerDetailsPage = Pick<FormPageConfig, 'id' | 'title' | 'description' | 'fields'>;

type OwnersStepDefinition<TOwner extends Owner> = {
    subPages: OwnerSubPages;
    answers: OwnerQuestionAnswers & {owners: TOwner[]};

    /** How an owner of the flow goes through the owner buffer and where the list is saved */
    ownerDraft: OwnerDraftMapping<TOwner>;
    canAddMoreOwners: (owners: TOwner[]) => boolean;

    /** The ID of the user in the list, for a flow that lists the user as an owner and so asks for the user's details */
    userOwnerID?: string;
    detailsPages: [OwnerDetailsPage, ...OwnerDetailsPage[]];
    confirmationTitle: string;
    listRows: ListRow[];
    copy: OwnerQuestionCopy;

    /** Decides what follows the answer to the question whether the user is an owner */
    onUserOwnerAnswer: (values: OnboardingDraft) => PageTransition;
    translate: LocalizedTranslate;
};

export type {Owner, OwnerDetailsPage, OwnerQuestionAnswers, OwnerQuestionCopy, OwnerSubPages, OwnersStepDefinition};
