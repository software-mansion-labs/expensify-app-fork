/** Model of a report action draft */
type BankAccountShareDetails = {
    addressName: string;

    /** The user account name */
    accountName: string;

    /** The user's email */
    shareeEmail: string;

    /** Indicates if the share is complete */
    shareComplete: boolean;

    bankAccountID: number;

    routingNumber: string;

    accountNumber: string;

    /** Indicates if the bank supports debit */
    allowDebit: boolean;

    processor: string;

    /** Indicates if the bank account is being validated */
    validating: boolean;
};

export default BankAccountShareDetails;
