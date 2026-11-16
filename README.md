# 光學切片筆記

一個用繁體中文解釋光學同調斷層掃描（OCT）的靜態教學網站。首頁包含可操作的掃描示意，以及兩篇入門講義。示意圖以合成資料呈現 A-scan 與 B-scan 的關係。

## 開發與預覽

安裝 Node.js 22 或以上版本。建置無需安裝 npm 套件。

```sh
node scripts/build.mjs
node scripts/build.mjs --check
python -m http.server 8000 --directory dist
```

開啟 http://localhost:8000/ 。已建置的 `dist/index.html` 也可直接用瀏覽器開啟。

## 給 AI 的交辦方式

請先閱讀 [AGENTS.md](AGENTS.md)。作者或 AI 每新增一份 `content/<slug>.json`，建置程式便依照共用模板產生講義頁、首頁卡片與相鄰章節連結。新增內容時以 [講義範本](templates/lesson.example.json) 為起點。

## 發布到 GitHub Pages

1. 建立公開 repository，將專案的檔案放在 `main` 分支根目錄，包含隱藏資料夾 `.github/` 與 `dist/`。
2. 進入 **Settings → Pages → Source**，選擇 **GitHub Actions**。
3. 到 **Actions → Publish GitHub Pages → Run workflow**。成功後在 Pages 設定頁點擊 **Visit site**，確認首頁與講義都能開啟。
4. 後續 push 到 `main` 時會先檢查靜態輸出是否同步，再發布 `dist/`。
