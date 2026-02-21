#!/bin/bash
# read-thread.sh — 讀取特定討論串的所有帖子，按時間戳排序輸出
# 用法: bash docs/records/forum/read-thread.sh {thread-id}
# 例如: bash docs/records/forum/read-thread.sh forum-optimization

THREAD="${1:?用法: $0 <thread-id>}"
FORUM_DIR="$(cd "$(dirname "$0")" && pwd)"

py -c "
import glob, os, re, sys

thread_id = sys.argv[1]
forum_dir = sys.argv[2]

posts = []
for filepath in sorted(glob.glob(os.path.join(forum_dir, '20*.md'))):
    try:
        raw = open(filepath, encoding='utf-8').read()
    except Exception:
        continue
    # normalize CRLF
    content = raw.replace('\r\n', '\n').replace('\r', '\n')
    # posts are separated by lines containing only ---
    blocks = re.split(r'\n---\n|^---\n', content, flags=re.MULTILINE)
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
    print('找不到 thread: ' + thread_id)
    sys.exit(1)

print('=== thread:' + thread_id + ' (' + str(len(posts)) + ' 則帖子) ===\n')
for _, post in posts:
    print(post)
    print('---')
" "$THREAD" "$FORUM_DIR"
