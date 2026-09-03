import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 참조 어댑터(apps/admin)도 검증 대상이다. 데모용이라도 "이렇게 붙이면
    // 된다"는 본보기이므로, 틀린 본보기를 두면 호스트가 그대로 따라 만든다.
    include: ["packages/*/src/**/*.test.ts", "apps/*/**/*.test.ts"],
  },
});
