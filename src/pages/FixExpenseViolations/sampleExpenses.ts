type SampleExpense = {
    amount: string;
    distance: string | null;
    rate: string | null;
    category: string | null;
    description: string;
    merchant?: string;
    reportNumber: string;
    workspaceName: string;
};

const SAMPLE_VIOLATION_EXPENSES: SampleExpense[] = [
    {
        amount: '$2.20',
        distance: '3.03 mi',
        rate: '$0.725 / mi',
        category: null,
        description: '',
        reportNumber: '32619870',
        workspaceName: 'Borton Corp',
    },
    {
        amount: '$15.40',
        distance: '21.20 mi',
        rate: '$0.725 / mi',
        category: 'Travel',
        description: 'Client visit',
        reportNumber: '32619870',
        workspaceName: 'Borton Corp',
    },
    {
        amount: '$48.00',
        distance: null,
        rate: null,
        category: null,
        description: 'Lunch with team',
        merchant: "Joe's Diner",
        reportNumber: '32619871',
        workspaceName: 'Borton Corp',
    },
    {
        amount: '$120.50',
        distance: null,
        rate: null,
        category: 'Software',
        description: 'Annual subscription',
        merchant: 'GitHub',
        reportNumber: '32619872',
        workspaceName: 'Borton Corp',
    },
];

export default SAMPLE_VIOLATION_EXPENSES;
export type {SampleExpense};
