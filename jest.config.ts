import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  clearMocks: true,
  collectCoverageFrom: [
    "src/features/destination-matching/lib/*.ts",
    "src/features/trip-planner/lib/*.ts",
    "src/features/trip-planner/model/*.ts",
    "src/features/theme-toggle/ui/ThemeToggle.tsx",
  ],
  coverageProvider: "v8",
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Jest runs these tests as CommonJS; use Prisma's equivalent CommonJS engine files.
    "^@prisma/client/runtime/(query_compiler_fast_bg\\.postgresql(?:\\.wasm-base64)?)\\.mjs$": "<rootDir>/node_modules/@prisma/client/runtime/$1.js",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["<rootDir>/e2e/", "\\.integration\\.test\\.ts$"],
};

export default createJestConfig(config);
