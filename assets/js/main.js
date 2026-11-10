// MIRAI CAMP® 大阪梅田校 LP：計算ツール・開校日の表示切り替え・動画・計測・スマホの固定ボタン
(function () {
  var SITE = window.__SITE || {};

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
      var half = monthly / 2;
      out('monthly').textContent = yen(monthly);
      out('half').textContent = yen(half);
      out('months').textContent = half > 0 ? (Math.ceil((price / half) * 10) / 10).toLocaleString('ja-JP') : '-';
    }
    [hoursEl, rateEl].forEach(function (el) {
      el.addEventListener('input', function () {
        update();
        if (!used) { used = true; track('calc_use', {}); }
      });
    });
    update();
  });

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
  var hero = document.querySelector('.hero');
  var finalCta = document.querySelector('.final-cta, #contact');
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
