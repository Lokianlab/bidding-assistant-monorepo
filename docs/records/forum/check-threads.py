#!/usr/bin/env python3
"""
check-threads.py — 超時偵測工具（Tool 2 from decision-process thread）

讀取 _threads.md 中所有「進行中」的 thread，
找出最後一條回覆的時間戳，對照 priority 的超時規則，
列出已超時或接近超時（< 25% 剩餘）的 thread。

用法: python3 docs/records/forum/check-threads.py
輸出: 超時狀態摘要，空輸出 = 全部正常

超時規則 (從最後一條 reply 算起):
  P0: 4 小時
  P1: 12 小時
  P2: 48 小時
  P3: 無超時
  - (未分配): 按 P2 算
"""

import glob
import os
import re
import sys
from datetime import datetime, timedelta

TIMEOUT_HOURS = {
    'P0': 4,
    'P1': 12,
    'P2': 48,
    'P3': None,  # 不超時
    '-': 48,     # 未分配視為 P2
}

forum_dir = os.path.dirname(os.path.abspath(__file__))

# 讀 _threads.md，找進行中的 thread
threads_file = os.path.join(forum_dir, '_threads.md')
active_threads = {}  # thread_id -> {priority, title, proposer}

with open(threads_file, encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#') or line.startswith('>'):
            continue
        parts = line.split('|')
        if len(parts) < 6:
            continue
        tid, status, priority, title, proposer, last_update = parts[:6]
        if status == '進行中':
            active_threads[tid.strip()] = {
                'priority': priority.strip(),
                'title': title.strip(),
                'proposer': proposer.strip(),
            }

if not active_threads:
    print('沒有進行中的 thread。')
    sys.exit(0)

# 找每個 thread 最後一條回覆的時間戳
# 時間戳格式: YYYYMMDD-HHMM
def parse_ts(ts_str):
    """解析 YYYYMMDD-HHMM 格式的時間戳，回傳 datetime 或 None"""
    ts_str = ts_str.strip()
    m = re.match(r'^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})$', ts_str)
    if not m:
        return None
    try:
        return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)),
                        int(m.group(4)), int(m.group(5)))
    except ValueError:
        return None

thread_last_ts = {}  # thread_id -> datetime

for filepath in sorted(glob.glob(os.path.join(forum_dir, '20*.md'))):
    try:
        raw = open(filepath, encoding='utf-8').read()
    except Exception:
        continue
    content = raw.replace('\r\n', '\n').replace('\r', '\n')
    blocks = re.split(r'\n---(?:\n|$)', content)
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        first_line = block.split('\n')[0]
        parts = first_line.split('|')
        if len(parts) < 2:
            continue
        ts_str = parts[1]
        ts = parse_ts(ts_str)
        if ts is None:
            continue
        # 找 thread: 引用
        m = re.search(r'thread:([^\s|]+)', block)
        if not m:
            continue
        tid = m.group(1).strip()
        if tid in active_threads:
            prev = thread_last_ts.get(tid)
            if prev is None or ts > prev:
                thread_last_ts[tid] = ts

now = datetime.now()

# 輸出超時狀態
results = []
for tid, info in active_threads.items():
    priority = info['priority']
    timeout_h = TIMEOUT_HOURS.get(priority)

    last_ts = thread_last_ts.get(tid)
    if last_ts is None:
        elapsed_h = float('inf')
        last_str = '（找不到帖子）'
    else:
        elapsed = now - last_ts
        elapsed_h = elapsed.total_seconds() / 3600
        elapsed_days = int(elapsed_h // 24)
        elapsed_hrs = int(elapsed_h % 24)
        if elapsed_days > 0:
            last_str = f'{elapsed_days}天{elapsed_hrs}hr 前'
        else:
            last_str = f'{elapsed_hrs:.0f}hr 前'

    if timeout_h is None:
        # P3 不超時
        continue

    pct_elapsed = elapsed_h / timeout_h if timeout_h > 0 else 1.0
    remaining_h = max(0, timeout_h - elapsed_h)

    if pct_elapsed >= 1.0:
        status_str = '🔴 已超時'
    elif pct_elapsed >= 0.75:
        status_str = f'🟡 剩 {remaining_h:.0f}hr'
    else:
        continue  # 正常，不顯示

    results.append((pct_elapsed, tid, info, last_str, status_str, remaining_h, elapsed_h))

if not results:
    print('所有進行中的 thread 均在超時安全區（剩餘 > 25%）。')
    sys.exit(0)

results.sort(key=lambda x: -x[0])  # 最緊急的排前面

print('超時狀態：')
for _, tid, info, last_str, status_str, remaining_h, elapsed_h in results:
    priority = info['priority']
    title = info['title']
    timeout_h = TIMEOUT_HOURS.get(priority, 48)
    line = f'  {status_str} [{priority}] {tid}：最後回覆 {last_str}（{elapsed_h:.0f}/{timeout_h}hr）'
    print(line)
    print(f'    └─ {title}')
