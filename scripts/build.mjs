import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist');
const check = process.argv.includes('--check');
const html = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isHttps = (value) => {
  try { return isText(value) && new URL(value).protocol === 'https:'; }
  catch { return false; }
};
const lessons = [];
const orders = new Set();
const slugs = new Set();

for (const name of (await readdir(join(root, 'content'))).filter((file) => file.endsWith('.json')).sort()) {
  const requireField = (condition, field) => {
    if (!condition) throw new Error(`${name}：${field} 不符合 AGENTS.md 的規格`);
  };
  let lesson;
  try { lesson = JSON.parse(await readFile(join(root, 'content', name), 'utf8')); }
  catch (error) { throw new Error(`${name}：無法讀取 JSON（${error.message}）`); }
  requireField(isRecord(lesson), '講義物件');
  const { slug, order, sections, question, sources, demo } = lesson;
  requireField(isText(slug) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    basename(name, '.json') === slug && !slugs.has(slug), 'slug 或檔名');
  requireField(Number.isSafeInteger(order) && order > 0 && !orders.has(order), 'order');
  for (const field of ['category', 'title', 'summary', 'takeaway']) {
    requireField(isText(lesson[field]), field);
  }
  requireField(Array.isArray(sections) && sections.length >= 2 && sections.every((section) =>
    isRecord(section) && isText(section.heading) && Array.isArray(section.paragraphs) &&
    section.paragraphs.length > 0 && section.paragraphs.every(isText)), 'sections');
  requireField(isRecord(question) && isText(question.prompt) && isText(question.answer), 'question');
  requireField(Array.isArray(sources) && sources.length > 0 && sources.every((source) =>
    isRecord(source) && isText(source.label) && isHttps(source.url)), 'sources');
  requireField(demo === undefined || demo === 'scan', 'demo');
  slugs.add(slug);
  orders.add(order);
  lessons.push(lesson);
}
if (!lessons.length) throw new Error('content/ 至少需要一篇講義');
lessons.sort((left, right) => left.order - right.order);

const template = await readFile(join(root, 'templates/layout.html'), 'utf8');
function page({ title, summary, base, body, demo }) {
  const values = {
    TITLE: html(title), DESCRIPTION: html(summary), BASE: base, BODY: body,
    SCRIPT: demo ? `<script src="${base}assets/scan.js" defer></script>` : ''
  };
  return template.replace(/\{\{([A-Z]+)\}\}/g, (_, key) => values[key]);
}
function demoPanel() {
  return `<section class="demo" id="scan" aria-labelledby="scan-title">
    <div class="demo-head"><h2 id="scan-title">掃描示意</h2><span>教學模擬</span></div>
    <p id="scan-help">移動滑桿，觀察 B-scan 選線位置和 A-scan 回波峰值的對應。</p>
    <div class="plots">
      <figure><figcaption><strong>B-scan</strong><span>二維截面</span></figcaption>
        <canvas width="360" height="192" data-section aria-label="由多條 A-scan 組成的模擬截面，虛線標示選定欄位"></canvas>
        <div class="plot-axis"><span>深度 ↓</span><span>橫向位置 →</span></div>
      </figure>
      <figure><figcaption><strong>A-scan</strong><span>單點深度剖面</span></figcaption>
        <canvas width="240" height="192" data-profile aria-label="所選欄位的模擬回波強度隨深度變化的曲線"></canvas>
        <div class="plot-axis"><span>深度 ↓</span><span>相對回波強度 →</span></div>
      </figure>
    </div>
    <div class="scan-control" hidden>
      <label for="scan-position">橫向位置</label>
      <input id="scan-position" type="range" min="0" max="359" value="142" aria-describedby="scan-help">
      <output for="scan-position" data-position></output>
    </div>
    <noscript><p>啟用 JavaScript 可操作掃描示意。B-scan 的每一欄對應一條 A-scan。</p></noscript>
  </section>`;
}
const homeSummary = '給第一次接觸 OCT 的你。從光的干涉開始，用互動示意讀懂一條深度訊號如何組成一張截面影像。';
const homeBody = `<div class="wrap">
  <div class="hero">
    <div class="hero-copy">
      <p class="eyebrow">光學同調斷層掃描 · OCT</p>
      <h1>光學切片<br>筆記<span>。</span></h1>
      <p class="intro">${homeSummary}</p>
      <a class="button" href="#lessons">瀏覽講義 <span aria-hidden="true">↓</span></a>
    </div>
    ${demoPanel()}
  </div>
  <section id="lessons" class="directory" aria-labelledby="lessons-title">
    <div class="section-heading"><h2 id="lessons-title">講義目錄</h2><span>${lessons.length} 篇講義</span></div>
    <ol class="cards">${lessons.map((lesson, index) => `<li>
      <a class="card" href="lessons/${lesson.slug}.html">
        <div class="card-meta"><span>第 ${String(index + 1).padStart(2, '0')} 篇</span><span>${html(lesson.category)}</span></div>
        <h3>${html(lesson.title)}</h3><p>${html(lesson.summary)}</p><span class="card-arrow" aria-hidden="true">↗</span>
      </a></li>`).join('')}</ol>
  </section>
</div>`;

