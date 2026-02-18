// ====== 知識庫預設資料（00C 時程範本庫 + 00D 應變SOP庫）======
// 常見、基本、通用的範本與SOP，供使用者直接使用或修改

import type { KBEntry00C, KBEntry00D } from "./types";

const now = new Date().toISOString();

// ====== 00C 時程範本庫 ======

export const SEED_00C: KBEntry00C[] = [
  {
    id: "T-EXH",
    templateName: "展覽策展（3-6 個月）",
    applicableType: "展覽策展",
    budgetRange: "200 萬 – 1,500 萬",
    durationRange: "3 – 6 個月",
    phases: [
      {
        phase: "前置規劃",
        duration: "4 – 6 週",
        deliverables: "策展主題企劃書、展場空間規劃圖、展品清單、預算分配表",
        checkpoints: "企劃書審查會議、展場場勘確認",
      },
      {
        phase: "設計發展",
        duration: "3 – 5 週",
        deliverables: "展場設計圖（3D 模擬）、主視覺設計、動線規劃圖、展板/說明牌內容初稿",
        checkpoints: "設計審查會議、業主確認設計方向",
      },
      {
        phase: "製作施工",
        duration: "3 – 5 週",
        deliverables: "展場施工完成、展品佈置完成、燈光音響測試、互動裝置測試",
        checkpoints: "施工中期檢查、完工驗收前預檢",
      },
      {
        phase: "佈展與測試",
        duration: "1 – 2 週",
        deliverables: "展品上架定位、導覽動線確認、導覽員訓練完成、試營運",
        checkpoints: "佈展完成驗收、開幕前總彩排",
      },
      {
        phase: "展覽營運",
        duration: "依合約期間",
        deliverables: "每日營運報表、參觀人次統計、問卷調查、媒體露出紀錄",
        checkpoints: "每週營運會議、中期檢討",
      },
      {
        phase: "撤展與結案",
        duration: "1 – 2 週",
        deliverables: "撤展復原、展品歸還清單、結案報告、成效分析報告",
        checkpoints: "撤展驗收、結案報告審查",
      },
    ],
    warnings:
      "展場施工常因消防審查延遲 1-2 週；展品借展需提前 2 個月以上協調；互動裝置測試需預留充足時間；開幕活動邀請函需提前 3 週寄出",
    entryStatus: "active",
    updatedAt: now,
  },
  {
    id: "T-EVT",
    templateName: "活動企劃執行（1-3 個月）",
    applicableType: "活動企劃",
    budgetRange: "50 萬 – 500 萬",
    durationRange: "1 – 3 個月",
    phases: [
      {
        phase: "活動企劃",
        duration: "2 – 3 週",
        deliverables: "活動企劃書、節目流程表、場地配置圖、預算表、人力配置表",
        checkpoints: "企劃審查會議、場地確認",
      },
      {
        phase: "前期準備",
        duration: "3 – 6 週",
        deliverables: "主視覺設計定稿、邀請函/宣傳物製作、報名系統上線、廠商簽約（餐飲/舞台/音響）",
        checkpoints: "宣傳物審查、廠商確認會議",
      },
      {
        phase: "排練與場佈",
        duration: "3 – 5 天",
        deliverables: "舞台搭建完成、音響燈光測試、流程走位排練、接待人員訓練",
        checkpoints: "場佈完成檢查、總彩排",
      },
      {
        phase: "活動執行",
        duration: "1 – 3 天",
        deliverables: "活動執行、即時攝影紀錄、媒體接待、現場問卷調查",
        checkpoints: "活動前最終確認、活動後快速檢討",
      },
      {
        phase: "結案",
        duration: "1 – 2 週",
        deliverables: "結案報告、活動照片/影片精選、媒體露出彙整、滿意度分析、經費核銷",
        checkpoints: "結案報告審查",
      },
    ],
    warnings:
      "戶外活動須備雨天備案；報名人數需提前 1 週確認以調整餐飲數量；VIP 接待動線需獨立規劃；活動保險需提前投保",
    entryStatus: "active",
    updatedAt: now,
  },
  {
    id: "T-MKT",
    templateName: "行銷推廣專案（2-4 個月）",
    applicableType: "行銷推廣",
    budgetRange: "80 萬 – 600 萬",
    durationRange: "2 – 4 個月",
    phases: [
      {
        phase: "市場調研與策略",
        duration: "2 – 3 週",
        deliverables: "市場分析報告、目標受眾輪廓、行銷策略書、KPI 設定、媒體投放計畫",
        checkpoints: "策略提案會議",
      },
      {
        phase: "內容製作",
        duration: "3 – 5 週",
        deliverables: "主視覺設計、文案撰寫、影音素材製作、社群內容排程表、廣告素材",
        checkpoints: "素材審查會議、業主確認",
      },
      {
        phase: "上線執行",
        duration: "4 – 8 週",
        deliverables: "媒體投放執行、社群經營、KOL/網紅合作內容上線、活動頁面上線",
        checkpoints: "每週成效報告、中期優化會議",
      },
      {
        phase: "成效分析與結案",
        duration: "1 – 2 週",
        deliverables: "成效分析報告、ROI 計算、受眾數據分析、改善建議、結案報告",
        checkpoints: "結案報告審查",
      },
    ],
    warnings:
      "社群平台政策變動可能影響投放成效；KOL 合作需提前 3-4 週聯繫；素材製作（特別是影片）常低估時間；年節/假日前廣告成本上升",
    entryStatus: "active",
    updatedAt: now,
  },
  {
    id: "T-EDU",
    templateName: "教育訓練專案（1-3 個月）",
    applicableType: "教育訓練",
    budgetRange: "30 萬 – 300 萬",
    durationRange: "1 – 3 個月",
    phases: [
      {
        phase: "需求分析與課程設計",
        duration: "2 – 3 週",
        deliverables: "訓練需求分析報告、課程大綱、講師名單與資歷、教材規劃、場地需求",
        checkpoints: "課程大綱審查、講師確認",
      },
      {
        phase: "教材開發",
        duration: "2 – 4 週",
        deliverables: "教材/講義製作、簡報設計、案例編寫、實作練習設計、線上平台設定（如適用）",
        checkpoints: "教材審查會議",
      },
      {
        phase: "招生與行政",
        duration: "2 – 3 週",
        deliverables: "招生簡章、報名系統上線、學員通知、場地與設備確認、餐飲安排",
        checkpoints: "報名截止確認、行政準備完成",
      },
      {
        phase: "課程執行",
        duration: "依課程規劃",
        deliverables: "課程執行、出席紀錄、課堂記錄/攝影、即時問卷回饋",
        checkpoints: "每日/每週課程回顧",
      },
      {
        phase: "結案與追蹤",
        duration: "1 – 2 週",
        deliverables: "結訓證書、滿意度調查分析、結案報告、學習成效評估、後續追蹤建議",
        checkpoints: "結案報告審查",
      },
    ],
    warnings:
      "講師檔期需提前 1 個月以上確認；場地網路頻寬需事先測試（線上課程）；教材印刷需預留 5-7 工作天；學員差旅安排需提前處理",
    entryStatus: "active",
    updatedAt: now,
  },
  {
    id: "T-RES",
    templateName: "研究調查專案（2-6 個月）",
    applicableType: "研究調查",
    budgetRange: "50 萬 – 400 萬",
    durationRange: "2 – 6 個月",
    phases: [
      {
        phase: "研究設計",
        duration: "2 – 3 週",
        deliverables: "研究計畫書、研究方法設計、問卷/訪綱設計、抽樣計畫、倫理審查（如需）",
        checkpoints: "研究計畫審查會議",
      },
      {
        phase: "資料蒐集",
        duration: "4 – 10 週",
        deliverables: "問卷施測完成、深度訪談紀錄、焦點座談紀錄、次級資料彙整",
        checkpoints: "資料蒐集中期檢核、樣本數確認",
      },
      {
        phase: "資料分析",
        duration: "2 – 4 週",
        deliverables: "量化統計分析結果、質性資料編碼分析、交叉分析、圖表製作",
        checkpoints: "分析結果初步報告",
      },
      {
        phase: "報告撰寫",
        duration: "2 – 4 週",
        deliverables: "研究報告初稿、政策建議、執行摘要、簡報版本",
        checkpoints: "報告初稿審查、修正會議",
      },
      {
        phase: "成果發表與結案",
        duration: "1 – 2 週",
        deliverables: "成果發表會/座談會、最終報告定稿、原始資料交付、結案",
        checkpoints: "成果發表會、結案審查",
      },
    ],
    warnings:
      "問卷回收率通常低於預期，需多估 20-30% 樣本量；質性訪談逐字稿非常耗時；IRB 倫理審查可能需 2-4 週；報告修改常需多輪來回",
    entryStatus: "active",
    updatedAt: now,
  },
  {
    id: "T-VID",
    templateName: "影片製作專案（1-3 個月）",
    applicableType: "影片製作",
    budgetRange: "30 萬 – 500 萬",
    durationRange: "1 – 3 個月",
    phases: [
      {
        phase: "前製規劃",
        duration: "1 – 3 週",
        deliverables: "影片企劃書、腳本大綱、分鏡腳本、拍攝場景表、演員/主持人確認、器材清單",
        checkpoints: "腳本審查會議、場勘確認",
      },
      {
        phase: "拍攝",
        duration: "3 – 10 天",
        deliverables: "影片素材（含 B-roll）、現場錄音、幕後花絮、每日拍攝報告",
        checkpoints: "每日素材檢視、拍攝進度確認",
      },
      {
        phase: "後製剪輯",
        duration: "2 – 4 週",
        deliverables: "粗剪版本、精剪版本、配音配樂、字幕製作、調色、動態圖卡/特效",
        checkpoints: "粗剪審查、精剪審查、定剪確認",
      },
      {
        phase: "交付與結案",
        duration: "3 – 5 天",
        deliverables: "最終影片檔案（多格式）、原始素材交付、使用授權書、結案",
        checkpoints: "最終驗收",
      },
    ],
    warnings:
      "天候因素嚴重影響戶外拍攝排程；演員/主持人檔期需提前 2 週以上確認；配音配樂版權需事先處理；修改次數需在合約中明訂",
    entryStatus: "active",
    updatedAt: now,
  },
  {
    id: "T-PUB",
    templateName: "出版印刷專案（2-4 個月）",
    applicableType: "出版印刷",
    budgetRange: "30 萬 – 200 萬",
    durationRange: "2 – 4 個月",
    phases: [
      {
        phase: "內容規劃",
        duration: "2 – 3 週",
        deliverables: "出版企劃書、目錄架構、作者/撰稿人確認、稿件時程表、版面風格設定",
        checkpoints: "企劃審查、風格確認",
      },
      {
        phase: "內容撰寫與編輯",
        duration: "4 – 8 週",
        deliverables: "各章節初稿、審稿意見、修訂稿、圖片/插圖蒐集、版權確認",
        checkpoints: "各章進度追蹤、編審會議",
      },
      {
        phase: "美編排版",
        duration: "2 – 3 週",
        deliverables: "版面設計完成、圖文排版、封面設計、ISBN 申請",
        checkpoints: "排版校對、封面設計審查",
      },
      {
        phase: "校對與印刷",
        duration: "2 – 3 週",
        deliverables: "一校、二校、三校、藍圖確認、印刷交件",
        checkpoints: "各次校對確認、印前藍圖簽認",
      },
      {
        phase: "交付與發行",
        duration: "1 週",
        deliverables: "成品驗收、配送/寄送、電子版上線（如適用）、結案",
        checkpoints: "成品驗收確認",
      },
    ],
    warnings:
      "作者稿件延遲是最常見風險，需預留緩衝；圖片版權確認務必在排版前完成；校對至少需 3 次；印刷交期通常需 7-10 工作天",
    entryStatus: "active",
    updatedAt: now,
  },
];

