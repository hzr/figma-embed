// @ts-check

/**
 * @param {string} url
 */
function createIframeEle(url) {
  const iframeEle = document.createElement('iframe');
  const embedUrl = new URL(url);
  embedUrl.hostname = 'embed.figma.com';
  embedUrl.searchParams.set('embed-host', 'figma-embed-extension');
  embedUrl.searchParams.set('footer', 'false');
  iframeEle.src = embedUrl.href;
  iframeEle.title = 'Figma file';
  iframeEle.allowFullscreen = true;
  iframeEle.loading = 'lazy';
  return iframeEle;
}

const url = new URLSearchParams(window.location.search).get('figmaurl');
document.body.append(createIframeEle(url));
