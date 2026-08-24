/** The credential a QA request carries. Handed back on a 401 so the same token can be refreshed or dropped. */
type QARequestAuth = {
    /** Merged into the outgoing request headers */
    headers: Record<string, string>;

    /** The access token `headers` authenticates with */
    accessToken: string;
};

/**
 * Resolves the credential a QA request must carry, or `undefined` when there is no session to authenticate
 * with. The command name decides whether this request is one of the few allowed to start a handshake.
 */
type PrepareQARequestAuth = (command?: string) => Promise<QARequestAuth | undefined>;

/**
 * Decides what a 401 on a QA request means. Resolves the rotated credential to retry with, or throws
 * `CONST.ERROR.CF_REAUTH_REQUIRED` when only a fresh authorize round trip can recover the session. The
 * command decides whether that round trip is actually started or the request just fails.
 */
type HandleQAUnauthorized = (auth: QARequestAuth, options: {isRetry: boolean; command?: string}) => Promise<QARequestAuth>;

export type {HandleQAUnauthorized, PrepareQARequestAuth, QARequestAuth};
