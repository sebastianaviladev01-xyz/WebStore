import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import sheriff from '@softarc/eslint-plugin-sheriff';

const sources = ['src/**/*.ts', 'projects/*/src/**/*.ts'];

export default tseslint.config(
  {
    files: sources,
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/prefer-inject': 'error',
      // Prefijo de los selectores de WebStore; los estilos dependen de él.
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'ws', style: 'kebab-case' }],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'ws', style: 'camelCase' },
      ],
      // Permite omitir una clave con `const { [clave]: _omitida, ...resto } = objeto`.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
  { files: sources, extends: [sheriff.configs.all] },
  {
    // Las e2e y su configuración (PBI-0056): TypeScript sin reglas de Angular ni de Sheriff.
    files: ['tests/e2e/**/*.ts', 'playwright.config.ts'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
    rules: { '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }] },
  },
  {
    files: ['src/**/*.html', 'projects/*/src/**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      // `x != null` cubre null y undefined a la vez.
      '@angular-eslint/template/eqeqeq': ['error', { allowNullOrUndefined: true }],
      '@angular-eslint/template/label-has-associated-control': [
        'error',
        { controlComponents: ['mat-select'] },
      ],
    },
  },
  {
    files: ['src/app/features/*/domain/**/*.ts', 'projects/*/src/app/features/*/domain/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['@angular/*', 'rxjs'] }] },
  },
  {
    files: [
      'src/app/features/*/{application,presentation}/**/*.ts',
      'src/app/features/*/*.ts',
      'src/app/layout/**/*.ts',
      'src/app/shared/**/*.ts',
      'projects/*/src/app/features/*/{application,presentation}/**/*.ts',
      'projects/*/src/app/features/*/*.ts',
      'projects/*/src/app/layout/**/*.ts',
    ],
    rules: { 'no-restricted-imports': ['error', { patterns: ['@angular/common/http'] }] },
  },
);
