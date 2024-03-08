type SetPolicyTaxesEnabledParams = {
    policyID: string;
    taxFields: Array<{
        taxCode: string;
        enabled: boolean;
    }>;
};

export default SetPolicyTaxesEnabledParams;
