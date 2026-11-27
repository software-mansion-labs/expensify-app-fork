/**
 * The details pages of one NonUSD owner: the name, the ownership share and the confirmation that puts the owner into the
 * list. The user who owns 25% fills in the same pages under CURRENT_USER_OWNER_ID, with the titles of the user's own data.
 * The confirmation sends nothing: the list page sends every owner. The result is a list of page configs, so the owners
 * step puts it among its own pages.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {GlobalOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import {ConfirmationSubPage, FullNameSubPage, PageLoadingIndicator, SingleFieldSubPage} from '@pages/SimplifiedBankOnboarding/core';
import type {SubPageConfig} from '@pages/SimplifiedBankOnboarding/core';
import {canAddMoreGlobalOwners, isValidGlobalOwnerShare} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerLimits';
import {CURRENT_USER_OWNER_ID} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerList';
import type {OwnerLoop} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerLoop';
import {getOwnerFullName} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/serverOwners';

import CONST from '@src/CONST';

import React from 'react';

import type {OwnersPageName} from './ownersPages';

import PAGES from './ownersPages';

/**
 * An owner opened from the list goes back to the list. The user goes back to the question about the user. Another new
 * owner goes back to the question that opened it: "are there more" once others are listed, else "anyone else" (BC-09).
 */
function getNamePageBack(loop: OwnerLoop<GlobalOwnerDraft>) {
    if (loop.isEditingListedOwner) {
        return PAGES.BENEFICIAL_OWNERS_LIST;
    }
    if (loop.ownerBeingModifiedID === CURRENT_USER_OWNER_ID) {
        return PAGES.IS_USER_BENEFICIAL_OWNER;
    }
    const hasOtherListedOwners = loop.owners.some((owner) => owner.id !== CURRENT_USER_OWNER_ID);
    return hasOtherListedOwners ? PAGES.ARE_THERE_MORE_BENEFICIAL_OWNERS : PAGES.IS_ANYONE_ELSE_BENEFICIAL_OWNER;
}

/** After the user's own details the question about the other owners comes, after another owner the "more" question */
function getConfirmationNext(loop: OwnerLoop<GlobalOwnerDraft>) {
    if (loop.isEditingListedOwner || !canAddMoreGlobalOwners(loop.ownersAfterCommit)) {
        return PAGES.BENEFICIAL_OWNERS_LIST;
    }
    return loop.ownerBeingModifiedID === CURRENT_USER_OWNER_ID ? PAGES.IS_ANYONE_ELSE_BENEFICIAL_OWNER : PAGES.ARE_THERE_MORE_BENEFICIAL_OWNERS;
}

function getOwnerDetailsPages(translate: LocalizedTranslate, loop: OwnerLoop<GlobalOwnerDraft>): Array<SubPageConfig<OwnersPageName>> {
    const ownerID = loop.ownerBeingModifiedID;
    if (!ownerID) {
        return [PAGES.NAME, PAGES.OWNERSHIP_PERCENTAGE, PAGES.CONFIRMATION].map((name) => ({
            name,
            back: name === PAGES.NAME ? getNamePageBack(loop) : undefined,
            content: <PageLoadingIndicator />,
        }));
    }

    const {buffer} = loop;
    const isUserEnteringOwnData = ownerID === CURRENT_USER_OWNER_ID;
    const ownershipPercentage = `${buffer.ownerOwnershipPercentage}%`;

    return [
        {
            name: PAGES.NAME,
            back: getNamePageBack(loop),
            content: (
                <FullNameSubPage
                    title={translate(isUserEnteringOwnData ? 'ownershipInfoStep.whatsYourName' : 'ownershipInfoStep.whatsTheOwnersName')}
                    subtitle={translate(isUserEnteringOwnData ? 'personalInfoStep.legalNameSubtitle' : 'beneficialOwnerInfoStep.legalNameSubtitle')}
                    firstNameInputID={INPUT_IDS.OWNER_FIRST_NAME}
                    lastNameInputID={INPUT_IDS.OWNER_LAST_NAME}
                    defaultValues={{
                        firstName: buffer.ownerFirstName,
                        lastName: buffer.ownerLastName,
                    }}
                />
            ),
        },
        {
            name: PAGES.OWNERSHIP_PERCENTAGE,
            content: (
                <SingleFieldSubPage
                    title={translate('ownershipInfoStep.whatPercentage')}
                    label={translate('ownershipInfoStep.ownership')}
                    inputID={INPUT_IDS.OWNER_OWNERSHIP_PERCENTAGE}
                    inputMode={CONST.INPUT_MODE.NUMERIC}
                    defaultValue={buffer.ownerOwnershipPercentage}
                    validate={(value) => (isValidGlobalOwnerShare(value, loop.owners, ownerID) ? undefined : 'bankAccount.error.ownershipPercentage')}
                />
            ),
        },
        {
            name: PAGES.CONFIRMATION,
            next: getConfirmationNext(loop),
            content: (
                <ConfirmationSubPage
                    title={translate('ownershipInfoStep.letsDoubleCheck')}
                    rows={[
                        {
                            label: translate('ownershipInfoStep.legalName'),
                            value: getOwnerFullName({
                                firstName: buffer.ownerFirstName,
                                lastName: buffer.ownerLastName,
                            }),
                            page: PAGES.NAME,
                        },
                        {
                            label: translate('ownershipInfoStep.ownershipPercentage'),
                            value: ownershipPercentage,
                            page: PAGES.OWNERSHIP_PERCENTAGE,
                        },
                    ]}
                    getDraftUpdate={loop.getCommitUpdate}
                />
            ),
        },
    ];
}

export default getOwnerDetailsPages;