// ====== 00D 應變SOP庫 ======

export const SEED_00D: KBEntry00D[] = [
  {
    id: "R-MED",
    riskName: "醫療緊急事件",
    riskLevel: "高",
    prevention:
      "活動前確認最近醫療機構位置與路線；準備急救箱並指定急救人員；取得參加者緊急聯絡人資料；投保公共意外責任險；大型活動需安排現場醫護人員",
    responseSteps: [
      {
        step: "1. 立即反應",
        action: "現場急救人員前往處置，評估傷病程度，通知現場總指揮",
        responsible: "現場急救人員 / 最近工作人員",
      },
      {
        step: "2. 通報救護",
        action: "嚴重時立即撥打 119，告知地址、傷情、現場接應位置",
        responsible: "專案經理 / 指定聯絡人",
      },
      {
        step: "3. 現場處理",
        action: "維持現場秩序，疏導其他參加者，確保救護車通道暢通",
        responsible: "現場工作人員",
      },
      {
        step: "4. 通知業主",
        action: "立即通報業主/機關聯絡窗口，說明事件經過與處理狀況",
        responsible: "計畫主持人",
      },
      {
        step: "5. 事後記錄",
        action: "填寫意外事件報告表，拍照存證，追蹤傷者後續狀況，處理保險理賠",
        responsible: "專案經理",
      },
    ],
    notes:
      "AED 設置位置需事先確認；過敏體質參加者需特別注意（餐飲過敏原標示）；高溫天氣需準備防中暑措施；兒童活動需額外注意安全規範",
    entryStatus: "active",
    updatedAt: now,
  },
  {
    id: "R-WTH",
    riskName: "天候異常（颱風/豪雨/高溫）",
    riskLevel: "高",
    prevention:
      "事前確認活動期間天氣預報；準備室內備案場地；合約載明天候因素的延期/取消條款；準備防雨物資（帳篷、雨衣、防滑墊）；設定決策判斷時間點",
    responseSteps: [
      {
        step: "1. 天候監控",
        action: "活動前 72/48/24 小時各確認一次氣象預報，建立通知群組",
        responsible: "專案經理",
      },
      {
        step: "2. 決策判斷",
        action: "依事先訂定的標準（如陸上颱風警報、豪雨特報）決定是否啟動備案",
        responsible: "計畫主持人 + 業主",
      },
      {
        step: "3. 備案啟動",
        action: "通知所有相關人員與廠商、發布延期/更改公告（官網、社群、Email）、確認備案場地或延期日期",
        responsible: "專案經理 + 行政人員",
      },
      {
        step: "4. 現場應變",
        action: "如在活動中遇突發天候：加固搭建物、引導人員至安全區域、必要時疏散",
        responsible: "現場總指揮",
      },
      {
        step: "5. 善後處理",
        action: "確認場地復原、統計損失、處理保險、重新安排延期活動",
        responsible: "專案經理",
      },
    ],
    notes:
      "戶外搭建物需通過結構安全審查；帳篷需確認抗風等級；35°C 以上高溫需準備遮陽與飲水；雷電時需立即疏散戶外人員",
    entryStatus: "active",
    updatedAt: now,
  },
  {
    id: "R-VEN",
    riskName: "場地設備故障",
    riskLevel: "中",
    prevention:
      "活動前一天完成設備全面測試；準備關鍵設備備品（投影機燈泡、麥克風電池、延長線等）；確認場地緊急聯絡電話；預留設備調整緩衝時間",
    responseSteps: [
      {
        step: "1. 故障判斷",
        action: "快速判斷故障範圍與嚴重程度，確認是否可現場修復",
        responsible: "現場技術人員",
      },
      {
        step: "2. 備品啟用",
        action: "立即取用備品替換，若無備品則聯繫最近的設備租借公司緊急調度",
        responsible: "技術人員 / 專案經理",
      },
      {
        step: "3. 流程調整",
        action: "與主持人/講者溝通，臨時調整流程順序爭取修復時間",
        responsible: "現場總指揮",
      },
      {
        step: "4. 通知業主",
        action: "告知業主狀況與預計恢復時間",
        responsible: "專案經理",
      },
    ],
    notes:
      "音響故障是最常見的設備問題，務必準備備用音響系統；網路問題需準備 4G/5G 行動熱點作為備案；電力問題需確認場地備用電源與發電機位置",
    entryStatus: "active",
    updatedAt: now,
  },
  {
    id: "R-PPL",
    riskName: "關鍵人員異動或缺席",
    riskLevel: "中",
    prevention:
      "所有關鍵角色指定至少一位代理人（AB角制度）；重要文件與帳號密碼存放於共用資料夾；定期進行工作交接會議；合約明訂人員異動處理條款",
    responseSteps: [
      {
        step: "1. 確認狀況",
        action: "了解缺席原因與預計恢復時間，評估對專案的影響範圍",
        responsible: "專案經理",
      },
      {
        step: "2. 啟動代理",
        action: "通知指定代理人接手，移交工作進度、待辦事項與相關文件",
        responsible: "專案經理",
      },
      {
        step: "3. 通知業主",
        action: "若為計畫主持人或關鍵專業人員異動，需正式通知業主並提出替代方案",
        responsible: "計畫主持人 / 公司主管",
      },
      {
        step: "4. 補充人力",
        action: "如為長期缺席，啟動招募或外部支援機制，確保專案進度不受影響",
        responsible: "公司主管 / 人資",
      },
    ],
    notes:
      "講者/貴賓活動當天缺席需準備備選名單；遠端工作者需確保通訊設備正常；關鍵知識不可只存在單一人員身上",
    entryStatus: "active",
    updatedAt: now,
  },
  {
    id: "R-TRF",
    riskName: "交通中斷或延誤",
    riskLevel: "中",
    prevention:
      "掌握活動地點周邊交通狀況與替代路線；重要物資提前一天運抵；安排專車接送重要來賓；活動指引標示交通資訊與替代方案",
    responseSteps: [
      {
        step: "1. 狀況掌握",
        action: "確認交通中斷範圍與預計恢復時間，查詢替代路線與交通工具",
        responsible: "行政人員 / 專案經理",
      },
      {
        step: "2. 通知相關人",
        action: "通知受影響人員替代交通方式與路線，提供即時聯絡窗口",
        responsible: "行政人員",
      },
      {
        step: "3. 流程調整",
        action: "評估是否需調整活動時程，如延後開場或調整議程順序",
        responsible: "現場總指揮",
      },
      {
        step: "4. 物流應變",
        action: "確認活動物資是否受影響，必要時安排替代運送方式",
        responsible: "專案經理",
      },
    ],
    notes:
      "離島或偏遠地區活動需特別留意氣候對交通的影響；大型活動需與在地交通單位協調管制事宜；國際活動需注意航班延誤風險",
    entryStatus: "active",
    updatedAt: now,
  },
  {
    id: "R-SUP",
    riskName: "供應商/廠商違約或品質不符",
    riskLevel: "中",
    prevention:
      "合約明訂品質標準與罰則條款；要求廠商提供樣品或試做；建立合格供應商名單並保持 2-3 家備選；分期付款並保留尾款至驗收完成",
    responseSteps: [
      {
        step: "1. 問題確認",
        action: "確認違約/品質問題的具體內容與嚴重程度，拍照錄影存證",
        responsible: "專案經理",
      },
      {
        step: "2. 協商改善",
        action: "與廠商正式溝通要求限期改善，發出書面通知並留存紀錄",
        responsible: "專案經理",
      },
      {
        step: "3. 啟動備案",
        action: "若無法改善，立即聯繫備選供應商接手，評估時程與成本影響",
        responsible: "專案經理 / 採購",
      },
      {
        step: "4. 通知業主",
        action: "報告問題與處理進度，必要時提出時程或規格調整建議",
        responsible: "計畫主持人",
      },
      {
        step: "5. 法務處理",
        action: "依合約條款處理違約賠償，必要時諮詢法務意見",
        responsible: "公司主管 / 法務",
      },
    ],
    notes:
      "印刷品最易出現色差問題，需留校色時間；餐飲供應商需提前確認食材來源與衛生認證；舞台搭建需確認安全結構證明",
    entryStatus: "active",
    updatedAt: now,
  },
  {
    id: "R-CXL",
    riskName: "活動取消或重大變更",
    riskLevel: "高",
    prevention:
      "合約明訂不可抗力與取消條款（含退費機制）；投保活動取消險；規劃分階段取消的損失評估表；重要活動規劃 B 方案（如線上替代）",
    responseSteps: [
      {
        step: "1. 決策確認",
        action: "與業主正式確認取消/變更決定，取得書面通知",
        responsible: "計畫主持人",
      },
      {
        step: "2. 損失盤點",
        action: "清點已投入成本、已簽約廠商、已發出的邀請/報名，計算取消損失",
        responsible: "專案經理",
      },
      {
        step: "3. 通知相關方",
        action: "通知所有廠商、講者、參加者，說明取消原因與後續處理（含退費）",
        responsible: "專案經理 + 行政人員",
      },
      {
        step: "4. 合約結算",
        action: "與各廠商依合約處理取消費用，與業主結算已投入成本",
        responsible: "專案經理 / 財務",
      },
      {
        step: "5. 替代方案",
        action: "如可能，提出替代方案（延期、縮小規模、轉線上等）供業主決策",
        responsible: "計畫主持人",
      },
    ],
    notes:
      "疫情期間政策變動為最大取消風險；合約中應明訂取消時各階段的費用分擔比例；線上替代方案需評估技術可行性與參加者接受度",
    entryStatus: "active",
    updatedAt: now,
  },
  {
    id: "R-SEC",
    riskName: "資安事件（系統故障/資料外洩）",
    riskLevel: "高",
    prevention:
      "報名系統使用 HTTPS 加密；個資蒐集最小化原則；定期備份資料；系統上線前進行壓力測試；指定資安負責人",
    responseSteps: [
      {
        step: "1. 事件判斷",
        action: "確認事件類型（系統當機/資料外洩/駭客攻擊），評估影響範圍",
        responsible: "資安負責人 / IT 人員",
      },
      {
        step: "2. 緊急處置",
        action: "系統當機：啟用備援或切換手動流程；資料外洩：立即封鎖系統存取",
        responsible: "IT 人員",
      },
      {
        step: "3. 通知義務",
        action: "個資外洩需依個資法規定通知當事人與主管機關（72 小時內）",
        responsible: "計畫主持人 / 法務",
      },
      {
        step: "4. 修復與強化",
        action: "修復漏洞、變更密碼、加強防護措施、進行事後安全稽核",
        responsible: "IT 人員 / 資安負責人",
      },
    ],
    notes:
      "線上活動平台帳號務必啟用雙重認證；Wi-Fi 環境需確認安全性；報名表單不應蒐集非必要個資（如身分證字號）；重要資料需異地備份",
    entryStatus: "active",
    updatedAt: now,
  },
  {
    id: "R-BUD",
    riskName: "預算超支或經費爭議",
    riskLevel: "中",
    prevention:
      "預算編列時預留 5-10% 管理預備金；每月定期核對實際支出與預算；合約明訂變更追加流程；大額支出需事前簽核",
    responseSteps: [
      {
        step: "1. 預警發現",
        action: "當支出達預算 80% 時啟動警報，盤點剩餘項目所需經費",
        responsible: "專案經理 / 財務",
      },
      {
        step: "2. 原因分析",
        action: "分析超支原因（範圍變更、物價上漲、估算偏差），提出書面報告",
        responsible: "專案經理",
      },
      {
        step: "3. 調整方案",
        action: "提出節流方案（如調整規格、減少項目、替代方案）或追加預算申請",
        responsible: "專案經理 / 計畫主持人",
      },
      {
        step: "4. 業主溝通",
        action: "正式與業主說明狀況，取得追加同意或確認調整方案",
        responsible: "計畫主持人",
      },
    ],
    notes:
      "最常超支項目：印刷品加印、臨時追加場次、匯率變動（國際活動）、設計修改次數過多；核銷時需留意政府採購法相關規範",
    entryStatus: "active",
    updatedAt: now,
  },
  {
    id: "R-PR",
    riskName: "公關危機或負面輿論",
    riskLevel: "高",
    prevention:
      "活動前準備媒體 Q&A 口徑表；指定唯一對外發言人；建立社群輿論監控機制；敏感議題事先準備聲明稿",
    responseSteps: [
      {
        step: "1. 輿情監控",
        action: "發現負面報導或社群貼文，立即彙整內容與擴散範圍，向上報告",
        responsible: "行銷人員 / 專案經理",
      },
      {
        step: "2. 內部評估",
        action: "召集緊急會議，釐清事實、評估影響，擬定回應策略",
        responsible: "計畫主持人 + 業主",
      },
      {
        step: "3. 對外回應",
        action: "由指定發言人統一口徑回應，避免多頭發言；必要時發布正式聲明",
        responsible: "指定發言人",
      },
      {
        step: "4. 善後處理",
        action: "持續監控輿論走向，視情況採取補救措施（道歉、補償、改善承諾）",
        responsible: "計畫主持人 + 行銷人員",
      },
    ],
    notes:
      "黃金回應時間為事件發生後 4 小時內；社群留言不可刪除（會引發更大反彈）；涉及歧視或安全議題需格外謹慎；必要時可諮詢公關公司",
    entryStatus: "active",
    updatedAt: now,
  },
];
