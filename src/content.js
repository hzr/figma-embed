// @ts-check

/** @param {string} suffix */
function makeKey(suffix) {
  return `figma-embed-${suffix}`;
}

let autoExpand = true;
let colorfulIcon = true;

// https://developers.figma.com/docs/embeds/resources/#check-figma-url
const regexp =
  /https:\/\/[\w\.-]+\.?figma.com\/([\w-]+)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/;
const extensionIframeUrl = chrome.runtime.getURL('iframe.html');
const platform = navigator.userAgentData?.platform ?? 'macOS'; // FIXME
const toggleModifierKey = platform === 'macOS' ? 'Command' : 'Ctrl';
const expandedClass = makeKey('button-expanded');
const collapsedClass = makeKey('button-collapsed');
const wrapperClass = makeKey('wrapper');
const linkClass = makeKey('link');

function getIconEle() {
  const id = `gradient-${crypto.randomUUID()}`;
  return /* HTML */ `
    <svg
      width="16"
      height="12"
      viewBox="0 0 16 12"
      fill="none"
      style="vertical-align: -1px;"
    >
      <rect
        width="14"
        height="10"
        x="1"
        y="1"
        rx="2"
        fill="transparent"
        stroke-width="2"
        style="stroke: var(--plain-color, url(#${id}))"
      />
      <path
        d="M8 4l3 4h-6l3 -4z"
        stroke="none"
        style="
          fill: var(--plain-color, currentColor);
          will-change: transform;
          transform: var(--transform);
          transform-origin: 50%;
          transition: transform .2s;
        "
      />
      <defs>
        <linearGradient
          id="${id}"
          x1="0"
          y1="0"
          x2="100%"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#f24e1e" />
          <stop stop-color="#ff7262" offset="0.2" />
          <stop stop-color="#a259ff" offset="0.6" />
          <stop stop-color="#1abcfe" offset="0.8" />
          <stop stop-color="#0acf83" offset="1" />
        </linearGradient>
      </defs>
    </svg>
  `;
}

/**
 * GitHub specific
 * @param {HTMLElement} ele
 */
function isInPopover(ele) {
  return ele.closest('.Popover') !== null;
}

/**
 * @param {boolean} isExpanded
 * @param {string} linkColor
 * @return {HTMLButtonElement}
 */
function createToggleButton(isExpanded, linkColor) {
  const buttonEle = document.createElement('button');
  buttonEle.type = 'button';
  buttonEle.style.cssText = `
    vertical-align: baseline;
    line-height: inherit;
    width: auto;
    height: auto;
    padding: 0;
    margin: 0;
    background: none;
    border: none;
    cursor: pointer;
    --color: ${linkColor};
  `;
  // aria-controls here?
  buttonEle.innerHTML = getIconEle();
  setColorfulIcon(buttonEle);
  setButtonAttributes(buttonEle, isExpanded);
  return buttonEle;
}

/**
 * @param {HTMLButtonElement} ele
 * @param {boolean} isExpanded
 */
function setButtonAttributes(ele, isExpanded) {
  ele.classList.toggle(collapsedClass, !isExpanded);
  ele.classList.toggle(expandedClass, isExpanded);
  ele.ariaExpanded = String(isExpanded);
  ele.ariaLabel = isExpanded ? 'Hide the Figma file' : 'Show the Figma file';
  ele.title = isExpanded
    ? `${toggleModifierKey}-click to hide all`
    : `${toggleModifierKey}-click to show all`;
  ele.style.setProperty('--transform', isExpanded ? 'rotate(180deg)' : '');
}

/**
 * @param {HTMLButtonElement} buttonEle
 */
function setColorfulIcon(buttonEle) {
  if (colorfulIcon) {
    buttonEle.style.removeProperty('--plain-color');
  } else {
    buttonEle.style.setProperty('--plain-color', 'var(--color)');
  }
}

/**
 * @param {HTMLAnchorElement} linkEle
 */
function getButtonEle(linkEle) {
  return linkEle.previousElementSibling;
}

/**
 * @param {string} url
 * @param {boolean} isInPopover
 * @return {HTMLSpanElement}
 */
