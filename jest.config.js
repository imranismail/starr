const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/*.spec.{ts,js}',
  ],
  collectCoverageFrom: [
    '**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/index.{ts,js}',
    '!**/*.spec.{ts,js}',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
};
