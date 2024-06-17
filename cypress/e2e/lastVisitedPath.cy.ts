describe('last visited patch', () => {
    it.skip('saves profile page in last visited path', () => {
        cy.visit('home');
        cy.get(`[aria-label="My settings"]`).click();
        cy.get(`[aria-label="Profile"]`).click();

        cy.wait(1000);
        cy.visit('/');
        cy.contains('Profile').should('be.visible');
    });

    // It's not merged yet
    it('dont saves abracadabra page in last vistied path', () => {
        cy.visit('v/123/abc');
        cy.contains('abc').should('be.visible');
        cy.visit('/');
        cy.contains('abc').should('not.be.visible');
    });
});