function createEmbedEle(url, isInPopover) {
  const iframeEle = document.createElement('iframe');
  iframeEle.src = `${extensionIframeUrl}?figmaurl=${encodeURIComponent(url)}`;
  iframeEle.title = 'Figma embed';
  iframeEle.allowFullscreen = true;
  // --color-border-default is set by GitHub
  iframeEle.style.cssText = `
    border: 1px solid var(--color-border-default, #bbb);
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    border-radius: 4px;
  `;

  const wrapperEle = document.createElement('span');
  wrapperEle.classList.add(wrapperClass);
  const baseStyle = `
    display: block;
    width: 100%;
    aspect-ratio: 3/2;
  `;
  wrapperEle.style.cssText = isInPopover
    ? baseStyle
    : `
      ${baseStyle}
      max-width: 1000px;
      min-width: 100px;
      min-height: 300px;
      overflow: hidden;
      resize: both;
      position: relative;
      z-index: 1;
    `;
  wrapperEle.append(iframeEle);
  wrapperEle.addEventListener('click', event => event.stopPropagation());

  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      if (entry.target === wrapperEle) {
        // max-width sets the maximum width for the initial render
        // We remove it to support resizing above 1000px
        wrapperEle.attributeStyleMap.set(
          'width',
          CSS.px(entry.contentRect.width),
        );
        wrapperEle.style.removeProperty('max-width');
        resizeObserver.unobserve(wrapperEle);
        break;
      }
    }
  });

  resizeObserver.observe(wrapperEle);

  return wrapperEle;
}

/**
 * @param {Element} rootEle
 */
function embedFigmaLinks(rootEle) {
  /** @type NodeListOf<HTMLAnchorElement> */
  const figmaLinkEles = rootEle.querySelectorAll(
    `a:is([href^="https://www.figma.com/"]):not(.${linkClass})`,
  );
  for (const ele of figmaLinkEles) {
    // Make sure we only handle this element once. This flag survives back/forward navigation.
    ele.classList.add(linkClass);

    if (!regexp.test(ele.href)) {
      continue;
    }

    if (ele.textContent === ele.href) {
      ele.style.wordBreak = 'break-all';
    }

    const shouldExpand = autoExpand && !isInPopover(ele);
    const linkColor = window.getComputedStyle(ele).color;
    ele.before(createToggleButton(shouldExpand, linkColor), ' ');
    if (shouldExpand) {
      expand(ele);
    }
  }
}

/**
 * @param {HTMLAnchorElement} linkEle
 */
function expand(linkEle) {
  const buttonEle = getButtonEle(linkEle);
  setButtonAttributes(buttonEle, true);
  linkEle.after(createEmbedEle(linkEle.href, isInPopover(linkEle)));
}

/**
 * @param {HTMLAnchorElement} linkEle
 */
function collapse(linkEle) {
  const buttonEle = getButtonEle(linkEle);
  setButtonAttributes(buttonEle, false);
  linkEle.nextElementSibling?.remove();
}

document.documentElement.addEventListener(
  'click',
  event => {
    const target = /** @type Element */ (event.target);
    const toggleButtonEle = target.closest(
      `.${expandedClass}, .${collapsedClass}`,
    );
    if (toggleButtonEle) {
      event.stopPropagation();
      const shouldCollapse = toggleButtonEle.classList.contains(expandedClass);
      const toggleAll = event.metaKey || event.ctrlKey;
      const eles = toggleAll
        ? document.querySelectorAll(`.${linkClass}`)
        : [toggleButtonEle.nextElementSibling];
      for (const linkEle of eles) {
        if (shouldCollapse) {
          collapse(linkEle);
          continue;
        }

        // If we expand all, make sure the element is collapsed before trying to expand
        const isCollapsed =
          getButtonEle(linkEle)?.classList.contains(collapsedClass);
        if (isCollapsed) {
          expand(linkEle);
        }
      }
    }
  },
  { capture: true },
);

document.documentElement.addEventListener('pointerdown', event => {
  const target = /** @type Element */ (event.target);
  if (target.matches(`.${wrapperClass}`)) {
    target.setPointerCapture(event.pointerId);
  }
});

/** @type {MutationCallback} */
function mutationCallback(mutations) {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }

      embedFigmaLinks(/** @type Element */ (node));
    }
  }
}

chrome.storage.sync.get({ autoExpand, colorfulIcon }, items => {
  autoExpand = items.autoExpand;
  colorfulIcon = items.colorfulIcon;

  const observer = new MutationObserver(mutationCallback);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  embedFigmaLinks(document.documentElement);
});

chrome.storage.onChanged.addListener(items => {
  colorfulIcon = items.colorfulIcon.newValue;
  const buttonEles = document.querySelectorAll(
    `.${expandedClass}, .${collapsedClass}`,
  );
  for (const buttonEle of buttonEles) {
    setColorfulIcon(buttonEle);
  }
});
