import type Form from './Form';

const INPUT_IDS = {
    MESSAGE: 'message',
} as const;

type ShareComposeMessageForm = Form<{
    [INPUT_IDS.MESSAGE]: string;
}>;

export type {ShareComposeMessageForm};
export default INPUT_IDS;
