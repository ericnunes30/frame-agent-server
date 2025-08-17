module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
  ],
  rules: {
    // SOLID principles enforcement
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    
    // Evitar métodos Getters e Setters desnecessários
    '@typescript-eslint/no-unnecessary-getter-setter': 'error',
    
    // Máximo de parâmetros por função (alinhado ao princípio de 2 parâmetros)
    'max-params': ['error', 2],
    
    // Classes pequenas (máximo 50 linhas)
    'max-lines-per-function': ['error', { max: 50, skipBlankLines: true }],
    'max-lines': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
    
    // Nomenclatura consistente
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
        prefix: ['I'],
      },
      {
        selector: 'class',
        format: ['PascalCase'],
      },
      {
        selector: 'method',
        format: ['camelCase'],
      },
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
      },
    ],
    
    // Evitar imports desnecessários
    '@typescript-eslint/no-unused-vars': 'error',
    'no-unused-vars': 'off',
    
    // Prefer type-only imports quando possível
    '@typescript-eslint/consistent-type-imports': 'error',
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js'],
};