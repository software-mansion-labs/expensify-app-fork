/**
 * What a flow gives the shared owner step: its owners, its page IDs, its copy and the rules where the flows differ. The
 * USD flow keeps the user out of its list, the NonUSD flow lists the user under a fixed ID and asks for a share.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {ConfirmationRow, FormPageConfig, ListRow, PageID, PageTransition} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {OwnerQuestionAnswers} from '@pages/SimplifiedBankOnboarding/model/answers/types';
import type {OwnerBuffer} from '@pages/SimplifiedBankOnboarding/model/owners/ownerBuffer';
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
type OwnerDetailsPage = Omit<FormPageConfig, 'isComplete' | 'previousPageID'>;

type OwnersStepDefinition<TOwner extends Owner> = {
    subPages: OwnerSubPages;
    answers: OwnerQuestionAnswers & {owners: TOwner[]};

    /** The user owns 25% or more */
    isUserOwner: boolean;

    /** Undefined until the user answered whether anyone else owns 25% or more */
    hasOtherOwners: boolean | undefined;

    /** The details pages and the confirmation are in the plan */
    shouldShowOwnerPages: boolean;
    canAddMoreOwners: (owners: TOwner[]) => boolean;

    /** The ID of the user in the list, for a flow that lists the user as an owner */
    userOwnerID?: string;
    detailsPages: [OwnerDetailsPage, ...OwnerDetailsPage[]];
    confirmationTitle: string;
    confirmationRows: ConfirmationRow[];
    listRows: ListRow[];
    copy: OwnerQuestionCopy;
    getOwnerBuffer: (owner: TOwner | undefined) => OwnerBuffer;
    getOwnerFromBuffer: (id: string, buffer: OwnerBuffer) => TOwner;
    getOwnersDraftUpdate: (owners: TOwner[]) => OnboardingDraft;

    /** Decides what follows the answer to the question whether the user is an owner */
    onUserOwnerAnswer: (values: OnboardingDraft) => PageTransition;
    translate: LocalizedTranslate;
};

export type {Owner, OwnerDetailsPage, OwnerQuestionCopy, OwnerSubPages, OwnersStepDefinition};
