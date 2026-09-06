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
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
};

export default createJestConfig(config);
