type ExpenseCreateParams = {
    transactionList: string;
    gpsPoints?: string;
    userEmail?: string;
    isManualRequestScan?: boolean;
};

export default ExpenseCreateParams;
