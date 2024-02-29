import type {TaxRate} from '@src/types/onyx/Policy';

type CreateWorkspaceTaxParams = {
    policyID: string;
    taxRate: TaxRate;
};

export default CreateWorkspaceTaxParams;
