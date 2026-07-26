/* ============================================================
   JOGOS PEDAGÓGICOS MUSICAIS — Volta às Aulas
   Atribuição (UTM + click IDs) + enriquecimento dos CTAs Hotmart
   + Meta Pixel custom_data no clique (InitiateCheckout)
   ============================================================ */
(function () {
  'use strict';

  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const CLICK_ID_KEYS = ['fbclid', 'gclid', 'ttclid', 'msclkid'];
  const HOTMART_PREFIX = 'https://pay.hotmart.com';
  const CONTENT = { content_name: 'jogos-pedagogicos-musicais', content_category: 'plataforma-jogos-musicais' };

  function readCookie(name) {
    try {
      const m = document.cookie.match(
        new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
      );
      return m ? decodeURIComponent(m[1]) : '';
    } catch (_) { return ''; }
  }

  // UTMs: usa as da URL se houver; senão recupera do sessionStorage; senão "organico".
  function captureUTMs() {
    const params = new URLSearchParams(window.location.search);
    let hasFresh = false;
    const fresh = {};
    UTM_KEYS.forEach((k) => {
      const v = params.get(k);
      if (v) hasFresh = true;
      fresh[k] = v || 'organico';
    });
    if (hasFresh) {
      try { sessionStorage.setItem('jpm_utms', JSON.stringify(fresh)); } catch (_) {}
      return fresh;
    }
    try {
      const stored = sessionStorage.getItem('jpm_utms');
      if (stored) return JSON.parse(stored);
      sessionStorage.setItem('jpm_utms', JSON.stringify(fresh));
    } catch (_) {}
    return fresh;
  }

  // Click IDs: persiste em sessionStorage (sobrevive a navegação interna #planos etc.)
  function captureClickIds() {
    const params = new URLSearchParams(window.location.search);
    const out = {};
    CLICK_ID_KEYS.forEach((k) => {
      let v = params.get(k);
      if (!v) {
        try { v = sessionStorage.getItem('jpm_' + k) || ''; } catch (_) { v = ''; }
      }
      if (v) {
        out[k] = v;
        try { sessionStorage.setItem('jpm_' + k, v); } catch (_) {}
      }
    });
    return out;
  }

  function deviceSnapshot() {
    const nav = navigator || {};
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection || {};
    let tz;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (_) {}
    return {
      browser_language: nav.language || undefined,
      client_timezone: tz,
      screen_width: (typeof screen !== 'undefined' && screen.width) || undefined,
      screen_height: (typeof screen !== 'undefined' && screen.height) || undefined,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      connection_type: conn.effectiveType || undefined,
      is_touch: ('ontouchstart' in window) ? 1 : 0,
      hardware_concurrency: nav.hardwareConcurrency || undefined,
      device_memory: nav.deviceMemory || undefined,
      platform: nav.platform || undefined,
      referrer: document.referrer || '',
      landing_url: window.location.href,
    };
  }

  const UTMS = captureUTMs();
  const CLICK_IDS = captureClickIds();

  // Expõe pra outros scripts (inline pixel, etc.) lerem
  window.JPM_UTMS = UTMS;
  window.JPM_CLICK_IDS = CLICK_IDS;
  window.JPM_CUSTOM_DATA = function () {
    return Object.assign({}, UTMS, CLICK_IDS, deviceSnapshot(), {
      fbc: readCookie('_fbc') || undefined,
      fbp: readCookie('_fbp') || undefined,
    });
  };

  function enrichHref(a) {
    try {
      const href = a.getAttribute('href') || '';
      if (!href.startsWith(HOTMART_PREFIX)) return;
      const url = new URL(href);

      // 1) UTMs canônicos + click IDs + cookies Meta (servem pra qualquer tracker inline e pro Hotmart Cart Pixel)
      Object.entries(UTMS).forEach(([k, v]) => {
        if (!url.searchParams.has(k)) url.searchParams.set(k, v);
      });
      Object.entries(CLICK_IDS).forEach(([k, v]) => {
        if (v && !url.searchParams.has(k)) url.searchParams.set(k, v);
      });
      const fbc = readCookie('_fbc');
      const fbp = readCookie('_fbp');
      if (fbc && !url.searchParams.has('_fbc')) url.searchParams.set('_fbc', fbc);
      if (fbp && !url.searchParams.has('_fbp')) url.searchParams.set('_fbp', fbp);

      // 2) src — TODAS as UTMs concatenadas (Hotmart preserva esse param no webhook como tracking.source).
      //    sck NÃO é usado aqui (reservado pro time comercial).
      const src = UTM_KEYS.map((k) => k + '=' + (UTMS[k] || '')).join('|');
      if (!url.searchParams.has('src')) url.searchParams.set('src', src);

      a.setAttribute('href', url.toString());
    } catch (_) {}
  }

  function enrichAll() {
    document.querySelectorAll('a[href^="' + HOTMART_PREFIX + '"]').forEach(enrichHref);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enrichAll, { once: true });
  } else {
    enrichAll();
  }

  // Garantia: re-enriquece no clique e dispara InitiateCheckout com custom_data
  document.addEventListener('click', function (e) {
    const a = e.target && e.target.closest && e.target.closest('a[href^="' + HOTMART_PREFIX + '"]');
    if (!a) return;
    enrichHref(a);
    try {
      if (window.fbq) {
        window.fbq('track', 'InitiateCheckout', Object.assign({}, CONTENT, UTMS, CLICK_IDS));
      }
    } catch (_) {}
  }, true);

  // ViewContent ao atingir 50% de scroll (engajamento real, não bounce)
  (function () {
    let fired = false;
    function checkScroll() {
      if (fired) return;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      if (scrollTop / docHeight >= 0.5) {
        fired = true;
        try {
          if (window.fbq) {
            window.fbq('track', 'ViewContent', Object.assign({}, CONTENT, UTMS, CLICK_IDS));
          }
        } catch (_) {}
        window.removeEventListener('scroll', checkScroll);
      }
    }
    window.addEventListener('scroll', checkScroll, { passive: true });
  })();
})();
