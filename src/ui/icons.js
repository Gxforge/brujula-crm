const PATHS = {
  bolt: '<path d="m13 2-3 8h7l-6 12 2-9H6l7-11Z"/>', money: '<circle cx="12" cy="12" r="9"/><path d="M16 8.5c-.6-.7-1.5-1-2.7-1-1.5 0-2.5.8-2.5 1.9 0 3 5.2 1.2 5.2 4.4 0 1.2-1.1 2.1-2.8 2.1-1.2 0-2.3-.4-3-1.2M12 5.5v13"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>', rocket: '<path d="M5 15c-2 1-3 3-3 6 3 0 5-1 6-3M14 10l-4 4"/><path d="M8 13C9 7 15 3 21 3c0 6-4 12-10 13l-3-3Z"/><circle cx="15.5" cy="8.5" r="1"/>',
  chart: '<path d="M4 19V5M4 19h17M7 15l4-4 3 2 6-7"/><path d="M16 6h4v4"/>', down: '<path d="M4 5v14h16M7 9l4 4 3-3 5 6"/>', table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11m6-11v11"/>',
  board: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/>', box: '<path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z"/><path d="m3 7 9 4 9-4M12 11v10"/>', layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/>', link: '<path d="M10 13a5 5 0 0 0 7 .2l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7-.2l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>', download: '<path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/>', upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 20h16"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.5-3.3 1.5 1.5 0 0 1 1.2-2.5H18a3 3 0 0 0 3-3c0-5.1-4-9.2-9-9.2Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="15" cy="8" r="1"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>', warning: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3h.01"/>', calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', document: '<path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v6h5M9 13h6m-6 4h6"/>', receipt: '<path d="M5 3 7 4.5 9 3l3 1.5L15 3l2 1.5L19 3v18l-2-1.5-2 1.5-3-1.5L9 21l-2-1.5L5 21V3Z"/><path d="M8 9h8m-8 4h8m-8 4h5"/>',
  wallet: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 8h15a3 3 0 0 1 3 3v2h-5a2 2 0 0 0 0 4h5M17 15h.01M7 5V3h10v2"/>', puzzle: '<path d="M4 4h5a2 2 0 1 1 4 0h5v5a2 2 0 1 1 0 4v5h-5a2 2 0 1 0-4 0H4v-5a2 2 0 1 1 0-4V4Z"/>', flame: '<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-2 4-2 5-2-2-3-4-3-7-4 4-6 8-6 12a8 8 0 0 0 8 7Z"/><path d="M12 22a4 4 0 0 0 4-4c0-2-2-3-3-5-2 2-4 3-4 5a3 3 0 0 0 3 4Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', moon: '<path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z"/>', contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18Z"/>', camera: '<path d="M3 7h4l2-3h6l2 3h4v13H3V7Z"/><circle cx="12" cy="13" r="4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', users: '<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-7a4 4 0 0 1 0 8m2 4a4 4 0 0 1 3 4v1"/>', medal: '<circle cx="12" cy="8" r="5"/><path d="m8 12-2 9 6-3 6 3-2-9"/>', robot: '<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4m-4 6h.01M16 13h.01M9 17h6M2 12h2m16 0h2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>', location: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>', cloud: '<path d="M6 18h12a4 4 0 0 0 0-8h-1a6 6 0 0 0-11-1 4.5 4.5 0 0 0 0 9Z"/>', check: '<path d="m5 12 4 4L19 6"/>', spark: '<path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z"/>',
  cold: '<path d="M12 2v20m-8.7-15 17.4 10m0-10L3.3 17m5.2-13 3.5 2 3.5-2m-7 17 3.5-2 3.5 2"/>', warm: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2"/>', hot: '<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-2 4-2 5-2-2-3-4-3-7-4 4-6 8-6 12a8 8 0 0 0 8 7Z"/>', phone: '<path d="M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2C10 21 3 14 3 5a2 2 0 0 1 2-2Z"/>',
  note: '<path d="M5 3h14v18H5zM8 8h8m-8 4h8m-8 4h5"/>', diamond: '<path d="M3 8 6 4h12l3 4-9 12L3 8Z"/><path d="M3 8h18M6 4l3 4 3 12 3-12 3-4"/>', lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>', handshake: '<path d="m3 12 4-4 4 1 2-1 5 3-7 7-4-3-2 1-2-4Zm4-4 2-3 5 1 3 3M11 9l3 3m-5 1 3 3"/>',
  unknown: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1.2 1-1.7 1.4-1.7 3M12 17h.01"/>'
};

