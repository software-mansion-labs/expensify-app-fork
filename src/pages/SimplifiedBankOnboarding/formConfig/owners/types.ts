/**
 * What a flow gives the shared owner step: its owners, its page IDs, its copy and the rules where the flows differ. The
 * USD flow keeps the user out of its list, the NonUSD flow lists the user under a fixed ID and asks for a share.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {FormPageConfig, ListRow, PageID, PageTransition} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {OwnerQuestionAnswers} from '@pages/SimplifiedBankOnboarding/model/answers/types';
import type {OwnerDraftMapping} from '@pages/SimplifiedBankOnboarding/model/owners/ownerBuffer';
import type {Owner} from '@pages/SimplifiedBankOnboarding/model/owners/ownerList';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

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

export type {Owner, OwnerDetailsPage, OwnerQuestionCopy, OwnerSubPages, OwnersStepDefinition};
