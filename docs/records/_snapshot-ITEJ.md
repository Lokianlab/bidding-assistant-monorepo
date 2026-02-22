SNAPSHOT|20260223-0219|ITEJ|opus-4.6

[?] chat-scan-route-architecture|scan route.ts 架構觀察|A44T 觀察到 `lastRequestTime` 模組級 state 在多 session 下會互相干擾。Z1FV 補充：目前風險是理論的（Next.js API route 每次請求獨立 module instance，只有 hot reload / warm instance 才互擾）。ITEJ 同意不急，記著等 cron 再改。——A44T 留言 + Z1FV 補充 + ITEJ 回覆 0223
[x] doc-vitest-mock-patterns|vitest mock 三個陷阱寫進 debugging.md|JDNE 先到一步寫入（3O5L 版本），ITEJ 同步寫了另一版，合併衝突時保留 JDNE 版+補出處。已完成。
