(() => {
  'use strict';

  // ===== ショートカット設定（FxEmbed と同一仕様） =====
  const FXEMBED_DOMAIN_NAME = 'fixupx.com';
  const LANGUAGE_NAME = 'ja';
  const REPLACE_DOMAIN = 'x.com|twitter.com';
  const DOMAIN_REPLACE_REGEX = new RegExp(`^https?:\\/\\/(?:www\\.|mobile\\.)?(${REPLACE_DOMAIN})`, 'i');

  // X の「リンクをコピー」アイコンSVGパス判定用
  const COPY_LINK_SVG_PATH_PREFIX = 'M18.36 5.64';

  // 「fxtwitterで共有」が押された直後のコピー処理だけをフックするフラグ
  let shouldConvertNextCopy = false;
  let resetFlagTimer = null;

  function armCopyConversion() {
    shouldConvertNextCopy = true;
    if (resetFlagTimer) {
      clearTimeout(resetFlagTimer);
    }
    resetFlagTimer = setTimeout(() => {
      shouldConvertNextCopy = false;
    }, 1500);
  }

  function disarmCopyConversion() {
    shouldConvertNextCopy = false;
    if (resetFlagTimer) {
      clearTimeout(resetFlagTimer);
      resetFlagTimer = null;
    }
  }

  /**
   * ショートカットと同じロジックでツイートURLを fixupx.com + /ja に変換する
   * @param {string} rawText
   * @returns {string}
   */
  function convertToFxEmbedUrl(rawText) {
    if (!rawText || typeof rawText !== 'string') return rawText;

    const trimmed = rawText.trim();
    if (!DOMAIN_REPLACE_REGEX.test(trimmed)) {
      return rawText;
    }

    // 1. ^https?://(x.com|twitter.com) を https://fixupx.com に置き換え
    let updatedText = trimmed.replace(
      DOMAIN_REPLACE_REGEX,
      `https://${FXEMBED_DOMAIN_NAME}`
    );

    // 2. [?].+ を /LANGUAGE_NAME に置き換え（クエリがない場合も末尾に /ja を付与）
    if (/[?].+/.test(updatedText)) {
      updatedText = updatedText.replace(/[?].+/, `/${LANGUAGE_NAME}`);
    } else if (!updatedText.endsWith(`/${LANGUAGE_NAME}`)) {
      updatedText = `${updatedText.replace(/\/+$/, '')}/${LANGUAGE_NAME}`;
    }

    // 3. URLエンコード
    try {
      return new URL(updatedText).href;
    } catch {
      return encodeURI(updatedText);
    }
  }

  // ===== 1. Clipboard API (navigator.clipboard.writeText) のフック =====
  if (typeof Clipboard !== 'undefined' && Clipboard.prototype && typeof Clipboard.prototype.writeText === 'function') {
    const originalProtoWriteText = Clipboard.prototype.writeText;
    Clipboard.prototype.writeText = function (text) {
      if (shouldConvertNextCopy && typeof text === 'string') {
        disarmCopyConversion();
        const converted = convertToFxEmbedUrl(text);
        return originalProtoWriteText.call(this, converted);
      }
      return originalProtoWriteText.call(this, text);
    };
  }

  // ===== 2. document.execCommand('copy') / copy イベントのフック =====
  window.addEventListener(
    'copy',
    (event) => {
      if (!shouldConvertNextCopy) return;

      // X が一時生成した textarea / input または選択範囲からコピー元テキストを取得
      const activeEl = document.activeElement;
      let rawText = '';

      if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
        rawText = activeEl.value || '';
      }
      if (!rawText) {
        rawText = window.getSelection()?.toString() || '';
      }

      if (rawText && DOMAIN_REPLACE_REGEX.test(rawText.trim())) {
        disarmCopyConversion();
        const converted = convertToFxEmbedUrl(rawText);
        if (event.clipboardData) {
          event.clipboardData.setData('text/plain', converted);
          event.preventDefault();
        }
      }
    },
    true
  );

  /**
   * ドロップダウンメニューが共有メニューかどうかを判定し、X純正の「リンクをコピー」要素を返す
   * @param {Element} dropdown
   * @returns {HTMLElement|null}
   */
  function findCopyLinkMenuItem(dropdown) {
    const menuItems = dropdown.querySelectorAll('[role="menuitem"]');
    for (const item of menuItems) {
      if (item.getAttribute('data-fxtwitter-share-item') === 'true') continue;

      const paths = item.querySelectorAll('svg path');
      for (const path of paths) {
        const d = path.getAttribute('d') || '';
        if (d.startsWith(COPY_LINK_SVG_PATH_PREFIX)) {
          return /** @type {HTMLElement} */ (item);
        }
      }

      const text = (item.textContent || '').trim();
      if (
        text === 'リンクをコピー' ||
        text === 'Copy link' ||
        text.includes('リンクをコピー') ||
        text.toLowerCase().includes('copy link')
      ) {
        return /** @type {HTMLElement} */ (item);
      }
    }
    return null;
  }

  /**
   * X純正の「リンクをコピー」要素のクリック処理をそのまま呼び出す
   * @param {HTMLElement} copyLinkItem
   */
  function triggerNativeCopyLinkItem(copyLinkItem) {
    // まず標準の click() を発火
    copyLinkItem.click();

    // React Native Web の Responder / Pressability 向けに pointer / mouse イベントも補完（まだ発火していない場合のみ）
    if (shouldConvertNextCopy) {
      const eventInit = {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        button: 0,
        buttons: 1
      };
      copyLinkItem.dispatchEvent(new PointerEvent('pointerdown', eventInit));
      copyLinkItem.dispatchEvent(new MouseEvent('mousedown', eventInit));
      copyLinkItem.dispatchEvent(new PointerEvent('pointerup', { ...eventInit, buttons: 0 }));
      copyLinkItem.dispatchEvent(new MouseEvent('mouseup', { ...eventInit, buttons: 0 }));
    }
  }

  /**
   * 共有ドロップダウンメニューに「fxtwitterで共有」を追加する
   * @param {Element} dropdown
   */
  function injectFxTwitterMenuItem(dropdown) {
    if (dropdown.querySelector('[data-fxtwitter-share-item="true"]')) {
      return;
    }

    const copyLinkItem = findCopyLinkMenuItem(dropdown);
    if (!copyLinkItem) return;

    // X純正の「リンクをコピー」要素を複製してデザイン・テーマ設定をそのまま引き継ぐ
    const fxMenuItem = /** @type {HTMLElement} */ (copyLinkItem.cloneNode(true));
    fxMenuItem.setAttribute('data-fxtwitter-share-item', 'true');
    fxMenuItem.classList.add('fxtwitter-menu-item');

    // ラベルテキストを「fxtwitterで共有」に変更
    const spans = fxMenuItem.querySelectorAll('span');
    let labelUpdated = false;
    for (let i = spans.length - 1; i >= 0; i--) {
      const span = spans[i];
      if (span.children.length === 0 && (span.textContent || '').trim().length > 0) {
        span.textContent = 'fxtwitterで共有';
        labelUpdated = true;
        break;
      }
    }
    if (!labelUpdated) {
      fxMenuItem.textContent = 'fxtwitterで共有';
    }

    // クリック時にX本来の「リンクをコピー」をそのまま呼び出し、コピー文字列のみ fixupx.com に変換
    fxMenuItem.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      armCopyConversion();
      triggerNativeCopyLinkItem(copyLinkItem);
    });

    // 「リンクをコピー」のすぐ下に挿入
    copyLinkItem.insertAdjacentElement('afterend', fxMenuItem);
  }

  /**
   * DOM監視を開始する
   */
  function startObserver() {
    const targetNode = document.body || document.documentElement;
    if (!targetNode) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.getAttribute('data-fxtwitter-share-item') === 'true') continue;

          const dropdown =
            node.getAttribute('data-testid') === 'Dropdown'
              ? node
              : node.querySelector?.('[data-testid="Dropdown"]') ||
                node.closest?.('[data-testid="Dropdown"]');

          if (dropdown) {
            injectFxTwitterMenuItem(dropdown);
          }
        }
      }
    });

    observer.observe(targetNode, {
      childList: true,
      subtree: true
    });
  }

  if (document.body) {
    startObserver();
  } else {
    window.addEventListener('DOMContentLoaded', startObserver, { once: true });
  }
})();
