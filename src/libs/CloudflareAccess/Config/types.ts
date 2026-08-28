/** Whether the QA auth feature is fully configured. Anything short of a complete config disables it */
type IsQAAuthConfigured = () => boolean;

/** Whether a URL may carry the QA bearer token. The security boundary for the whole feature */
type IsQAServerRequest = (url: string) => boolean;

/** The RFC 8707 resource indicator the issued token is bound to. Single-valued by protocol */
type GetQAResource = () => string;

/** The OAuth redirect URI this client sends and handles */
type GetOAuthRedirectURI = () => string;

/** The dynamically registered client, which is per redirect URI and therefore per platform */
type GetOAuthClientID = () => string;

export type {GetOAuthClientID, GetOAuthRedirectURI, GetQAResource, IsQAAuthConfigured, IsQAServerRequest};
