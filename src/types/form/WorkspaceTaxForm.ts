import type Form from './Form';

const INPUT_IDS = {
    ENABLED: 'enabled',
    NAME: 'name',
    VALUE: 'value',
} as const;

type WorkspaceTaxForm = Form<{
    [INPUT_IDS.ENABLED]: boolean;
    [INPUT_IDS.NAME]: string;
    [INPUT_IDS.VALUE]: string;
}>;

export type {WorkspaceTaxForm};
export default INPUT_IDS;
