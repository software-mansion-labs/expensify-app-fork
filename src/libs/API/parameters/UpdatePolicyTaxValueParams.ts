type UpdatePolicyTaxValueParams = {
    policyID: string;
    taxFields: {
        name: string;
        value: string;
    };
};

export default UpdatePolicyTaxValueParams;
