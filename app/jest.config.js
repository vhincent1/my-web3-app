import { createDefaultPreset } from 'ts-jest';

const tsJestTransformCfg = createDefaultPreset({
  diagnostics: {
    ignoreCodes: [151002, 'TS151002'],
  },
}).transform;

/** @type {import("jest").Config} **/
export default {
  testEnvironment: 'node',
  transform: {
    ...tsJestTransformCfg,
  },
  // roots: ['program-motd/tests/'],
};
