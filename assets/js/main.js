// MIRAI CAMP® 大阪梅田校 LP：計算ツール・開校日の表示切り替え・動画・計測・スマホの固定ボタン
(function () {
  var SITE = window.__SITE || {};
  // 比べる用：?hero=side で、最初の画面の動画を前の形（右上に小さく）で出す。標準は帯
  try { if (/[?&]hero=side/.test(location.search)) document.documentElement.setAttribute('data-hero', 'side'); } catch (e) {}
  // 比べる用：?sky=draw で、街並みを前の絵に戻して見る（標準は梅田の写真）
  try { if (/[?&]sky=draw/.test(location.search)) document.documentElement.setAttribute('data-sky', 'draw'); } catch (e) {}

  // ---- 計測（GA4・Metaピクセルが読み込まれているときだけ送る） ----
  function track(name, params) {
    params = params || {};
    params.page = SITE.page;
    try { if (window.gtag) window.gtag('event', name, params); } catch (e) {}
    try {
      if (window.fbq) {
        if (name === 'line_click') window.fbq('track', 'Lead', { content_name: SITE.page });
        else if (name === 'apply_click') window.fbq('track', 'InitiateCheckout', { content_name: SITE.page });
        else window.fbq('trackCustom', name, params);
      }
    } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-track]');
    if (el) track(el.getAttribute('data-track'), { where: el.getAttribute('data-where') || '' });
  });

  // ---- 開校日のあとは「毎月開催中」の表示に切り替える（config.json の schedule） ----
  var sch = SITE.schedule;
  if (sch && sch.openEnd && sch.afterOpenLabel) {
    var end = new Date(sch.openEnd + 'T23:59:59+09:00');
    if (Date.now() > end.getTime()) {
      document.querySelectorAll('[data-open-label]').forEach(function (el) { el.textContent = sch.afterOpenLabel; });
    }
  }

  // ---- あなたの場合の計算ツール ----
  var yen = function (n) { return Math.round(n).toLocaleString('ja-JP'); };
  document.querySelectorAll('[data-calc]').forEach(function (box) {
    var price = Number(box.getAttribute('data-price')) || 150000;
    var hoursEl = box.querySelector('[data-calc-hours]');
    var rateEl = box.querySelector('[data-calc-rate]');
    var out = function (k) { return box.querySelector('[data-out="' + k + '"]'); };
    var used = false;
    function update() {
      var h = Math.max(0, Number(hoursEl.value) || 0);
      var r = Math.max(0, Number(rateEl.value) || 0);
      var monthly = h * r;
      // 11/12 本人：「何か月で元が取れる」はやめて、年間でいくら分の時間を使っているかを見せる
      var yearly = monthly * 12;
      var saved = yearly * 0.85; // 校舎長の実例：約85%減（common.mjs の caseTotal.rate と合わせる）
      out('yearly').textContent = yen(yearly);
      out('saved').textContent = yen(saved);
    }
    [hoursEl, rateEl].forEach(function (el) {
      el.addEventListener('input', function () {
        update();
        if (!used) { used = true; track('calc_use', {}); }
      });
    });
    update();
  });

  // ---- 本部LPの形の最初の画面：はじめは動画だけ → スクロールで動画が背景に（11/12 本人） ----
  var hqHero = document.querySelector('[data-hq-hero]');
  if (hqHero) {
    var hv = hqHero.querySelector('video');
    var shade = hqHero.querySelector('[data-hq-shade]');
    var hint = hqHero.querySelector('[data-hq-hint]');
    var stage = hqHero.querySelector('.hq-stage');
    var header = document.querySelector('.site-header');
    var tallMQ = window.matchMedia('(max-width: 767px) and (orientation: portrait)');
    var cover = 1;
    var pickVideo = function () {
      var tall = tallMQ.matches;
      var src = tall ? hv.getAttribute('data-tall') : hv.getAttribute('data-wide');
      if (hv.getAttribute('src') !== src) {
        if (tall && hv.getAttribute('data-poster-tall')) hv.setAttribute('poster', hv.getAttribute('data-poster-tall'));
        hv.setAttribute('src', src);
        var p = hv.play(); if (p && p.catch) p.catch(function () {});
      }
    };
    // 動画を枠にぴったり収めた大きさ → 枠いっぱいに広げるのに必要な倍率
    var calcCover = function () {
      var w = stage.clientWidth, h = stage.clientHeight, vw = hv.videoWidth || 16, vh = hv.videoHeight || 9;
      var s = Math.min(w / vw, h / vh);
      cover = Math.max(w / (vw * s), h / (vh * s));
    };
    var setTop = function () {
      // ヘッダーは上に貼りつくので、貼りついたときの下端（top＋高さ）に動画の枠を合わせる
      var top = header ? Math.round((parseFloat(getComputedStyle(header).top) || 0) + header.offsetHeight) : 0;
      hqHero.style.setProperty('--stage-top', top + 'px');
      calcCover();
    };
    var onScroll = function () {
      var p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.28))); // 見出しが重なる前に暗くして、動画の字幕を見えにくくする
      shade.style.opacity = (0.9 * p).toFixed(3);
      hint.style.opacity = Math.max(0, 1 - p * 4).toFixed(2);
      hv.style.transform = 'scale(' + (1 + (cover - 1) * p).toFixed(4) + ')';
      hv.style.filter = p > 0 ? 'blur(' + (7 * p).toFixed(1) + 'px)' : ''; // 背景になったら、ぼかして字幕を読めなくする
    };
    pickVideo();
    if (tallMQ.addEventListener) tallMQ.addEventListener('change', function () { pickVideo(); });
    hv.addEventListener('loadedmetadata', function () { calcCover(); onScroll(); });
    setTop();
    window.addEventListener('resize', function () { setTop(); onScroll(); });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---- 動画は押してから読み込む（ページを軽くするため） ----
  document.querySelectorAll('[data-yt]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-yt');
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      f.title = btn.getAttribute('aria-label') || '動画';
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen = true;
      btn.replaceChildren(f);
      track('video_play', { video: id });
    }, { once: true });
  });

  // ---- スマホの固定ボタン：最初の画面と最後のCTAが見えている間は隠す ----
  var sticky = document.querySelector('[data-sticky]');
  var hero = document.querySelector('[data-hq-hero]') || document.querySelector('.hero'); // 本部の形では、動画だけの画面のあいだも隠す
  var finalCta = document.querySelector('.final-cta, .hq-final, #contact');
  if (sticky && 'IntersectionObserver' in window) {
    var heroVisible = true, finalVisible = false;
    var set = function () { sticky.classList.toggle('show', !heroVisible && !finalVisible); };
    if (hero) new IntersectionObserver(function (es) { heroVisible = es[0].isIntersecting; set(); }, { threshold: 0.15 }).observe(hero);
    if (finalCta) new IntersectionObserver(function (es) { finalVisible = es[0].isIntersecting; set(); }, { threshold: 0.1 }).observe(finalCta);
  }

  // ---- 法人の問い合わせフォーム（Googleフォームの埋め込み）：送信すると枠の中身が短い「送信しました」の画面に変わる。
  //      送信ボタンは枠のいちばん下にあるので、そのままだと白い余白しか見えない。枠の先頭まで戻して、お礼の文を見せる ----
  var formFrame = document.querySelector('.form-embed iframe');
  if (formFrame) {
    var formLoads = 0;
    formFrame.addEventListener('load', function () {
      formLoads++;
      if (formLoads > 1) { // 2回目の読み込み＝送信後
        formFrame.style.height = '420px'; // お礼の文だけになるので、余白が残らないよう枠を縮める
        formFrame.scrollIntoView({ behavior: 'smooth', block: 'start' });
        track('corp_form_submit', {});
      }
    });
  }
})();

// 11/14 上部メニュー（スマホ・タブレットは「≡」で開く）
(function () {
  var btn = document.querySelector('[data-nav-toggle]');
  var nav = document.querySelector('[data-nav]');
  if (!btn || !nav) return;
  var set = function (open) { nav.classList.toggle('open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); };
  btn.addEventListener('click', function () { set(!nav.classList.contains('open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
})();
