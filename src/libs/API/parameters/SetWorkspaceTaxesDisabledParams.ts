type SetWorkspaceTaxesDisabledParams = {
    policyID: string;
    taxesToUpdate: Record<string, {isDisabled: boolean}>;
};

export default SetWorkspaceTaxesDisabledParams;