const EMOJI = {
  '⚡':'bolt','💰':'money','💵':'money','💳':'wallet','💲':'money','🔔':'bell','🚀':'rocket','📊':'chart','📈':'chart','📉':'down','📦':'box','🗂️':'layers','🗂':'layers','🎙️':'mic','🎙':'mic','🎨':'palette','👀':'eye','🔗':'link','📥':'download','⬇️':'download','⬇':'download','⬆️':'upload','⬆':'upload','🔄':'refresh','⏱':'clock','⏱️':'clock','📅':'calendar','📆':'calendar','📄':'document','🧾':'receipt','📜':'document','💎':'diamond','🧩':'puzzle','🔥':'flame','☀️':'sun','☀':'sun','🌙':'moon','🔆':'contrast','📸':'camera','🎯':'target','👥':'users','🏆':'medal','🤖':'robot','🔍':'search','📍':'location','✅':'check','⚠️':'warning','⚠':'warning','🔐':'lock','🔒':'lock','💬':'unknown','📞':'phone','🤝':'handshake','📝':'note','🏭':'layers','⭐':'spark','❄️':'cold','❄':'cold','🌤️':'warm','🌤':'warm','🌟':'spark','🛠️':'unknown','🛠':'unknown','🎁':'box','🛒':'box','➕':'spark','➖':'unknown','🧮':'chart','🪙':'money','🗃️':'layers','🗃':'layers','🗓️':'calendar','🗓':'calendar'
};

export function I(name, size = 16) {
  return `<svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || PATHS.unknown}</svg>`;
}

const emojiRE = /\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*/gu;
function replaceText(node) {
  const parent = node.parentElement;
  if (!parent || parent.closest('script,style,textarea,pre,code,.ui-icon')) return;
  const tag = parent.tagName;
  if (tag === 'OPTION' || tag === 'TITLE') {
    node.textContent = node.textContent.replace(emojiRE, '');
    return;
  }
  const text = node.textContent;
  if (!emojiRE.test(text)) { emojiRE.lastIndex = 0; return; }
  emojiRE.lastIndex = 0;
  const frag = document.createDocumentFragment();
  let last = 0;
  for (const match of text.matchAll(emojiRE)) {
    frag.append(document.createTextNode(text.slice(last, match.index)));
    const span = document.createElement('span');
    span.className = 'crm-icon'; span.setAttribute('aria-hidden', 'true');
    span.innerHTML = I(EMOJI[match[0]] || 'unknown', 16);
    frag.append(span); last = match.index + match[0].length;
  }
  frag.append(document.createTextNode(text.slice(last)));
  node.replaceWith(frag);
}

export function installNativeIcons(root = document.body) {
  if (!root) return;
  const scan = (node) => {
    const walker = document.createTreeWalker(node, document.defaultView?.NodeFilter?.SHOW_TEXT || 4);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(replaceText);
  };
  scan(root);
  const Observer = document.defaultView?.MutationObserver || globalThis.MutationObserver;
  if (!Observer) return null;
  const observer = new Observer((records) => records.forEach((record) => {
    record.addedNodes.forEach((node) => {
      if (node.nodeType === 3) replaceText(node);
      else if (node.nodeType === 1 && !node.matches('.crm-icon,svg')) scan(node);
    });
  }));
  observer.observe(root, { subtree: true, childList: true });
  return observer;
}
