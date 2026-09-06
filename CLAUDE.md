# 分賬 App — Project Context

> 呢份文件係整個 project 嘅單一真相來源。
> 佢已經喺 repo 根目錄,Claude Code 開工自動讀到,唔使再手動貼。
> 每做完一步,更新「進度」嗰欄。
>
> 上次核對事實:2026-09-06

---

## 1. 一句話

自己 host 一個分賬 web app:**一條 link 就用得,唔使註冊,但所有改動睇得返**。

## 2. 點解唔用現成嘅

| 選項 | 點解唔用 |
|---|---|
| Splitwise | 逼每個朋友註冊、裝 app |
| 官方 spliit.app | 啲數擺喺人哋部機 |

**所以:fork Spliit,自己 host。** 呢個理由就係成個 project 存在嘅唯一原因。任何唔服務呢點嘅 feature,一律唔做。

> **2026-09-06 更正**:原本仲有第二個理由「upstream 冇改動記錄」。
> 事實係 upstream 2024-04 就有咗 `/groups/[id]/activity`。我哋做嘅係**加強**佢
> (改前→改後、soft delete),唔係由零起。詳見 §4。

---

## 3. 技術決定

| 項目 | 決定 |
|---|---|
| 基底 | Fork [spliit-app/spliit](https://github.com/spliit-app/spliit)(MIT) |
| 我哋條 fork | [jimecho1/spliit](https://github.com/jimecho1/spliit) |
| Framework | Next.js 16(App Router) |
| UI | TailwindCSS + shadcn/ui |
| ORM | **Prisma 7** |
| DB | **Neon** Postgres(region: Singapore) |
| Hosting | Vercel |
| 本機開發 DB | 都係用 Neon,唔開本機 Postgres |

### Upstream 狀況(2026-09-06 核對)

Upstream **仲好活躍**,最新 commit 2026-08-31。原本份文件寫「約九個月冇新版、
fork 咗就係自己養」,呢個講法唔啱,唔好照住嚟做決定。

**紀律**(呢點依然啱,而且因為 upstream 活躍所以更加重要):
自己加嘅嘢盡量放喺新檔案,喺 upstream 原有 code 只留最少 hook point。
改得越散,日後 merge upstream 越痛。

---

## 4. 產品規格

### Access model
- URL 形式:`/groups/{id}`,條 link 就係鎖匙
- 冇登入、冇 session、冇密碼
- 攞到 link = 睇得 + 改得。呢個係**刻意接受**嘅 trade-off
- 首次入 group 揀「你係邊個」,存 localStorage。**唔係安全機制**,純粹為咗 log 寫得出人名
- UI 上要明講一次:「條 link 等於密碼,唔好亂 forward」

### 分賬邏輯
- Default 平分
- 支援 percentage / 指定金額 (exact) / 按份數
- 銀碼一律用**整數 cents**,全程唔掂 float
- 除唔盡嘅仙:固定規則派俾頭幾個人。總數一定要對得返

### 已拍板嘅 default(要改就喺呢度改,唔好靜靜地改 code)

| 決定 | 內容 |
|---|---|
| 墊支人數 | 一張單一個人俾錢,唔支援多人夾住墊 |
| 貨幣 | 一個 group 一種貨幣 |
| 結算 | 最少過數次數(「阿明俾阿珍 $200」),唔係人人對人人 |
| 撞單 | Last-write-wins |
| Link 到期 | 冇到期日 |
| 刪除 | **冇 hard delete**,一律 soft delete,log 睇得返 ✅ 已做 |

### 改動記錄(Step 3)— ✅ 已做

Upstream 本身已經有:`Activity` model、`ActivityType` enum、`/groups/[id]/activity` 畫面。
但佢只記得「邊個改咗邊張單」,唔記得**改咗咩**;而且刪單係真刪。

我哋加咗(branch `activity-log`):

| 加咗乜 | 喺邊 |
|---|---|
| `Activity.actorName` — 寫入嗰刻影低個名,之後改名/踢走都仲讀得出 | `prisma/schema.prisma` |
| `Activity.payload` (JSONB) — `{ v, before, after, changes }` | `prisma/schema.prisma` |
| `Expense.deletedAt` — soft delete,所有讀取路徑過濾走 | `prisma/schema.prisma` |
| `RESTORE_EXPENSE` — 還原都係一條 append-only 紀錄 | `prisma/schema.prisma` |
| snapshot / diff 邏輯 + 單元測試 | `src/lib/activity-log/`(**全新檔案**) |
| 改前→改後展開畫面 | `src/app/groups/[groupId]/activity/activity-changes.tsx`(**全新檔案**) |
| 還原 API | `src/trpc/routers/groups/expenses/restore.procedure.ts`(**全新檔案**) |

改到 upstream 原有檔案嘅只有四個:`schema.prisma`、`src/lib/api.ts`(hook point)、
`activity-item.tsx`(加展開掣)、`expenses/index.ts`(登記 route)。

**兩個設計上要記住嘅點:**

1. **`changes` 喺寫入嗰刻計好就儲落去**,唔係讀出嚟先計。所以就算日後改咗 diff 規則,
   舊紀錄講嘅嘢都唔會變。Append-only 嘅意思就係咁。
2. **actorName 要喺改動之前攞**。如果一次 group 更新順手踢走咗改動嗰個人,
   改完之後先查就查唔返個名。(呢個 bug 中過一次。)

⚠️ **Postgres `jsonb` 唔保留 key 次序**。要照次序顯示 snapshot,一定要自己寫死一個
order array(見 `activity-changes.tsx` 嘅 `SNAPSHOT_FIELD_ORDER`),
唔可以靠 `Object.entries()`。

---

## 5. 進度

- [x] **Step 1a** — Fork、clone 好咗(`jimecho1/spliit`)
- [ ] **Step 1b** — 開 Neon、填 `.env`、`npm run dev` 本機行得起
- [ ] **Step 2** — Deploy 上 Vercel,有自己條 URL
- [x] **Step 3** — 改動記錄(schema + 寫 log + 畫面)← branch `activity-log`,未 merge
- [ ] **Step 4** — 執走唔要嘅嘢、mobile 手感、QR code
- [ ] **Step 5** — 真人試用一次

### Step 3 交低咗嘅嘢

已喺雲端環境跑過:`tsc --noEmit`、`eslint`(0 error)、`jest`(177 passed,
包括 10 個新嘅 diff test)、`npm run build`,同埋用 Playwright 行過一次真實流程
(開 group → 加單 → 改單 → 改 group 設定 → 刪單 → 還原),確認 log 顯示得啱。

**未做:** 未跑過 `prisma migrate`(雲端環境攞唔到 Prisma 嘅 migration engine binary)。
條 migration SQL 係人手寫嘅,已經用 psql 實試過行得通。你自己第一次 `npm install`
或者 `npx prisma migrate deploy` 嗰陣要望一眼佢行唔行得過。

---

## 6. 環境設定備忘

### Node
要 **24 或以上**,npm **11 或以上**。(`package.json` 嘅 `engines` 寫住。
原本份文件寫「20 或以上」,已經唔啱。)

### .env(唔好 commit)

```
POSTGRES_PRISMA_URL="<Neon pooled 條 string>?pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="<Neon direct 條 string>"
```

**Prisma 7 變咗:** 連線字串唔再喺 `schema.prisma` 度,搬咗去 `prisma.config.ts`,
由佢讀上面兩個環境變數。改 DB 設定就去嗰度睇。

**兩個最易中招嘅位(依然啱):**

1. Pooled 嗰條**一定要**加 `?pgbouncer=true`。唔加,Prisma 會喺 prepared statement 度爆,
   而 error message 完全唔會提你係呢個原因。
2. `npm install` 會順手跑 `prisma migrate deploy && prisma generate`,
   所以 `.env` **必須喺 `npm install` 之前填好**。次序調轉就炒。

Pooled = hostname 有 `-pooler`。Direct = 冇。兩條都要。

### 安全
- `.env` 已喺 `.gitignore`,但每次 push 前 `git status` 望一眼
- DB 密碼、Vercel token、Neon 密碼:**永遠唔好貼入任何 chat**,包括貼俾 Claude

---

## 7. 邊個工具做邊樣

| 工具 | 用嚟做咩 | 唔好用嚟做咩 |
|---|---|---|
| **Terminal** | git、npm、跑 dev server、Prisma migration | — |
| **Claude Code** | 睇 code、寫 code、改 schema、debug。主力戰場 | — |
| **Claude in Chrome** | 部署後喺瀏覽器試流程、開 incognito 試 share link、睇 Vercel / Neon dashboard | 唔好叫佢入密碼、API key、或者幫你開戶口。呢啲自己嚟 |
| **Claude Design** | UI 調整嘅樣 | 唔好喺度寫 production code |

### 開場白(貼落每個工具)

**Claude Code** — 而家唔使貼咁長,份 CLAUDE.md 已經喺 repo 度:
```
我而家做緊 Step __。
```

**Claude in Chrome**
```
我要試我自己 host 嗰個分賬 app。流程:開 group → 加人 → 加單 →
睇 balances → 改一次單 → 睇 activity 頁確認見到改前改後 → 刪單 → 還原 →
用 incognito 開條 share link 確認唔使登入都入到。
唔好幫我入任何密碼或者撳「確認付款」類嘅掣。
```

---

## 8. 常用指令

```bash
# 起手(已做咗)
git remote add upstream https://github.com/spliit-app/spliit.git
cp .env.example .env          # 填好先做下一句
npm install                   # 會順手跑 migration
npm run dev                   # localhost:3000

# 日常
npx prisma migrate dev --name <名>   # 改完 schema
npx prisma studio                    # 用 GUI 睇 DB
npm run build                        # push 前確認 build 得到
npm test                             # 單元測試
npm run check-types                  # tsc --noEmit

# 睇 Step 3 做咗啲乜
git diff main..activity-log --stat

# 拉 upstream 更新(upstream 好活躍,記得定期做)
git fetch upstream && git merge upstream/main
```

---

## 9. 落一步

1. 開 Neon,攞兩條 connection string,填 `.env`
2. `npm install`(佢會跑 migration,包括新嗰條 `20260906160000_activity_log_diff_and_soft_delete`)
3. `npm run dev`,行一次 §7 Claude in Chrome 嗰個流程
4. 掂就 `git checkout main && git merge activity-log`,再做 Step 2 上 Vercel

### Step 1 checkpoint

做到以下先算過關:

1. `npm run dev` 開到首頁
2. 開到一個 group、加到兩三個人
3. 加到一張單,balances 計啱
4. 改一次單,`/groups/{id}/activity` 撳得開,見到改前→改後
5. 刪單之後張單喺列表消失,但 activity 度仲見到,而且撳到「還原」
6. **開 incognito 貼條 group link,唔使登入都入到、改到**

第 6 點係成個 app 嘅核心假設,親眼確認一次。
