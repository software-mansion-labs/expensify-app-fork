describe('full screen navigator', () => {
    it('goes back to proper entry in history after pushing page A, B, A', () => {
        cy.visit('settings/workspaces');
        cy.get(`[aria-label="row"]`).first().click();
        cy.get(`[aria-label="Categories"][role="menuitem"]`).click();
        cy.get(`[aria-label="Members"][role="menuitem"]`).click();
        cy.get(`[aria-label="More features"][role="menuitem"]`).click();
        cy.get(`[aria-label="Members"][role="menuitem"]`).click();
        cy.go(-1);
        cy.contains(`Enable optional functionality that helps you scale your team.`).should('be.visible');
    });
});
