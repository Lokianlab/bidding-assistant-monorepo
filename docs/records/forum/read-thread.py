#!/usr/bin/env py
"""
read-thread.py — 讀取特定討論串的所有帖子，按時間戳排序輸出
用法: python3 docs/records/forum/read-thread.py {thread-id}
例如: python3 docs/records/forum/read-thread.py forum-optimization
"""

import glob
import os
import re
import sys

if len(sys.argv) < 2:
    print("用法: python3 read-thread.py <thread-id>", file=sys.stderr)
    sys.exit(1)

thread_id = sys.argv[1]
forum_dir = os.path.dirname(os.path.abspath(__file__))

posts = []
for filepath in sorted(glob.glob(os.path.join(forum_dir, '20*.md'))):
    try:
        raw = open(filepath, encoding='utf-8').read()
    except Exception:
        continue
    # normalize CRLF
    content = raw.replace('\r\n', '\n').replace('\r', '\n')
    # posts are separated by lines containing only ---
    blocks = re.split(r'\n---(?:\n|$)', content)
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        if 'thread:' + thread_id in block:
            first_line = block.split('\n')[0]
            parts = first_line.split('|')
            ts = parts[1] if len(parts) >= 2 else '00000000-0000'
            posts.append((ts, block))

posts.sort(key=lambda x: x[0])

if not posts:
    print(f'找不到 thread: {thread_id}', file=sys.stderr)
    sys.exit(1)

print(f'=== thread:{thread_id} ({len(posts)} 則帖子) ===\n')
for _, post in posts:
    print(post)
    print('---')
