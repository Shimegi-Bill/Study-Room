# 溫習樂園（Study Room）

小學三年級中文溫習網頁遊戲：答題養寵物、打錯題怪獸、每日任務、測驗挑戰。

- `index.html`：程式（冇框架）；`fx.js`：特效、聲效、背景音樂、怪獸圖案
- `bank-chi.js`：中文題庫；`bank-chi-11.js`：11月測驗範圍題目（每題有解釋同陷阱位）；之後每科一個 `bank-科目.js`
- 紀錄存喺手機 `localStorage`；星獸係原創角色（SVG 畫）
- 用 GitHub Pages 開：Settings → Pages → Deploy from a branch → `main` → `/ (root)`
- iPhone：用 Safari 開網址 → 分享 → 加至主畫面
- 每次上載新版本（包括只改題庫），記得改 `index.html` 頂部嘅 `window.__SR_VER`（App 會自動更新）

由 Bill Chiu 開發
