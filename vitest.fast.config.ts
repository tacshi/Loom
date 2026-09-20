import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

export default mergeConfig(
  base,
  defineConfig({
    test: {
      exclude: [
        ...configDefaults.exclude,
        "tests/mission-{applications,course,cpu,logic,programs,special,state}.test.ts",
      ],
    },
  }),
);
