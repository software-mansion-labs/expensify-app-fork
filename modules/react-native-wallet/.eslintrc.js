module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
    },
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    rules: {},
    overrides: [
        {
            files: ['modules/react-native-wallet/**/*.ts'],
            parserOptions: {
                project: 'modules/react-native-wallet/tsconfig.json',
            },
        },
    ],
};
