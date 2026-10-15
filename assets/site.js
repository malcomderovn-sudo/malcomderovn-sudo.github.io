/* =========================================================================
   УСЛУГИ · МАХАЧКАЛА — общий скрипт сайта (этап 3 конвейера «мясорубка»)
   Делает ровно четыре вещи:
   1) Конфиг владельца в одном месте: телефон, WhatsApp, счётчик Метрики.
   2) События Яндекс.Метрики Ц2–Ц7 (advertising-plan.md, раздел 6.1).
   3) Прокидывает UTM-метки из ссылки на /spasibo и дальше в WhatsApp-заявку.
   4) Собирает текст заявки на /spasibo — кнопкой отправляется в WhatsApp.
   Цель Ц1 (zayavka_forma) — URL-цель на /spasibo, создаётся в кабинете Метрики.
   ========================================================================= */
(function () {
  'use strict';

  /* --- 1. КОНФИГ ---------------------------------------------------------
     Заполняет владелец ПЕРЕД публикацией. Пустые значения = ничего не меняется
     (в HTML остаются заполнители .ph «+7 (XXX) XXX-XX-XX»).                */
  var CONFIG = {
    METRIKA_ID: 0,     // номер счётчика Яндекс.Метрики, напр. 123456789
    VK_PIXEL_ID: '',   // идентификатор пикселя VK, напр. '12345678'
    PHONE: '+7 928 588-19-87',         // телефон в формате +79281234567 — подставится во все tel:
    WA: '79285881987',            // то же число без плюса для wa.me, напр. '79281234567'
    DOMAIN: 'uslugi-mahachkala.ru'
  };

  /* --- 2. ЯНДЕКС.МЕТРИКА ------------------------------------------------- */
  var goalsReady = false;
  function reachGoal(name, params) {
    if (window.ym && goalsReady) { try { window.ym(CONFIG.METRIKA_ID, 'reachGoal', name, params); } catch (e) {} }
  }

  function initMetrika() {
    if (!CONFIG.METRIKA_ID) return;
    goalsReady = true;
    window.ym = window.ym || function () { (ym.a = ym.a || []).push(arguments); };
    ym.l = 1 * new Date();
    var s = document.createElement('script');
    s.async = true;
    s.type = 'text/javascript';
    s.src = 'https://mc.yandex.ru/metrika/tag.js';
    var first = document.getElementsByTagName('script')[0];
    first.parentNode.insertBefore(s, first);
    ym(CONFIG.METRIKA_ID, 'init', {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true
    });
    // Номер-подмена Метрики: включается в кабинете, когда звонки станут
    // основным каналом (advertising-plan.md, раздел 6.2).
  }

  function initVkPixel() {
    if (!CONFIG.VK_PIXEL_ID) return;
    try {
      !function(){var VK=window.VK=window.VK||{};if(!VK.init)return;VK.init=function(){VK.Retargeting.Init(VK_PIXEL_ID);VK.Retargeting.Hit("page_view");};var s=document.createElement('script');s.src='https://vk.com/js/api/retargeting.js';s.async=true;document.head.appendChild(s);}();
    } catch (e) {}
  }

  /* --- 3. УТИЛИТЫ -------------------------------------------------------- */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function utmFromUrl() {
    var out = {};
    var q = new URLSearchParams(window.location.search);
    ['source', 'medium', 'campaign', 'content', 'term'].forEach(function (k) {
      var v = q.get('utm_' + k);
      if (v) out['utm_' + k] = v;
    });
    return out;
  }

  function query() { return new URLSearchParams(window.location.search); }

  /* --- 4. ССЫЛКИ: цели Ц2–Ц4, Ц6 ----------------------------------------- */
  function bindLinkGoals() {
    document.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
      if (!a) return;
      var href = (a.getAttribute('href') || '').toLowerCase();
      var text = (a.textContent || '').trim().toLowerCase();

      if (href.indexOf('wa.me') > -1 || href.indexOf('whatsapp.com') > -1 || href.indexOf('api.whatsapp') > -1) {
        reachGoal('whatsapp_click');
      } else if (href.indexOf('tel:') === 0) {
        reachGoal('phone_click');
      } else if (href.indexOf('t.me') > -1 || href.indexOf('telegram.me') > -1) {
        reachGoal('telegram_click');
      }

      if (text.indexOf('проложить маршрут') > -1 ||
          href.indexOf('yandex.ru/maps') > -1 || href.indexOf('maps.google') > -1 ||
          a.hasAttribute('data-route')) {
        reachGoal('route_click');
      }
    }, false);
  }

  /* --- 5. ЦЕЛЬ Ц5 catalog_view: доскроллили до каталога цен --------------- */
  function bindCatalogView() {
    var targets = document.querySelectorAll('#popular, #pechat, .chips');
    if (!targets.length || !('IntersectionObserver' in window)) return;
    var fired = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !fired) {
          fired = true;
          reachGoal('catalog_view');
          io.disconnect();
        }
      });
    }, { threshold: 0.15 });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* --- 6. ФОРМА: UTM дальше на /spasibo + цель Ц7 promo_qr10 ------------- */
  function bindForms() {
    document.querySelectorAll('form[action^="/spasibo"]').forEach(function (form) {
      var utm = utmFromUrl();
      Object.keys(utm).forEach(function (k) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = k;
        input.value = utm[k];
        form.appendChild(input);
      });
      form.addEventListener('submit', function () {
        var promo = (form.querySelector('[name="promo"]') || {}).value || '';
        if (promo.trim().toUpperCase() === 'QR10') reachGoal('promo_qr10', { promo: 'QR10' });
      });
    });
  }

  /* --- 7. СТРАНИЦА СПАСИБО: заявка уходит в WhatsApp одной кнопкой -------- */
  function fillSpasibo() {
    if (window.location.pathname.indexOf('/spasibo') !== 0) return;
    var q = query();
    var name = (q.get('name') || '').trim();
    var task = (q.get('task') || '').trim();
    var contact = (q.get('contact') || '').trim();
    var promo = (q.get('promo') || '').trim();
    var utm = utmFromUrl();

    var lines = ['Здравствуйте! Заявка с сайта:'];
    if (task) lines.push('Задача: ' + task);
    if (contact) lines.push('Контакт: ' + contact);
    if (name) lines.push('Имя: ' + name);
    if (promo) lines.push('Промокод: ' + promo);
    if (utm.utm_campaign) lines.push('Источник: ' + (utm.utm_source || '') + ' / ' + utm.utm_campaign);
    if (lines.length === 1) lines.push('Хочу заказать услугу.');
    var text = lines.join('\n');

    var link = document.getElementById('wa-send');
    if (link) {
      var num = CONFIG.WA ? CONFIG.WA : '7XXXXXXXXXX';
      link.setAttribute('href', 'https://wa.me/' + num + '?text=' + encodeURIComponent(text));
    }
    var box = document.getElementById('spasibo-task');
    if (box && task) box.textContent = task;

    var promoNote = document.getElementById('spasibo-promo');
    if (promoNote && promo) {
      promoNote.hidden = false;
      promoNote.querySelector('b').textContent = promo;
    }
  }

  /* --- 8. ЗАМЕНА ТЕЛЕФОНА ИЗ КОНФИГА (один раз правится владельцем) ------ */
  function fillContacts() {
    if (CONFIG.PHONE) {
      document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
        a.setAttribute('href', 'tel:' + CONFIG.PHONE.replace(/[^+\d]/g, ''));
      });
      document.querySelectorAll('a[aria-label="Позвонить"], .ph').forEach(function (el) {
        if (el.classList.contains('ph') || el.classList.contains('btn-call')) {
          if (/X{3,}/.test(el.textContent)) {
            el.innerHTML = el.innerHTML.replace(/\+7 \(XXX\) XXX-XX-XX|\+7XXXXXXXXXX/g, CONFIG.PHONE);
          }
        }
      });
      document.querySelectorAll('.ph').forEach(function (el) {
        el.innerHTML = el.innerHTML.replace(/\+7 \(XXX\) XXX-XX-XX/g, CONFIG.PHONE);
      });
    }
    if (CONFIG.WA) {
      document.querySelectorAll('a[href*="7XXXXXXXXXX"]').forEach(function (a) {
        a.setAttribute('href', a.getAttribute('href').replace(/7XXXXXXXXXX/g, CONFIG.WA));
      });
    }
  }

  /* --- 9. СТАРТ ---------------------------------------------------------- */
  ready(function () {
    initMetrika();
    initVkPixel();
    bindLinkGoals();
    bindCatalogView();
    bindForms();
    fillSpasibo();
    fillContacts();
  });
})();
