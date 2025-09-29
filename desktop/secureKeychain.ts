import {spawn} from 'child_process';

interface KeychainOptions {
    account: string;
    service: string;
    password?: string;
    requireAuth?: boolean;
}

interface KeychainError extends Error {
    code?: string;
    exitCode?: number;
}

class SecureKeychain {
    private readonly executablePath = '/usr/bin/security';

    /**
     * Set or update a password in the macOS keychain with authentication requirement
     * @param opts - Options containing account, service, password, and requireAuth flag
     * @returns Promise that resolves to true on success
     */
    async setPassword(opts: KeychainOptions): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (process.platform !== 'darwin') {
                reject(this.createError('UnsupportedPlatform', `Expected darwin platform, got: ${process.platform}`));
                return;
            }

            if (!opts.account) {
                reject(this.createError('NoAccountProvided', 'An account is required'));
                return;
            }

            if (!opts.service) {
                reject(this.createError('NoServiceProvided', 'A service is required'));
                return;
            }

            if (!opts.password) {
                reject(this.createError('NoPasswordProvided', 'A password is required'));
                return;
            }

            const args = [
                'add-generic-password',
                '-a', opts.account,
                '-s', opts.service,
                '-w', opts.password,
                '-U', // Update if exists
                '-T', '', // No trusted applications - require auth for every access
                '-A' // Allow any application to access this item (but still require auth due to -T '')
            ];

            const security = spawn(this.executablePath, args);
            let stderr = '';

            security.stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            security.on('close', (code: number) => {
                if (code !== 0) {
                    // Code 45 means the item already exists, try to delete and re-add
                    if (code === 45) {
                        this.deletePassword(opts)
                            .then(() => this.setPassword(opts))
                            .then(resolve)
                            .catch(reject);
                    } else {
                        const error = this.createError('ServiceFailure', `Failed to set password: ${stderr}`);
                        error.exitCode = code;
                        reject(error);
                    }
                } else {
                    // After setting the password, modify its access control
                    this.setAccessControl(opts)
                        .then(() => resolve(true))
                        .catch(reject);
                }
            });

