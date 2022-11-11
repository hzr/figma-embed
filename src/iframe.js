// @ts-check

/**
 * @param {string} url
 */
function createIframeEle(url) {
  const iframeEle = document.createElement('iframe');
  iframeEle.src = `https://www.figma.com/embed?embed_host=figma-embed-extension&url=${url}`;
  iframeEle.title = 'Figma file';
  iframeEle.allowFullscreen = true;
  iframeEle.loading = 'lazy';
  return iframeEle;
}

const url = new URLSearchParams(window.location.search).get('figmaurl');
document.body.append(createIframeEle(url));
