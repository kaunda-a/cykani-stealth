// Cursor — visible mouse cursor overlay using cykani-stealth chip logo
// Renders at mouse position via mousemove events for VNC-like debugging

export const CURSOR_OVERLAY_JS = (() => {
  // Chip-favicon logo, scaled to 36x36 with dark/light mode support
  return `(() => {
    try {
      if (document.getElementById('__cykani_cursor')) return;
      var el = document.createElement('div');
      el.id = '__cykani_cursor';
      el.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;' +
        'left:50vw;top:50vh;transform:translate(-50%,-50%);width:36px;height:36px;' +
        'filter:drop-shadow(0 0 5px rgba(0,0,0,0.7))';
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '36');
      svg.setAttribute('height', '36');
      svg.setAttribute('viewBox', '0 0 64 64');
      svg.innerHTML = '<style>' +
        '@media(prefers-color-scheme:dark){.nc{stroke:rgba(255,255,255,0.88)}.nd{fill:rgba(255,255,255,0.9)}}' +
        '@media(prefers-color-scheme:light){.nc{stroke:rgba(0,0,0,0.88)}.nd{fill:rgba(0,0,0,0.9)}}' +
        '</style>' +
        '<rect class="nc" x="14" y="14" width="36" height="36" rx="5" stroke-width="1.6"/>' +
        '<path class="nc" d="M20 20C26 26 24 32 32 32C40 32 38 38 44 44" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path class="nc" d="M44 20C38 26 40 32 32 32C24 32 26 38 20 44" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path class="nc" d="M20 32C26 28 38 36 44 32" stroke-width="1.6" stroke-linecap="round"/>' +
        '<circle class="nd" cx="32" cy="32" r="3"/>' +
        '<line class="nc" x1="14" y1="26" x2="6" y2="26" stroke-width="1.2" stroke-linecap="round"/>' +
        '<line class="nc" x1="14" y1="32" x2="6" y2="32" stroke-width="1.2" stroke-linecap="round"/>' +
        '<line class="nc" x1="14" y1="38" x2="6" y2="38" stroke-width="1.2" stroke-linecap="round"/>' +
        '<line class="nc" x1="50" y1="26" x2="58" y2="26" stroke-width="1.2" stroke-linecap="round"/>' +
        '<line class="nc" x1="50" y1="32" x2="58" y2="32" stroke-width="1.2" stroke-linecap="round"/>' +
        '<line class="nc" x1="50" y1="38" x2="58" y2="38" stroke-width="1.2" stroke-linecap="round"/>' +
        '<line class="nc" x1="26" y1="14" x2="26" y2="7" stroke-width="1.2" stroke-linecap="round"/>' +
        '<line class="nc" x1="32" y1="14" x2="32" y2="7" stroke-width="1.2" stroke-linecap="round"/>' +
        '<line class="nc" x1="38" y1="14" x2="38" y2="7" stroke-width="1.2" stroke-linecap="round"/>' +
        '<line class="nc" x1="26" y1="50" x2="26" y2="57" stroke-width="1.2" stroke-linecap="round"/>' +
        '<line class="nc" x1="32" y1="50" x2="32" y2="57" stroke-width="1.2" stroke-linecap="round"/>' +
        '<line class="nc" x1="38" y1="50" x2="38" y2="57" stroke-width="1.2" stroke-linecap="round"/>' +
        '<circle class="nd" cx="6" cy="26" r="1.5"/><circle class="nd" cx="6" cy="32" r="1.5"/>' +
        '<circle class="nd" cx="6" cy="38" r="1.5"/><circle class="nd" cx="58" cy="26" r="1.5"/>' +
        '<circle class="nd" cx="58" cy="32" r="1.5"/><circle class="nd" cx="58" cy="38" r="1.5"/>' +
        '<circle class="nd" cx="26" cy="7" r="1.5"/><circle class="nd" cx="32" cy="7" r="1.5"/>' +
        '<circle class="nd" cx="38" cy="7" r="1.5"/><circle class="nd" cx="26" cy="57" r="1.5"/>' +
        '<circle class="nd" cx="32" cy="57" r="1.5"/><circle class="nd" cx="38" cy="57" r="1.5"/>';
      el.appendChild(svg);
      function attach() {
        if (document.documentElement) {
          document.documentElement.appendChild(el);
          window.__cykaniCursorOK = true;
        } else {
          setTimeout(attach, 10);
        }
      }
      attach();
      document.addEventListener('mousemove', function(e) {
        el.style.left = e.clientX + 'px';
        el.style.top = e.clientY + 'px';
      }, {passive: true});
    } catch (e) {
      window.__cykaniCursorError = e.message || String(e);
    }
  })();`;
})();

export async function injectCursorOverlay(page) {
  await page.addInitScript(CURSOR_OVERLAY_JS);
}

export async function patchContextForCursor(context) {
  context.on('page', (page) => {
    page.addInitScript(CURSOR_OVERLAY_JS).catch(() => {});
  });
  for (const page of context.pages()) {
    await page.addInitScript(CURSOR_OVERLAY_JS).catch(() => {});
  }
}