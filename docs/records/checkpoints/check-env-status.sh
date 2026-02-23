#!/bin/bash
# 環變檢查腳本 — Checkpoint 用
# 用途：快速掃描環變配置狀態
# 用法：bash .claude/scripts/check-env-status.sh

echo "=== 環變配置狀態檢查 ==="
echo "時間：$(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 檢查 .env.local
echo "1. .env.local 狀態："
if [ -f ".env.local" ]; then
  echo "  ✅ 存在"
  echo "  行數：$(wc -l < .env.local)"
  echo "  關鍵變數："
  grep "NEXT_PUBLIC_SUPABASE_URL\|SUPABASE_SERVICE_ROLE_KEY" .env.local | sed 's/=.*/=***/' | sed 's/^/    /'
else
  echo "  ❌ 不存在 (需創建)"
fi

echo ""

# 檢查 .env.production（若存在）
echo "2. .env.production 狀態："
if [ -f ".env.production" ]; then
  echo "  ✅ 存在"
  echo "  行數：$(wc -l < .env.production)"
else
  echo "  ❌ 不存在（待 Jin 提供）"
fi

echo ""

# 檢查 npm build 能否成功
echo "3. npm run build 檢查："
if npm run build > /tmp/npm-build.log 2>&1; then
  echo "  ✅ 成功"
  echo "  耗時：$(grep -oP 'in \K[^s]*' /tmp/npm-build.log || echo '未知')"
else
  echo "  ❌ 失敗"
  echo "  錯誤摘要："
  tail -5 /tmp/npm-build.log | sed 's/^/    /'
fi

echo ""

# 檢查測試狀態
echo "4. 測試覆蓋檢查："
if npm run test 2>&1 | grep -q "passed"; then
  PASS=$(npm run test 2>&1 | grep -oP '\d+(?= passed)' | tail -1)
  FAIL=$(npm run test 2>&1 | grep -oP '\d+(?= failed)' | tail -1)
  echo "  ✅ 測試通過：$PASS"
  [ -n "$FAIL" ] && [ "$FAIL" -gt 0 ] && echo "  ⚠️  失敗：$FAIL"
else
  echo "  ❌ 測試運行失敗（或無測試）"
fi

echo ""
echo "=== 檢查完成 ==="
