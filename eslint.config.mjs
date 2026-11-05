import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default [
  ...nextVitals,
  ...nextTs,
  { rules: { '@next/next/no-img-element': 'off' } },
  { ignores: ['.next/**', 'out/**', 'reference/**', 'inputs/**', 'node_modules/**', 'reports/**'] },
];
