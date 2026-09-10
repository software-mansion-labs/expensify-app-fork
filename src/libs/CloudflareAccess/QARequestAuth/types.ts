type QARequestAuth = {
    /** Merged into the outgoing request headers */
    headers: Record<string, string>;

    /** The access token `headers` authenticates with */
    accessToken: string;
};

/** The command name decides whether this request is one of the few allowed to start a handshake */
type PrepareQARequestAuth = (command?: string) => Promise<QARequestAuth | undefined>;

/**
 * Throws `CONST.ERROR.CF_REAUTH_REQUIRED` when only a fresh authorize round trip can recover the session.
 * The command decides whether that round trip is actually started or the request just fails.
 */
type HandleQAUnauthorized = (auth: QARequestAuth, options: {isRetry: boolean; command?: string}) => Promise<QARequestAuth>;

export type {HandleQAUnauthorized, PrepareQARequestAuth, QARequestAuth};
