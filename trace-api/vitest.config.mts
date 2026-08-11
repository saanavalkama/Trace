import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        globalSetup: ["./src/test/globalSetup.ts"],
        setupFiles: ["./src/test/setup.ts"],
        fileParallelism: false,
    },
})
