#!/bin/bash
# 進度掃描腳本 — Checkpoint 用
# 用途：快速統計各機代碼進度
# 用法：bash .claude/scripts/scan-progress.sh

echo "=== 代碼進度掃描 — $(date '+%Y-%m-%d %H:%M:%S') ==="
echo ""

# M02 KB 後端 (ITEJ)
echo "🔵 ITEJ — M02 KB 後端進度："
if [ -d "src/app/api/kb" ]; then
  ROUTE_FILES=$(find src/app/api/kb -name "*.ts" -o -name "*.tsx" | wc -l)
  ROUTE_LINES=$(find src/app/api/kb -name "*.ts" -o -name "*.tsx" -exec wc -l {} + | tail -1 | awk '{print $1}')
  echo "  API 路由檔案：$ROUTE_FILES 個"
  echo "  總代碼行數：$ROUTE_LINES 行"
  TEST_FILES=$(find "src/app/api/kb/__tests__" -name "*.test.ts" 2>/dev/null | wc -l)
  [ "$TEST_FILES" -gt 0 ] && echo "  測試檔案：$TEST_FILES 個"
else
  echo "  ❌ 尚未開始（src/app/api/kb 不存在）"
fi
echo ""

# M02 KB 前端 (AINL)
echo "🟢 AINL — M02 KB 前端進度："
KB_HOOKS=$(find src/lib/hooks -name "use-kb-*.ts" 2>/dev/null | wc -l)
if [ "$KB_HOOKS" -gt 0 ]; then
  echo "  KB Hooks 實作：$KB_HOOKS 個"
  KB_COMPONENTS=$(find src/components -name "*KB*" -o -name "*kb*" 2>/dev/null | wc -l)
  [ "$KB_COMPONENTS" -gt 0 ] && echo "  UI 元件：$KB_COMPONENTS 個"
else
  echo "  ❌ 尚未開始（use-kb-*.ts 不存在）"
fi
echo ""

# M08 評選簡報 (Z1FV)
echo "🔵 Z1FV — M08 評選簡報進度："
if [ -d "src/app/api/m08" ]; then
  M08_ROUTES=$(find src/app/api/m08 -name "route.ts" | wc -l)
  echo "  API 路由：$M08_ROUTES 個"
  M08_LINES=$(find src/app/api/m08 -name "*.ts" -exec wc -l {} + | tail -1 | awk '{print $1}')
  echo "  代碼行數：$M08_LINES 行"
else
  echo "  ❌ 尚未開始"
fi
echo ""

# M10 履約管理 (Z1FV)
echo "🔵 Z1FV — M10 履約管理進度："
if [ -d "src/app/api/m10" ]; then
  M10_ROUTES=$(find src/app/api/m10 -name "route.ts" | wc -l)
  echo "  API 路由：$M10_ROUTES 個"
  M10_LINES=$(find src/app/api/m10 -name "*.ts" -exec wc -l {} + | tail -1 | awk '{print $1}')
  echo "  代碼行數：$M10_LINES 行"
else
  echo "  ❌ 尚未開始"
fi
echo ""

# M11 結案飛輪 (3O5L)
echo "🟡 3O5L — M11 結案飛輪進度："
if [ -f "src/lib/success-pattern-matcher.ts" ]; then
  M11_LINES=$(wc -l < src/lib/success-pattern-matcher.ts)
  echo "  success-pattern-matcher.ts：$M11_LINES 行"
else
  echo "  ❌ 尚未開始"
fi
echo ""

# 00A 外部資源 (A44T)
echo "🔴 A44T — 00A 外部資源進度："
if [ -f "docs/dev-plan/00A-team-resources.md" ]; then
  DOC_LINES=$(wc -l < docs/dev-plan/00A-team-resources.md)
  echo "  規範文檔：$DOC_LINES 行"
else
  echo "  ❌ 文檔尚未開始"
fi
if [ -f "src/lib/matcher.ts" ]; then
  MATCHER_LINES=$(wc -l < src/lib/matcher.ts)
  echo "  matcher.ts：$MATCHER_LINES 行"
else
  echo "  ❌ matcher.ts 尚未開始"
fi
echo ""

# 總體測試統計
echo "📊 全機測試統計："
if npm run test 2>&1 | grep -q "passed"; then
  TEST_OUTPUT=$(npm run test 2>&1 | tail -20)
  PASS_COUNT=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= passed)' | tail -1)
  FAIL_COUNT=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= failed)' | tail -1)
  echo "  ✅ 通過：$PASS_COUNT"
  [ -n "$FAIL_COUNT" ] && [ "$FAIL_COUNT" -gt 0 ] && echo "  ❌ 失敗：$FAIL_COUNT"
else
  echo "  ⚠️  測試運行失敗或無法統計"
fi

echo ""
echo "=== 掃描完成 ==="