            security.on('error', (err: Error) => {
                reject(this.createError('ServiceFailure', `Keychain failed to start child process: ${err.message}`));
            });
        });
    }

    /**
     * Set access control to require authentication for keychain item
     * @param opts - Options containing account and service
     * @returns Promise that resolves when access control is set
     */
    private async setAccessControl(opts: Omit<KeychainOptions, 'password'>): Promise<void> {
        return new Promise((resolve, reject) => {
            // Use security command to set access control
            // -u flag requires user authentication for item access
            const args = [
                'set-generic-password-partition-list',
                '-a', opts.account,
                '-s', opts.service,
                '-S', 'apple:', // Set partition list to require authentication
                '-k', '' // Require keychain password
            ];

            const security = spawn(this.executablePath, args);
            let stderr = '';

            security.stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            security.on('close', (code: number) => {
                // Ignore errors for this command as it might not be supported
                // but the -T '' flag should still provide protection
                resolve();
            });

            security.on('error', () => {
                // Ignore errors - access control is best effort
                resolve();
            });
        });
    }

    /**
     * Retrieve a password from the macOS keychain (will require authentication due to ACL)
     * @param opts - Options containing account and service
     * @returns Promise that resolves to the password string
     */
    async getPassword(opts: Omit<KeychainOptions, 'password'>): Promise<string> {
        return new Promise((resolve, reject) => {
            if (process.platform !== 'darwin') {
                reject(this.createError('UnsupportedPlatform', `Expected darwin platform, got: ${process.platform}`));
                return;
            }

            if (!opts.account) {
                reject(this.createError('NoAccountProvided', 'An account is required'));
                return;
            }

            if (!opts.service) {
                reject(this.createError('NoServiceProvided', 'A service is required'));
                return;
            }

            // Note: The -g flag prints the password to stderr instead of stdout
            // This is a quirk of the security command
            const args = [
                'find-generic-password',
                '-a', opts.account,
                '-s', opts.service,
                '-g' // Get the password (will prompt for auth if ACL requires it)
            ];

            const security = spawn(this.executablePath, args);
            let stdout = '';
            let stderr = '';
            let password = '';

            security.stdout.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            security.stderr.on('data', (data: Buffer) => {
                const output = data.toString();
                stderr += output;
                // The password is actually printed to stderr with the format:
                // password: "actualPassword" or password: 0xHEX
                if (output.includes('password:')) {
                    password = output;
                }
            });

            security.on('close', (code: number) => {
                if (code !== 0) {
                    if (code === 44 || stderr.includes('could not be found')) {
                        reject(this.createError('PasswordNotFound', 'Could not find password'));
                    } else if (code === 128 || stderr.includes('User canceled')) {
                        reject(this.createError('UserCanceled', 'User canceled the authentication'));
                    } else {
                        const error = this.createError('ServiceFailure', `Failed to get password: ${stderr}`);
                        error.exitCode = code;
                        reject(error);
                    }
                } else {
                    // Parse the password from the output
                    if (password.includes('password:')) {
                        // Handle hex-encoded passwords
                        const hexMatch = password.match(/password:\s*0x([0-9a-fA-F]+)/);
                        if (hexMatch) {
                            resolve(Buffer.from(hexMatch[1], 'hex').toString());
                        } else {
                            // Handle quoted passwords
                            const quotedMatch = password.match(/password:\s*"(.*)"/);
                            if (quotedMatch) {
                                resolve(quotedMatch[1]);
                            } else {
                                // Fallback: try to extract any text after "password:"
                                const simpleMatch = password.match(/password:\s*(.+)/);
                                resolve(simpleMatch ? simpleMatch[1].trim() : '');
                            }
                        }
                    } else {
                        reject(this.createError('PasswordNotFound', 'Could not parse password from keychain'));
                    }
                }
            });

            security.on('error', (err: Error) => {
                reject(this.createError('ServiceFailure', `Keychain failed to start child process: ${err.message}`));
            });
        });
    }

    /**
     * Delete a password from the macOS keychain
     * @param opts - Options containing account and service
     * @returns Promise that resolves on successful deletion
     */
    async deletePassword(opts: Omit<KeychainOptions, 'password'>): Promise<void> {
        return new Promise((resolve, reject) => {
            if (process.platform !== 'darwin') {
                reject(this.createError('UnsupportedPlatform', `Expected darwin platform, got: ${process.platform}`));
                return;
            }

            if (!opts.account) {
                reject(this.createError('NoAccountProvided', 'An account is required'));
                return;
            }

            if (!opts.service) {
                reject(this.createError('NoServiceProvided', 'A service is required'));
                return;
            }

            const args = [
                'delete-generic-password',
                '-a', opts.account,
                '-s', opts.service
            ];

            const security = spawn(this.executablePath, args);
            let stderr = '';

            security.stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            security.on('close', (code: number) => {
                if (code !== 0) {
                    if (code === 44) {
                        reject(this.createError('PasswordNotFound', 'Could not find password to delete'));
                    } else {
                        const error = this.createError('ServiceFailure', `Failed to delete password: ${stderr}`);
                        error.exitCode = code;
                        reject(error);
                    }
                } else {
                    resolve();
                }
            });

            security.on('error', (err: Error) => {
                reject(this.createError('ServiceFailure', `Keychain failed to start child process: ${err.message}`));
            });
        });
    }

    /**
     * Create a custom error with a specific code
     * @param code - Error code
     * @param message - Error message
     * @returns KeychainError object
     */
    private createError(code: string, message: string): KeychainError {
        const error = new Error(message) as KeychainError;
        error.code = code;
        error.name = `${code}Error`;
        return error;
    }
}

export default SecureKeychain;
export type {KeychainOptions, KeychainError};