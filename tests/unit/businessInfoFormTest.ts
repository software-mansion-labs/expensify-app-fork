import {getBusinessInfoParams, getBusinessInfoPrefill} from '@pages/ReimbursementAccount/USD/BusinessInfo/businessInfoForm';

const SAVED_COMPANY = {
    companyName: 'Boulder Development Inc.',
    companyTaxID: '123456789',
    website: 'https://www.expensify.com',
    companyPhone: '4155550132',
    addressStreet: '1 Main Street',
    addressCity: 'Springfield',
    addressState: 'IL',
    addressZipCode: '62701',
    incorporationType: 'LLC',
    incorporationDate: '2020-01-31',
    incorporationState: 'IL',
    industryCode: '111130',
};

const SAVED_BANK_ACCOUNT = {routingNumber: '011401533', accountNumber: '1111222233331111', isSavings: false};

describe('businessInfoForm', () => {
    it('sends back what the bank account holds when the user changes nothing', () => {
        // Given a bank account with a saved business info step
        const achData = {...SAVED_COMPANY, ...SAVED_BANK_ACCOUNT};

        // When its answers prefill the form and the form's answers are turned into API params
        const params = getBusinessInfoParams(getBusinessInfoPrefill(achData), achData, undefined);

        // Then the params equal what was saved, so the address parts survive the move under the street's key and back, and the bank account details go along
        expect(params).toEqual({...SAVED_COMPANY, ...SAVED_BANK_ACCOUNT});
    });

    it('sends the tax ID, phone and website in the form the API takes, and the drafted bank account details over the saved ones', () => {
        // Given answers typed the way people write them, and a draft with another account number
        const answers = {...getBusinessInfoPrefill(SAVED_COMPANY), companyTaxID: '12-3456789', companyPhone: '(415) 555-0132', website: 'expensify.com'};

        // When they are turned into API params
        const params = getBusinessInfoParams(answers, SAVED_BANK_ACCOUNT, {accountNumber: '9999'});

        // Then the API gets the digits, the US number without its country code and a website with a scheme, since it accepts only those
        expect(params).toMatchObject({companyTaxID: '123456789', companyPhone: '4155550132', website: 'http://expensify.com', accountNumber: '9999', routingNumber: '011401533'});
    });
});
