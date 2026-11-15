// MIRAI CAMP® 大阪梅田校 個別無料相談会の予約ページ
// API_URL に Apps Script のウェブアプリのURLを入れる。空のときは「見本」として仮の空き枠を出す（予約は送られない）
const API_URL = 'https://script.google.com/macros/s/AKfycbxCj-JvZ2priUjobfcIUKjK2CEpfNvw58EIOqpQpFO78ZZ7rSlIT1_Zj0Zwb8w9kM5u/exec';

const CHOICES = {
  segments: ['サロンオーナー', '飲食店・お店のオーナー', '経営者・個人事業主', '会社員', '副業を考えている', 'その他'],
  aiLevels: ['ほとんど使ったことがない', 'ChatGPTなどを少し使ったことがある', '仕事で使っている'],
  sources: ['公式LINE', 'Instagram', 'ホームページ', 'Google検索・マップ', '知人の紹介', 'その他'],
};
const DEMO = !API_URL;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const WD = '日月火水木金土';
const ERR = {
  slot_taken: 'その時間は、たった今ほかの方の予約が入りました。お手数ですが、別の時間を選んでください。',
  invalid: '入力に足りないところがあります。赤い項目をご確認ください。',
  too_late: '変更の受付（前日18:00まで）を過ぎています。このページからキャンセルするか、メールにご返信ください。',
  not_found: 'ご予約が見つかりませんでした。メールのリンクをもう一度開いてください。',
  busy: '混み合っています。少し待ってから、もう一度お試しください。',
  server: 'うまく受け付けられませんでした。少し待ってから、もう一度お試しください。',
  network: '通信できませんでした。電波のよいところで、もう一度お試しください。',
};

const tz = (iso) => new Date(iso);
const ymd = (d) => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
const hm = (d) => d.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' });
const wd = (d) => new Date(ymd(d) + 'T12:00:00+09:00').getUTCDay();
const md = (d) => { const [, m, dd] = ymd(d).split('-'); return `${+m}月${+dd}日`; };
const when = (d) => `${md(d)}（${WD[wd(d)]}）${hm(d)}`;

async function api(params, body) {
  if (DEMO) return demoApi(params, body);
  try {
    const res = body
      ? await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      : await fetch(API_URL + '?' + new URLSearchParams(params));
    return await res.json();
  } catch (e) {
    return { ok: false, error: 'network' };
  }
}

/* ---------- 日時を選ぶ ---------- */
let selected = null;

function renderPicker(root, slots, onPick) {
  if (!slots.length) {
    root.innerHTML = '<p class="empty">いま空いている枠がありません。<br>枠は毎週追加しています。少し日を置いてから、もう一度ご覧ください。</p>';
    return;
  }
  const byDay = new Map();
  slots.forEach((s) => { const k = ymd(tz(s.start)); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(s); });
  root.innerHTML = '<div class="days" role="group" aria-label="日にち"></div><div class="times" role="group" aria-label="時間"></div>';
  const days = $('.days', root), times = $('.times', root);
  const showDay = (k) => {
    $$('.day', days).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.day === k)));
    times.innerHTML = '';
    byDay.get(k).forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'time'; b.textContent = hm(tz(s.start));
      b.setAttribute('aria-pressed', String(selected && selected.id === s.id));
      b.addEventListener('click', () => { selected = s; $$('.time', times).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); onPick(s); });
      times.appendChild(b);
    });
  };
  byDay.forEach((list, k) => {
    const d = tz(list[0].start), w = wd(d);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'day' + (w === 6 ? ' sat' : w === 0 ? ' sun' : ''); b.dataset.day = k;
    b.innerHTML = `<small>${+k.slice(5, 7)}月</small><b>${+k.slice(8)}</b><small>${WD[w]}曜</small><span class="count">${list.length}枠</span>`;
    b.addEventListener('click', () => showDay(k));
    days.appendChild(b);
  });
  showDay(byDay.keys().next().value);
}

function renderChips(choices) {
  $$('[data-choices]').forEach((box) => {
    const name = box.dataset.name;
    box.innerHTML = (choices[box.dataset.choices] || []).map((c) => `<label><input type="radio" name="${name}" value="${c}"><span>${c}</span></label>`).join('');
  });
}

