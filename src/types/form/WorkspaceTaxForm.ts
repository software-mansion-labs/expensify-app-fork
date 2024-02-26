import type {ValueOf} from 'type-fest';
import type Form from './Form';

const INPUT_IDS = {
    ENABLED: 'enabled',
    NAME: 'name',
    VALUE: 'value',
} as const;

type InputID = ValueOf<typeof INPUT_IDS>;

type WorkspaceTaxForm = Form<
    InputID,
    {
        [INPUT_IDS.ENABLED]: boolean;
        [INPUT_IDS.NAME]: string;
        [INPUT_IDS.VALUE]: string;
    }
>;

export type {WorkspaceTaxForm};
export default INPUT_IDS;
