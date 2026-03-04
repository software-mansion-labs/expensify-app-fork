import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';

const server = new McpServer({
    name: 'expensify',
    version: '0.1.0',
});

async function callExpensifyAPI(command: string, params: Record<string, string>) {
    const formData = new FormData();
    formData.append('authToken', process.env.EXPENSIFY_AUTH_TOKEN!);
    formData.append('email', process.env.EXPENSIFY_EMAIL ?? '');
    formData.append('referer', 'ecash');
    formData.append('platform', 'mcp');
    formData.append('api_setCookie', 'false');

    for (const [key, value] of Object.entries(params)) {
        formData.append(key, value);
    }

    const resp = await fetch(`https://staging.expensify.com/api/${command}?`, {
        method: 'POST',
        body: formData,
        credentials: 'omit',
    });
    return resp.json();
}

server.tool(
    'create_expense',
    'Create a new expense in Expensify',
    {
        amount: z.number().describe('Amount in cents (e.g. 1050 for $10.50)'),
        currency: z.string().default('USD').describe('Currency code'),
        merchant: z.string().describe('Merchant name'),
        comment: z.string().default('').describe('Description/comment'),
        created: z.string().optional().describe('Date YYYY-MM-DD, defaults to today'),
        category: z.string().optional().describe('Expense category'),
    },
    async ({amount, currency, merchant, comment, created, category}) => {
        const result = await callExpensifyAPI('TrackExpense', {
            amount: String(amount),
            currency,
            merchant,
            comment,
            created: created ?? new Date().toISOString().split('T')[0],
            taxCode: '',
            taxAmount: '0',
            ...(category ? {category} : {}),
        });
        return {
            content: [{type: 'text' as const, text: JSON.stringify(result, null, 2)}],
        };
    },
);

const transport = new StdioServerTransport();
await server.connect(transport);