/* ---------- 予約する ---------- */
async function initBook() {
  renderChips(CHOICES);
  const picker = $('[data-picker]');
  const formSec = $('[data-form-sec]');
  const res = await api({ action: 'slots' });
  if (!res.ok) { picker.innerHTML = `<p class="empty">${ERR[res.error] || ERR.server}</p>`; return; }
  const pick = (s) => {
    formSec.hidden = false;
    $('[data-sticky]').hidden = true;
    $('[data-chosen]').innerHTML = `${when(tz(s.start))}〜${hm(tz(s.end))}<button type="button" data-repick>変える</button>`;
    $('[data-repick]').addEventListener('click', () => $('#pick').scrollIntoView());
    formSec.scrollIntoView();
  };
  renderPicker(picker, res.slots, pick);

  const form = $('[data-form]');
  const clearMark = (e) => { const f = e.target.closest('.field.invalid'); if (f) f.classList.remove('invalid'); };
  form.addEventListener('input', clearMark);
  form.addEventListener('change', clearMark);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    $$('.field', form).forEach((f) => f.classList.remove('invalid'));
    const bad = [];
    if (!data.name || !data.name.trim()) bad.push('name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((data.email || '').trim())) bad.push('email');
    if (!data.segment) bad.push('segment');
    const errBox = $('[data-error]');
    if (!selected) { errBox.textContent = '先に日時を選んでください。'; errBox.hidden = false; $('#pick').scrollIntoView(); return; }
    if (bad.length) {
      bad.forEach((n) => { const el = form.querySelector(`[name="${n}"]`) || form.querySelector(`[data-name="${n}"]`); el && el.closest('.field').classList.add('invalid'); });
      errBox.textContent = ERR.invalid; errBox.hidden = false; return;
    }
    errBox.hidden = true;
    const btn = $('[data-submit]'); btn.disabled = true; btn.textContent = '予約しています…';
    const r = await api(null, { action: 'book', slotId: selected.id, ...data });
    btn.disabled = false; btn.textContent = 'この内容で予約する';
    if (!r.ok) {
      errBox.textContent = ERR[r.error] || ERR.server; errBox.hidden = false;
      if (r.error === 'slot_taken') { selected = null; const again = await api({ action: 'slots' }); if (again.ok) renderPicker(picker, again.slots, pick); }
      return;
    }
    track('soudan_booked', { segment: data.segment });
    showDone(r.booking);
  });
}

function ticketHtml(b) {
  return `<p><b>日時</b><span>${when(tz(b.start))}〜${hm(tz(b.end))}（30分）</span></p>
    <p><b>場所</b><span>オンライン（Google Meet）<br><small>リンクはメールでお送りしています</small></span></p>
    <p><b>担当</b><span>大阪梅田校 校舎長</span></p>`;
}

function showDone(b) {
  $('[data-view="book"]').hidden = true;
  $('[data-sticky]').hidden = true;
  $('[data-view="done"]').hidden = false;
  $('[data-ticket]').innerHTML = ticketHtml(b);
  window.scrollTo(0, 0);
}

