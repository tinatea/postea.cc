# Postèa 香語所

台北調香工作室的官方網站。頁面是繁體中文，網址是 [postea.cc](https://postea.cc)。

不用會寫程式。改一場活動、改報名連結、改價格，都是改一個檔案，然後存檔。推上 GitHub 的 `main` 分支後，網站會自己更新。

## 在 GitHub 網頁上改（最簡單）

1. 打開這個倉庫，點進下面說的那個檔案。
2. 按右上角的鉛筆。
3. 改完，拉到頁面最下面，按 **Commit changes**。
4. 等一兩分鐘。GitHub Actions 會重新做出網站。

## 在自己的電腦上看

需要已安裝 Node.js 22。

```bash
npm install
npm run dev
```

瀏覽器打開 http://localhost:4321 。

確認內容沒有打錯：

```bash
npm run check
npm run build
```

## 新增一場活動

只改 [`src/data/events.yml`](src/data/events.yml)。

複製檔案裡現有的一整段，貼在清單最上面，改成新的內容。日期和時間兩邊要有引號，例如 `"2026-12-19"`、`"14:00"`。

| 欄位 | 填什麼 |
| --- | --- |
| `id` | 英文代號，不要重複。例如 `spice-winter-2026-12` |
| `title` | 活動名稱 |
| `date` | `"YYYY-MM-DD"` |
| `startTime` / `endTime` | `"14:00"` 這種，要加引號 |
| `venue` | 地點。還沒定就寫 `台北市（地點確認中）` |
| `price` | 例如 `NT$800／人` |
| `capacity` | 例如 `4–10 人（滿 4 人開課）` |
| `description` | 給參加者看的短文。不要寫成本、租金、內部討論 |
| `takeHome` | 參加者會帶走什麼 |
| `registrationUrl` | Google 表單網址。還沒有就留 `""` |
| `accentColor` | 可省略。這場要有自己的主題色時再填，例如 `"#D9A441"` |

`registrationUrl` 是空的，不會出現報名按鈕，畫面上是「報名即將開放」，旁邊另有一顆 LINE 詢問按鈕（連結寫在 `site.yml` 的 `lineUrl`）。貼上 `https://` 開頭的表單網址之後，才會變成「報名」按鈕，並在新視窗打開。LINE 按鈕仍留在旁邊。

### 過往活動

不用搬檔案，也不用刪。以**台北時間的日期**為準：活動當天還留在「即將舉行」，隔天起自動出現在「過往活動」。

網站是靜態的，分類在重新建置時才會更新。推上 `main` 會建置一次；另外每個台北時間凌晨 00:30 也會自動建置一次。若想立刻更新，到 GitHub 的 Actions 頁，選 **Deploy to GitHub Pages**，按 **Run workflow**。

## 用 Google 試算表（選用）

不使用的話，保持 [`src/data/site.yml`](src/data/site.yml) 裡的 `eventsSheetUrl: ""` 即可。

若要改由試算表供稿：

1. 試算表第一列用這些欄名（中文或英文都可以）：`標題`、`日期`、`開始時間`、`結束時間`、`地點`、`價格`、`人數`、`說明`、`帶走`、`報名連結`、`主題色`。`代號` 可省略。
2. 日期一樣寫 `2026-11-21`。報名連結空著，網站就顯示「報名即將開放」。
3. 檔案 → 共用 → **發佈到網路** → 選擇該工作表 → 格式選 **逗號分隔值 (.csv)** → 發佈。
4. 把產生的網址貼進 `src/data/site.yml` 的 `eventsSheetUrl`。

建置時會**整份改用試算表**，不是和 `events.yml` 合併。讀取失敗，或一場都沒讀到，會自動改回 `events.yml`，網站不會因此空白。

## 新增一場活動紀錄

1. 照片放進 `public/images/recaps/`。
2. 複製 [`content/recaps/_example.md`](content/recaps/_example.md)。
3. 新檔名不要用底線開頭，例如 `2026-11-21-osmanthus.md`。底線開頭的檔案不會出現在網站上。
4. 刪掉 `published: false` 那一行，改標題、日期、內文和照片路徑。
5. 存檔並推上 `main`。

## 兩種方式的說明

課程頁和活動頁上方的對照，寫在 [`src/data/offerings.yml`](src/data/offerings.yml)。

香遇是一個人自由調香。每月主題小聚是一群人跟著主題玩香。小聚的費用寫在這個檔的 `price`，也寫在該場活動的 `price`。兩邊都要改，才不會對不上。

## 聯絡方式

改 [`src/data/site.yml`](src/data/site.yml)。

| 欄位 | 填什麼 |
| --- | --- |
| `lineUrl` | LINE 按鈕的網址，例如 `https://line.me/R/ti/p/@144eqxql` |
| `lineId` | 畫面上的帳號，例如 `"@144eqxql"`（要加引號，避免被讀成別的格式） |
| `xUrl` / `xHandle` | X 的網址與帳號 |
| `instagram` / `instagramHandle` | Instagram |

## 改價格或項目

只改 [`src/data/products.csv`](src/data/products.csv)。

- 不要改第一列欄名。
- 空白列會被略過。
- 只有名稱、沒有說明也沒有價格的那一列（現在是「商品」）是分類標題。
- 名稱、說明、價格會照你寫的原樣出現。時長不用另外填，寫在說明裡（例如「過程大約 10 ~ 20 分鐘」）就會被讀出來。

## 加一張文宣

1. 圖檔放進 `public/posters/`，檔名用英文。
2. 打開 [`src/data/posters.yml`](src/data/posters.yml)，依檔案裡的範例加一筆。`file` 寫成 `/posters/檔名.jpg`。

桂花茶室的主視覺草稿請放這裡。這個倉庫裡還沒有那張圖檔。

## 改顏色或字體

只改 [`src/styles/theme.css`](src/styles/theme.css) 最上面的色碼和字體。

目前使用的色票：頁面淺灰 `#FAFAFA`、卡片暖米 `#F2EEEB`、字與字標 `#545454`。標誌青 `#62A297` 只用在首頁標誌區和頁尾外框，不要拿來當資訊卡的底色。標籤是鼠尾草綠 `#899272`、山茶紅 `#D4082C`、水藍 `#A2EAF1`。單場活動的主題色寫在該場的 `accentColor`，不寫在這個檔案。

## 上線前 Tina 要自己做的事

這些設定在 GitHub 與網域註冊商，程式沒辦法代為打開。

1. 把這個 Pull Request 合併進 `main`（先不要在沒看過頁面時合併）。
2. 打開倉庫 **Settings → Pages → Build and deployment**，Source 選 **GitHub Actions**。若沒選這個，上面的自動部署不會生效。
3. 同一頁的 **Custom domain** 填 `postea.cc`，按 Save。  
   用 GitHub Actions 發佈時，GitHub **不會讀**倉庫裡的 `CNAME` 檔（檔案仍留著，給人看、也給以後改回從分支發佈時用）。網域一定要在這個欄位存檔。
4. **先**在 GitHub 存好自訂網域，**再**到註冊商改 DNS，避免網域空窗被人占用。建議再到 GitHub 的網域驗證畫面，把它給的 TXT 紀錄加進 DNS。
5. 在註冊 `postea.cc` 的地方設定下面的紀錄。若原本有停放頁、轉址或別組 A／CNAME，先刪掉，不要和這些並存。

   **apex（`postea.cc`，主機名稱 `@` 或留空）** — 四筆 A：

   | 類型 | 名稱 | 值 |
   | --- | --- | --- |
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |

   以及四筆 AAAA（IPv6）：

   | 類型 | 名稱 | 值 |
   | --- | --- | --- |
   | AAAA | `@` | `2606:50c0:8000::153` |
   | AAAA | `@` | `2606:50c0:8001::153` |
   | AAAA | `@` | `2606:50c0:8002::153` |
   | AAAA | `@` | `2606:50c0:8003::153` |

   如果註冊商不讓 apex 填 A、只提供 ALIAS 或 ANAME：改指到 `tinatea.github.io`，**不要再加**上面的 A／AAAA。

   **www**

   | 類型 | 名稱 | 值 |
   | --- | --- | --- |
   | CNAME | `www` | `tinatea.github.io` |

   CNAME 要指到 `tinatea.github.io`，不要加上倉庫名稱，也不要指到 `*.pages.github.io`。

6. DNS 生效後（有時要數小時，最長約一天），回到 **Settings → Pages**，勾選 **Enforce HTTPS**。憑證還沒簽好時這個選項會是灰的，等它可勾再勾。勾了之後，`http://` 會轉成 `https://`。`www.postea.cc` 會轉到 `postea.cc`。

官方說明：<https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site>
