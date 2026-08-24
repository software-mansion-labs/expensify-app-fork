import useOnyx from '@hooks/useOnyx';

import {isRecord} from '@libs/ObjectUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type ChildrenProps from '@src/types/utils/ChildrenProps';

// This component is compiled by the React Compiler
/* eslint-disable react/jsx-no-constructed-context-values */
import {Str} from 'expensify-common';
import React, {useContext, useState} from 'react';

type LoginStateContextType = {
    login: string;
};

type LoginActionsContextType = {
    setLogin: (login: string) => void;
};

const LoginStateContext = React.createContext<LoginStateContextType>({
    login: '',
});

const LoginActionsContext = React.createContext<LoginActionsContextType>({
    setLogin: () => {},
});

/**
 * Long enough to cover the Cloudflare Access round trip, including signing in to Access and granting consent.
 * Deliberately its own bound rather than the pending-flow TTL it happens to match: this one decides how long a
 * typed address may linger in the tab, which is a different question from how long an authorization code is good for.
 */
const LOGIN_DRAFT_TTL_MS = 10 * 60 * 1000;

/** Storage access itself throws in hardened browser configurations, not just the write */
function getSessionStorage(): Storage | null {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        return window.sessionStorage ?? null;
    } catch {
        return null;
    }
}

/**
 * The typed login lives in React state, which a full-page navigation destroys. `credentials.login` is not a
 * substitute: it is written only once the server answers, and setting it early would hide the login form
 * (see `shouldShowLoginForm`) and advance the screen before the account is known to exist. So the draft is
 * parked here instead. sessionStorage because it is synchronous and scoped to the tab that typed it.
 *
 * Today the only thing that navigates away mid-form is the QA Cloudflare Access handshake, which the first
 * QA request awaits — pressing Continue leaves the page before `BeginSignIn` can answer.
 */
function saveLoginDraft(login: string): void {
    const storage = getSessionStorage();
    if (!storage) {
        return;
    }
    if (!login) {
        storage.removeItem(CONST.SESSION_STORAGE_KEYS.SIGN_IN_LOGIN_DRAFT);
        return;
    }
    storage.setItem(CONST.SESSION_STORAGE_KEYS.SIGN_IN_LOGIN_DRAFT, JSON.stringify({login, createdAt: Date.now()}));
}

/**
 * Read without consuming: the provider can mount more than once per load, and each mount needs the draft.
 * Anything older than the round trip could plausibly take is treated as absent, so signing out later in the
 * same tab still starts from an empty field rather than the previous person's address.
 */
function readLoginDraft(): string {
    const stored = getSessionStorage()?.getItem(CONST.SESSION_STORAGE_KEYS.SIGN_IN_LOGIN_DRAFT);
    if (!stored) {
        return '';
    }
    try {
        const parsed: unknown = JSON.parse(stored);
        if (!isRecord(parsed) || typeof parsed.login !== 'string' || typeof parsed.createdAt !== 'number') {
            return '';
        }
        return Date.now() - parsed.createdAt > LOGIN_DRAFT_TTL_MS ? '' : parsed.login;
    } catch {
        return '';
    }
}

function LoginProvider({children}: ChildrenProps) {
    const [credentials] = useOnyx(ONYXKEYS.CREDENTIALS);
    // The stored login wins where it exists, leaving the pre-existing seed untouched; the draft only fills in
    // the case that used to start empty.
    const [login, setLoginState] = useState(() => Str.removeSMSDomain(credentials?.login ?? '') || readLoginDraft());

    const setLogin = (newLogin: string) => {
        setLoginState(newLogin);
        saveLoginDraft(newLogin);
    };

    const stateValue = {login};
    const actionsValue = {setLogin};

    return (
        <LoginStateContext.Provider value={stateValue}>
            <LoginActionsContext.Provider value={actionsValue}>{children}</LoginActionsContext.Provider>
        </LoginStateContext.Provider>
    );
}

function useLoginState() {
    return useContext(LoginStateContext);
}

function useLoginActions() {
    return useContext(LoginActionsContext);
}

export {LoginProvider, useLoginState, useLoginActions};