/* ---------- 変更・キャンセル ---------- */
async function initManage(t) {
  $('[data-view="book"]').hidden = true;
  $('[data-sticky]').hidden = true;
  $('[data-view="manage"]').hidden = false;
  const box = $('[data-manage]');
  const res = await api({ action: 'booking', t });
  if (!res.ok) { box.innerHTML = `<p class="empty">${ERR[res.error] || ERR.server}</p>`; return; }
  const b = res.booking;
  if (b.status !== '予約') {
    box.innerHTML = `<p class="empty">このご予約は、すでにキャンセルされています。</p><p class="center"><a class="btn btn-orange btn-md" href="./">あらためて予約する</a></p>`;
    return;
  }
  box.innerHTML = `<p class="sec-lead">${b.name}様のご予約</p><div class="ticket">${ticketHtml(b)}</div>
    <div class="manage-sub" ${b.canChange ? '' : 'hidden'}><h2>日時を変える</h2><div class="picker" data-picker2></div><p class="error" data-err2 hidden></p><div class="manage-actions"><button class="btn btn-orange btn-md btn-block" data-change disabled>この日時に変更する</button></div></div>
    ${b.canChange ? '' : '<p class="note-box">変更の受付（前日18:00まで）を過ぎています。行けなくなった場合は、下からキャンセルしてください。</p>'}
    <div class="manage-sub"><h2>キャンセルする</h2><textarea rows="2" maxlength="300" placeholder="よろしければ理由をお聞かせください（任意）" data-reason></textarea><button class="btn btn-danger btn-md btn-block" data-cancel>予約をキャンセルする</button></div>`;
  let chosen = null;
  if (b.canChange) renderPicker($('[data-picker2]'), res.slots, (s) => { chosen = s; $('[data-change]').disabled = false; $('[data-change]').textContent = `${when(tz(s.start))} に変更する`; });
  $('[data-change]').addEventListener('click', async (e) => {
    if (!chosen) return;
    e.target.disabled = true;
    const r = await api(null, { action: 'change', t, slotId: chosen.id });
    if (!r.ok) { const er = $('[data-err2]'); er.textContent = ERR[r.error] || ERR.server; er.hidden = false; e.target.disabled = false; return; }
    box.innerHTML = `<p class="done-mark" aria-hidden="true">✓</p><p class="sec-lead">日時を変更しました。確認のメールをお送りしました。</p><div class="ticket">${ticketHtml(r.booking)}</div>`;
  });
  $('[data-cancel]').addEventListener('click', async (e) => {
    if (!confirm('ご予約をキャンセルします。よろしいですか？')) return;
    e.target.disabled = true;
    const r = await api(null, { action: 'cancel', t, reason: $('[data-reason]').value });
    if (!r.ok) { alert(ERR[r.error] || ERR.server); e.target.disabled = false; return; }
    box.innerHTML = `<p class="sec-lead">キャンセルを承りました。確認のメールをお送りしました。<br>またご都合のよいときに、いつでもご予約ください。</p><p class="center"><a class="btn btn-orange btn-md" href="./">あらためて予約する</a></p>`;
  });
}

/* ---------- 計測（LPのタグがあれば送る） ---------- */
function track(name, params) {
  try { window.gtag && window.gtag('event', name, params); } catch (e) {}
  try { window.fbq && window.fbq('track', 'Schedule'); } catch (e) {}
}

/* ---------- 下に出るボタン：日時の欄が見えたら隠す ---------- */
const sticky = $('[data-sticky]');
if ('IntersectionObserver' in window) {
  new IntersectionObserver((es) => es.forEach((en) => sticky.classList.toggle('hide', en.isIntersecting)), { threshold: 0 }).observe($('#pick'));
}

/* ---------- 見本（API_URLが空のとき） ---------- */
function demoApi(params, body) {
  const slots = [];
  const start = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(start.getTime() + i * 864e5), k = ymd(d), w = wd(d);
    const times = (w === 0 || w === 6) ? ['10:00', '11:00', '13:30', '15:00', '16:30', '17:30'] : (i % 3 === 0 ? ['20:00', '20:30'] : []);
    times.forEach((t) => { const s = new Date(`${k}T${t}:00+09:00`); slots.push({ id: k + t, start: s.toISOString(), end: new Date(s.getTime() + 18e5).toISOString() }); });
  }
  return new Promise((ok) => setTimeout(() => {
    if (body && body.action === 'book') { const s = slots.find((x) => x.id === body.slotId) || slots[0]; ok({ ok: true, booking: { ...s, name: body.name, status: '予約' } }); return; }
    if (params && params.action === 'booking') { ok({ ok: true, booking: { ...slots[2], name: '梅田 花子', status: '予約', canChange: true }, slots }); return; }
    if (body) { ok({ ok: true, booking: { ...slots.find((x) => x.id === body.slotId), name: '梅田 花子', status: '予約' } }); return; }
    ok({ ok: true, slots });
  }, 300));
}

const token = new URLSearchParams(location.search).get('t');
if (token) initManage(token); else initBook();
