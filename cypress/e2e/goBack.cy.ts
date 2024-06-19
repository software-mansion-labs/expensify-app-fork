describe('go back', () => {
    // There was a problem with going back and central pane / bottom tab bar sync.
    it('go back to search page on small screen', () => {
        // We have to make sure thath the layout is narrow.
        cy.viewport(700, 1200);
        cy.visit('search/all');
        cy.get(`[aria-label="Start chat (Floating action)"]`).click();
        cy.wait(200);
        cy.contains('Submit expense').click();
        cy.wait(1000);
        cy.get('input[type="text"]').type('123');
        cy.contains('Next').click();
        cy.contains('adam.grzybowski+3@swmansion.com').click();
        cy.contains('Submit PLN').click();
        cy.get(`[aria-label="Back"]`).last().click();
        cy.contains('Search').should('be.visible');
    });
});
