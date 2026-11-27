import {getDefaultEditReturnPage, getNextPage, getPreviousPage, getStartPage, NEXT_STEP, PREVIOUS_STEP} from '@pages/SimplifiedBankOnboarding/core/step/subPages';
import type {SubPageConfig} from '@pages/SimplifiedBankOnboarding/core/step/subPages';

function findPage<TPageName extends string>(pages: Array<SubPageConfig<TPageName>>, name: TPageName): SubPageConfig<TPageName> {
    const page = pages.find((config) => config.name === name);
    if (!page) {
        throw new Error(`The test step has no page ${name}`);
    }
    return page;
}

type PersonalInfoPageName = 'full-name' | 'date-of-birth' | 'ssn' | 'confirmation';

function getPersonalInfoPages(answered: PersonalInfoPageName[] = []): Array<SubPageConfig<PersonalInfoPageName>> {
    return [
        {name: 'full-name', isAnswered: answered.includes('full-name'), content: 'Name'},
        {name: 'date-of-birth', isAnswered: answered.includes('date-of-birth'), content: 'Birthday'},
        {name: 'ssn', isAnswered: answered.includes('ssn'), content: 'SSN'},
        {name: 'confirmation', content: 'Confirmation'},
    ];
}

describe('subPages', () => {
    it('lets next and back override the order of the pages', () => {
        // Given a step whose last page names its own Back and ends the step
        const pages: Array<SubPageConfig<'full-name' | 'date-of-birth' | 'ssn'>> = [
            {name: 'full-name', content: 'Name'},
            {name: 'date-of-birth', content: 'Birthday'},
            {name: 'ssn', back: 'full-name', next: NEXT_STEP, content: 'SSN'},
        ];

        // When Next and Back move between the pages
        const nextFromName = getNextPage(pages, findPage(pages, 'full-name'), undefined);
        const nextFromSSN = getNextPage(pages, findPage(pages, 'ssn'), undefined);
        const backFromSSN = getPreviousPage(pages, findPage(pages, 'ssn'));

        // Then a page without overrides follows the order, and `next` and `back` win over it
        expect(nextFromName !== NEXT_STEP && nextFromName.name).toBe('date-of-birth');
        expect(nextFromSSN).toBe(NEXT_STEP);
        expect(backFromSSN?.name).toBe('full-name');
    });

    it('opens the target of the content over next, and the next page in order for a target the step does not have', () => {
        // Given a step whose first page names the confirmation as its Next
        const pages = getPersonalInfoPages().map((page): SubPageConfig<PersonalInfoPageName> => (page.name === 'full-name' ? {...page, next: 'confirmation'} : page));

        // When the content of the first page asks for the SSN page, and then for a page that the step does not have
        const pageOfTarget = getNextPage(pages, findPage(pages, 'full-name'), 'ssn');
        const pageOfUnknownTarget = getNextPage(pages, findPage(pages, 'full-name'), 'legal-name');

        // Then the target of the content wins, and an unknown target falls back to the order, not to `next`
        expect(pageOfTarget !== NEXT_STEP && pageOfTarget.name).toBe('ssn');
        expect(pageOfUnknownTarget !== NEXT_STEP && pageOfUnknownTarget.name).toBe('date-of-birth');
    });

    it('leaves the step on Back from a page whose back is PREVIOUS_STEP', () => {
        // Given a waiting page after the email page, from which Back must leave the step instead of reopening the email
        const pages: Array<SubPageConfig<'enter-email' | 'hang-tight'>> = [
            {name: 'enter-email', content: 'Email'},
            {name: 'hang-tight', back: PREVIOUS_STEP, content: 'Wait'},
        ];

        // When Back is pressed on the waiting page and on the email page
        const backFromWaiting = getPreviousPage(pages, findPage(pages, 'hang-tight'));
        const backFromEmail = getPreviousPage(pages, findPage(pages, 'enter-email'));

        // Then neither has a previous page, so the step goes back to the previous step as on its first page
        expect(backFromWaiting).toBeUndefined();
        expect(backFromEmail).toBeUndefined();
    });

    it('opens the first page that is not answered on a resume and the first page after Next', () => {
        // Given a step whose first two pages are answered
        const pages = getPersonalInfoPages(['full-name', 'date-of-birth']);

        // When the step opens without a page in the URL, once on a resume and once after Next from the previous step
        const resumedPage = getStartPage(pages, {urlPage: undefined, startAt: undefined, hasArrivedByNext: false});
        const pageAfterNext = getStartPage(pages, {urlPage: undefined, startAt: undefined, hasArrivedByNext: true});

        // Then a resume continues where the answers stop, and Next always starts at the beginning of the step
        expect(resumedPage?.name).toBe('ssn');
        expect(pageAfterNext?.name).toBe('full-name');
    });

    it('prefers the page of the URL, then startAt, and opens the last page when every page is answered', () => {
        // Given a step where every page is answered
        const pages = getPersonalInfoPages(['full-name', 'date-of-birth', 'ssn', 'confirmation']);

        // When the step opens with a page in the URL, with startAt, and with neither
        const urlPage = getStartPage(pages, {urlPage: 'date-of-birth', startAt: 'ssn', hasArrivedByNext: true});
        const startAtPage = getStartPage(pages, {urlPage: 'name', startAt: 'ssn', hasArrivedByNext: true});
        const lastPage = getStartPage(pages, {urlPage: undefined, startAt: undefined, hasArrivedByNext: false});

        // Then the URL wins, startAt wins over Next when the step has no page of the URL, and a finished step opens its last page
        expect(urlPage?.name).toBe('date-of-birth');
        expect(startAtPage?.name).toBe('ssn');
        expect(lastPage?.name).toBe('confirmation');
    });

    it('returns an edit without a return page to the next confirmation, else to the last page', () => {
        // Given a step with a waiting page after its confirmation, and a step without a confirmation
        const signerPages: Array<SubPageConfig<'job-title' | 'confirmation' | 'hang-tight'>> = [
            {name: 'job-title', content: 'Job title'},
            {name: 'confirmation', content: 'Confirmation'},
            {name: 'hang-tight', content: 'Waiting'},
        ];
        const pagesWithoutConfirmation: Array<SubPageConfig<'full-name' | 'ssn'>> = [
            {name: 'full-name', content: 'Name'},
            {name: 'ssn', content: 'SSN'},
        ];

        // When an edit link that names no return page is left on a page of each step
        const signerReturnPage = getDefaultEditReturnPage(signerPages, findPage(signerPages, 'job-title'));
        const returnPageWithoutConfirmation = getDefaultEditReturnPage(pagesWithoutConfirmation, findPage(pagesWithoutConfirmation, 'full-name'));

        // Then the user reviews the edit on the confirmation, not on the waiting page after it, and the last page is the fallback
        expect(signerReturnPage?.name).toBe('confirmation');
        expect(returnPageWithoutConfirmation?.name).toBe('ssn');
    });
});
