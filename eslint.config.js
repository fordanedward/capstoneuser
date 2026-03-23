import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import tseslint from 'typescript-eslint';

export default [
	{
		ignores: ['node_modules/**', '.svelte-kit/**', '.vercel/**', 'build/**', 'dist/**', 'coverage/**']
	},
	...tseslint.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: {
					ts: tseslint.parser,
					typescript: tseslint.parser,
					js: tseslint.parser
				},
				extraFileExtensions: ['.svelte']
			}
		}
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tseslint.parser
		}
	},
	prettier,
	...svelte.configs['flat/prettier']
];
