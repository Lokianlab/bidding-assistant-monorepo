import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Node.js scripts（使用 CommonJS require，不走 TS 模組規則）
    "scripts/**",
  ]),
  // 全域規則覆蓋
  {
    rules: {
      // 允許 _ 前綴慣例（刻意不用的參數或變數）
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // 本專案的 setState in effect 均為正確模式：
      // - hydration-safe 載入（mount 後一次性設定）
      // - early-return reset（if (!condition) { setState(null); return; }）
      // - fetchData 後更新（非無條件同步呼叫）
      // 關閉此規則避免誤報
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
