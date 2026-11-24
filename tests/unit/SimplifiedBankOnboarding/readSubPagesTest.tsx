import type {PageID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import {
    getEditReturnPage,
    getNextPage,
    getPreviousPage,
    getStartPage,
    markAsEditReturnTarget,
    NEXT_STEP,
    PREVIOUS_STEP,
    readSubPages,
} from '@pages/SimplifiedBankOnboarding/core/step/readSubPages';
import type {SubPageElementProps, SubPageEntry} from '@pages/SimplifiedBankOnboarding/core/step/readSubPages';
import SubPage from '@pages/SimplifiedBankOnboarding/core/step/SubPage';

import React from 'react';

function TestConfirmation(props: SubPageElementProps) {
    return props.name ?? null;
}
markAsEditReturnTarget(TestConfirmation);

function findPage(pages: SubPageEntry[], name: PageID): SubPageEntry {
    const page = pages.find((entry) => entry.name === name);
    if (!page) {
        throw new Error(`The test step has no page ${name}`);
    }
    return page;
}

function readPersonalInfoPages(answered: PageID[] = []) {
    return readSubPages([
        <SubPage
            key="full-name"
            name="full-name"
            isAnswered={answered.includes('full-name')}
        >
            Name
        </SubPage>,
        <SubPage
            key="date-of-birth"
            name="date-of-birth"
            isAnswered={answered.includes('date-of-birth')}
        >
            Birthday
        </SubPage>,
        <SubPage
            key="ssn"
            name="ssn"
            isAnswered={answered.includes('ssn')}
        >
            SSN
        </SubPage>,
        <TestConfirmation
            key="confirmation"
            name="confirmation"
        />,
    ]).pages;
}

describe('readSubPages', () => {
    it('keeps the order of the children and passes over pages that are not rendered', () => {
        // Given a step whose second page is rendered only for some users
        const isBirthdayAsked = false;
        const {pages} = readSubPages(
            <>
                <SubPage name="full-name">Name</SubPage>
                {isBirthdayAsked && <SubPage name="date-of-birth">Birthday</SubPage>}
                <SubPage
                    name="ssn"
                    back="full-name"
                    next={NEXT_STEP}
                >
                    SSN
                </SubPage>
            </>,
        );

        // When Next and Back move between the pages
        const nextFromName = getNextPage(pages, findPage(pages, 'full-name'), undefined);
        const nextFromSSN = getNextPage(pages, findPage(pages, 'ssn'), undefined);
        const backFromSSN = getPreviousPage(pages, findPage(pages, 'ssn'));

        // Then the page that is not rendered does not exist for the step, and `next` and `back` override the order
        expect(pages.map((page) => page.name)).toEqual(['full-name', 'ssn']);
        expect(nextFromName).not.toBe(NEXT_STEP);
        expect(nextFromName !== NEXT_STEP && nextFromName.name).toBe('ssn');
        expect(nextFromSSN).toBe(NEXT_STEP);
        expect(backFromSSN?.name).toBe('full-name');
    });

    it('leaves the step on Back from a page whose back is PREVIOUS_STEP', () => {
        // Given a waiting page after the email page, from which Back must leave the step instead of reopening the email
        const {pages} = readSubPages(
            <>
                <SubPage name="enter-email">Email</SubPage>
                <SubPage
                    name="hang-tight"
                    back={PREVIOUS_STEP}
                >
                    Wait
                </SubPage>
            </>,
        );

        // When Back is pressed on the waiting page and on the email page
        const backFromWaiting = getPreviousPage(pages, findPage(pages, 'hang-tight'));
        const backFromEmail = getPreviousPage(pages, findPage(pages, 'enter-email'));

        // Then neither has a previous page, so the step goes back to the previous step as on its first page
        expect(backFromWaiting).toBeUndefined();
        expect(backFromEmail).toBeUndefined();
    });

    it('opens the first page that is not answered on a resume and the first page after Next', () => {
        // Given a step whose first two pages are answered
        const pages = readPersonalInfoPages(['full-name', 'date-of-birth']);

        // When the step opens without a page in the URL, once on a resume and once after Next from the previous step
        const resumedPage = getStartPage(pages, {urlPage: undefined, startAt: undefined, hasArrivedByNext: false});
        const pageAfterNext = getStartPage(pages, {urlPage: undefined, startAt: undefined, hasArrivedByNext: true});

        // Then a resume continues where the answers stop, and Next always starts at the beginning of the step
        expect(resumedPage?.name).toBe('ssn');
        expect(pageAfterNext?.name).toBe('full-name');
    });

    it('prefers the page of the URL, then startAt, and opens the last page when every page is answered', () => {
        // Given a step where every page is answered
        const pages = readPersonalInfoPages(['full-name', 'date-of-birth', 'ssn', 'confirmation']);

        // When the step opens with a page in the URL, with startAt, and with neither
        const urlPage = getStartPage(pages, {urlPage: 'date-of-birth', startAt: 'ssn', hasArrivedByNext: true});
        const startAtPage = getStartPage(pages, {urlPage: 'name', startAt: 'ssn', hasArrivedByNext: true});
        const lastPage = getStartPage(pages, {urlPage: undefined, startAt: undefined, hasArrivedByNext: false});

        // Then the URL wins, startAt wins over Next when the URL page is not rendered, and a finished step opens its last page
        expect(urlPage?.name).toBe('date-of-birth');
        expect(startAtPage?.name).toBe('ssn');
        expect(lastPage?.name).toBe('confirmation');
    });

    it('returns from edit mode to the confirmation after the page', () => {
        // Given a step with a confirmation in the middle and one more page after it
        const {pages} = readSubPages([
            <SubPage
                key="full-name"
                name="full-name"
            >
                Name
            </SubPage>,
            <TestConfirmation
                key="confirmation"
                name="confirmation"
            />,
            <SubPage
                key="ssn"
                name="ssn"
            >
                SSN
            </SubPage>,
        ]);

        // When pages are edited before and after the confirmation
        const returnFromName = getEditReturnPage(pages, findPage(pages, 'full-name'));
        const returnFromSSN = getEditReturnPage(pages, findPage(pages, 'ssn'));

        // Then edit mode returns to the confirmation that follows the page, and to the last page when none follows
        expect(returnFromName?.name).toBe('confirmation');
        expect(returnFromSSN?.name).toBe('ssn');
    });

    it('treats children without names as the content of a single page step', () => {
        // Given a step whose children have no names
        const children = <SubPage>The whole step</SubPage>;

        // When the step reads its sub pages
        const plan = readSubPages(children);

        // Then the step has no sub pages and shows its children as they are
        expect(plan.pages).toEqual([]);
        expect(plan.content).toBe(children);
    });

    it('throws for a child without a name among named ones', () => {
        // Given a step where one child among named sub pages has no name
        const children = [
            <SubPage
                key="full-name"
                name="full-name"
            >
                Name
            </SubPage>,
            <SubPage key="unnamed">Forgotten name</SubPage>,
        ];

        // When the step reads its sub pages
        const read = () => readSubPages(children);

        // Then development fails loudly, because the page could never be opened by its URL
        expect(read).toThrow('every sub page needs a name');
    });
});