const files = new Map([['index.html', page({
  title: '光學切片筆記｜OCT 入門講義',
  summary: homeSummary, base: './', body: homeBody, demo: true
})]]);
for (const [index, lesson] of lessons.entries()) {
  const neighbors = [[lessons[index - 1], '上一篇', 'prev'], [lessons[index + 1], '下一篇', 'next']];
  const body = `<article class="wrap lesson">
    <a class="breadcrumb" href="../index.html#lessons">← 講義目錄</a>
    <header class="lesson-header">
      <p class="eyebrow">第 ${String(index + 1).padStart(2, '0')} 篇 · ${html(lesson.category)}</p>
      <h1>${html(lesson.title)}</h1><p class="intro">${html(lesson.summary)}</p>
    </header>
    ${lesson.sections.map((section) => `<section class="prose">
      <h2>${html(section.heading)}</h2>
      ${section.paragraphs.map((paragraph) => `<p>${html(paragraph)}</p>`).join('')}
    </section>`).join('')}
    ${lesson.demo ? demoPanel() : ''}
    <section class="takeaway"><h2>一句重點</h2><p>${html(lesson.takeaway)}</p></section>
    <section class="prose"><h2>自我檢查</h2><p>${html(lesson.question.prompt)}</p>
      <details><summary>查看答案</summary><p>${html(lesson.question.answer)}</p></details></section>
    <section class="prose"><h2>參考資料</h2><ul class="sources">${lesson.sources.map((source) =>
      `<li><a href="${html(source.url)}">${html(source.label)}</a></li>`).join('')}</ul></section>
    <nav class="neighbors" aria-label="相鄰講義">${neighbors.map(([neighbor, label, direction]) =>
      neighbor ? `<a class="${direction}" href="${neighbor.slug}.html" rel="${direction}"><small>${label}</small>${html(neighbor.title)}</a>` : '').join('')}</nav>
  </article>`;
  files.set(`lessons/${lesson.slug}.html`, page({
    title: `${lesson.title}｜光學切片筆記`, summary: lesson.summary, base: '../', body, demo: lesson.demo
  }));
}

for (const name of ['site.css', 'scan.js']) {
  const path = `assets/${name}`;
  files.set(path, await readFile(join(root, path), 'utf8'));
}
files.set('.nojekyll', '');

if (check) {
  const actualPaths = await readdir(output, { recursive: true, withFileTypes: true });
  const relativePaths = new Set(actualPaths.filter((entry) => entry.isFile()).map((entry) =>
    join(entry.parentPath ?? entry.path, entry.name).slice(output.length + 1)));
  for (const [path, expected] of files) {
    if (!relativePaths.delete(path) || await readFile(join(output, path), 'utf8') !== expected) {
      throw new Error(`dist/${path} 未同步，請重新建置`);
    }
  }
  if (relativePaths.size) throw new Error(`dist/ 有舊輸出：${[...relativePaths].join('、')}`);
} else {
  await rm(output, { recursive: true, force: true });
  await mkdir(join(output, 'lessons'), { recursive: true });
  await cp(join(root, 'assets'), join(output, 'assets'), {
    recursive: true,
    filter: (path) => path === join(root, 'assets') || files.has(`assets/${basename(path)}`)
  });
  for (const [path, content] of files) {
    if (!path.startsWith('assets/')) await writeFile(join(output, path), content);
  }
}
console.log(`${check ? '驗證通過' : '建置完成'}（${lessons.length} 篇講義）`);
