// @ts-check

const form = document.forms[0];
const { autoExpand, colorfulIcon } = await chrome.storage.sync.get({
  autoExpand: true,
  colorfulIcon: true,
});
form.elements['autoExpand'].checked = autoExpand;
form.elements['colorfulIcon'].checked = colorfulIcon;
form.addEventListener('submit', async event => {
  event.preventDefault();
  await chrome.storage.sync.set({
    autoExpand: form.elements['autoExpand'].checked,
    colorfulIcon: form.elements['colorfulIcon'].checked,
  });
  window.close();
});

export {};
