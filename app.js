const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
$$('svg.icon').forEach(icon => {
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
});
const menu = $('.menu-toggle');
const mobileNav = $('#mobile-nav');
const mobileLayout = matchMedia('(max-width: 900px)');
function closeMenu() {
  mobileNav.hidden = true;
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Open navigation');
}
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  mobileNav.hidden = !open;
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
$$('#mobile-nav a').forEach(link => link.addEventListener('click', closeMenu));
mobileLayout.addEventListener('change', event => { if (!event.matches) closeMenu(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menu.focus(); }
});

// All data is illustrative and stays in this page's memory. No wallet/network API.
// Zingo-informed flow: privacy follows the destination and funds used.
// This demo models shielded spendable funds and two fictional address types.
const demoContacts = {Alex: {shielded: true}, Morgan: {shielded: false}};
const initialTransactions = [
  {label: 'Received', detail: 'Today, 10:42', cents: 12500, shielded: true},
  {label: 'Sent', detail: 'Yesterday, 16:08', cents: -4000, shielded: true},
  {label: 'Received', detail: 'Sep 10, 09:21', cents: 32000, shielded: true}
];
const allowedViews = ['overview', 'send', 'receive', 'activity'];
const money = cents => (cents / 100).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
let demo = {balanceCents: 248000, view: 'overview', transactions: initialTransactions.map(x => ({...x})), pending: null, publicView: 0};
function demoState() {
  return {demo: true, realFundsMoved: false, walletFoundation: 'Zingo', view: demo.view, balance: demo.balanceCents / 100, spendableBalance: demo.balanceCents / 100, currency: 'WEC', publicViewPercent: demo.publicView, pending: demo.pending ? {...demo.pending, amount: demo.pending.cents / 100} : null, activity: demo.transactions.map(x => ({label: x.label, amount: x.cents / 100, privacy: x.shielded ? 'shielded' : 'transparent', memo: x.memo || ''}))};
}
function navigateDemo(view, focus = false) {
  if (![...allowedViews, 'review', 'success'].includes(view)) throw new Error('Unknown demo view.');
  if (view === 'review' && !demo.pending) throw new Error('Stage a demo transfer first.');
  if (allowedViews.includes(view)) demo.pending = null;
  demo.view = view;
  $('#wallet-demo').dataset.view = view;
  $$('.demo-view').forEach(section => { section.hidden = section.id !== `demo-${view}`; });
  const activeView = view === 'review' || view === 'success' ? 'send' : view;
  $$('[data-demo-view]').forEach(button => {
    const active = button.dataset.demoView === activeView;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (focus) {
    const heading = $(`#demo-${view} h2`);
    if (heading) { heading.tabIndex = -1; heading.focus({preventScroll: true}); }
  }
  return demoState();
}
function renderDemo() {
  $('#demo-balance').textContent = money(demo.balanceCents);
  $('#note-spendable').textContent = `${money(demo.balanceCents)} WEC`;
  $('#send-available').textContent = `${money(demo.balanceCents)} WEC`;
  $('#demo-amount').max = (demo.balanceCents / 100).toFixed(2);
  const rows = $('#demo-activity-rows');
  rows.replaceChildren();
  for (const item of demo.transactions) {
    const row = document.createElement('div');
    row.className = 'demo-activity-row'; row.setAttribute('role', 'row');
    const identity = document.createElement('div'); identity.setAttribute('role', 'cell');
    const icon = document.createElement('span'); icon.className = 'activity-tx-icon';
    icon.innerHTML = `<svg class="icon ${item.cents > 0 ? 'receive-arrow' : ''}" aria-hidden="true"><use href="#i-diagonal"/></svg>`;
    const title = document.createElement('span'); title.append(document.createTextNode(item.label));
    const detail = document.createElement('small'); detail.textContent = item.detail; title.append(detail); identity.append(icon, title);
    if (item.memo) {
      const memo = document.createElement('small'); memo.className = 'activity-memo'; memo.textContent = `Memo: ${item.memo}`; title.append(memo);
    }
    const privacy = document.createElement('span'); privacy.className = 'activity-privacy'; privacy.setAttribute('role', 'cell'); privacy.textContent = item.shielded ? 'Shielded' : 'Transparent';
    const amount = document.createElement('span'); amount.className = 'activity-sum'; amount.setAttribute('role', 'cell'); amount.textContent = `${item.cents > 0 ? '+' : '−'} ${money(Math.abs(item.cents))}`;
    row.append(identity, privacy, amount); rows.append(row);
  }
}
function setPrivacyView(percent) {
  if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error('Privacy view must be from 0 to 100.');
  demo.publicView = Math.round(percent);
  $('#privacy-range').value = demo.publicView;
  $('#privacy-range').setAttribute('aria-valuetext', `${demo.publicView}% public view. Shielded payment details are concealed on-chain.`);
  $('#public-overlay').style.clipPath = `inset(0 0 0 ${100 - demo.publicView}%)`;
  $('#privacy-divider').style.left = `${100 - demo.publicView}%`;
  $('#privacy-divider').style.opacity = demo.publicView > 0 && demo.publicView < 100 ? '1' : '0';
  return demoState();
}
function updateRecipientPrivacy() {
  const shielded = demoContacts[$('#demo-recipient').value].shielded;
  $('#recipient-privacy').innerHTML = shielded ? 'Private<small>Shielded funds to a shielded recipient</small>' : 'Deshielded<small>Recipient address and amount will be public</small>';
  $('#recipient-privacy-icon').setAttribute('href', shielded ? '#i-shield' : '#i-eye');
  $('#demo-memo-field').hidden = !shielded;
  $('#demo-memo').disabled = !shielded;
  if (!shielded) $('#demo-memo').value = '';
}
function stageDemoTransfer({amount, recipient, shielded, memo = ''}) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) throw new Error('Enter an amount greater than zero.');
  const cents = Math.round(amount * 100);
  if (Math.abs(amount * 100 - cents) > 0.000001 || cents < 1) throw new Error('Use up to two decimal places in this demo.');
  if (cents > demo.balanceCents) throw new Error('That exceeds the available sample balance.');
  if (!['Alex', 'Morgan'].includes(recipient)) throw new Error('Choose one of the demo contacts.');
  const recipientShielded = demoContacts[recipient].shielded;
  if (shielded !== undefined && shielded !== recipientShielded) throw new Error('Privacy is determined by the recipient address: Alex is shielded; Morgan is transparent.');
  shielded = recipientShielded;
  if (typeof memo !== 'string' || Array.from(memo).length > 120) throw new Error('The demo memo must be text of up to 120 characters.');
  if (!shielded && memo.trim()) throw new Error('Encrypted memos require a shielded recipient.');
  memo = memo.trim();
  demo.pending = {cents, recipient, shielded, memo};
  $('#demo-amount').value = (cents / 100).toFixed(2);
  $('#demo-recipient').value = recipient;
  updateRecipientPrivacy();
  $('#demo-memo').value = memo;
  $('#review-recipient').textContent = `${recipient} · demo`;
  $('#review-amount').textContent = `${money(cents)} WEC`;
  $('#review-privacy').textContent = shielded ? 'Private' : 'Deshielded';
  $('#review-memo-row').hidden = !memo;
  $('#review-memo').textContent = memo;
  $('#demo-form-error').textContent = '';
  navigateDemo('review', true);
  return demoState();
}
function completeDemoTransfer() {
  if (!demo.pending || demo.view !== 'review') throw new Error('Stage and review a demo transfer before completing it.');
  const transfer = {...demo.pending};
  if (transfer.cents > demo.balanceCents) throw new Error('The sample balance is too low.');
  demo.balanceCents -= transfer.cents;
  demo.transactions.unshift({label: `To ${transfer.recipient}`, detail: 'Just now · simulated', cents: -transfer.cents, shielded: transfer.shielded, memo: transfer.memo});
  demo.pending = null;
  $('#success-description').textContent = `${money(transfer.cents)} WEC to ${transfer.recipient}, simulated.`;
  renderDemo(); navigateDemo('success', true);
  return demoState();
}
function resetDemo() {
  demo = {balanceCents: 248000, view: 'overview', transactions: initialTransactions.map(x => ({...x})), pending: null, publicView: 0};
  $('#demo-send-form').reset(); $('#demo-form-error').textContent = ''; $('#copy-feedback').textContent = '';
  updateRecipientPrivacy();
  renderDemo(); setPrivacyView(0); navigateDemo('overview');
  return demoState();
}
$$('[data-demo-view]').forEach(button => button.addEventListener('click', () => navigateDemo(button.dataset.demoView)));
$$('[data-go]').forEach(button => button.addEventListener('click', () => navigateDemo(button.dataset.go, true)));
$('#privacy-range').addEventListener('input', event => setPrivacyView(Number(event.target.value)));
$('#reset-demo').addEventListener('click', resetDemo);
$('#demo-recipient').addEventListener('change', updateRecipientPrivacy);
$('#demo-send-form').addEventListener('submit', event => {
  event.preventDefault();
  try { stageDemoTransfer({amount: Number($('#demo-amount').value), recipient: $('#demo-recipient').value, memo: $('#demo-memo').value}); }
  catch (error) { $('#demo-form-error').textContent = error.message; }
});
$('#confirm-demo-transfer').addEventListener('click', () => {
  try { completeDemoTransfer(); }
  catch (error) { navigateDemo('send', true); $('#demo-form-error').textContent = error.message; }
});
$('#copy-demo-address').addEventListener('click', async () => {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard not available');
    await navigator.clipboard.writeText('demo:wcash:shielded-wallet');
    $('#copy-feedback').textContent = 'Demo address copied. It cannot receive funds.';
  } catch { $('#copy-feedback').textContent = 'Select and copy the demo address shown above.'; }
});
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const note = $('#banknote');
note.addEventListener('pointermove', event => {
  if (!finePointer.matches || reducedMotion.matches) return;
  const r = note.getBoundingClientRect();
  note.style.setProperty('--ry', `${((event.clientX-r.left)/r.width-.5)*3}deg`);
  note.style.setProperty('--rx', `${(.5-(event.clientY-r.top)/r.height)*3}deg`);
});
note.addEventListener('pointerleave', () => { note.style.setProperty('--rx','0deg'); note.style.setProperty('--ry','0deg'); });
resetDemo();

const platforms = {
  ios: {
    name: 'iOS',
    icon: 'apple',
    status: 'DEVELOPER PREVIEW · NO INSTALLABLE RELEASE',
    description: 'TestFlight is not available. The published unsigned compile archive is not normally installable on an iPhone and is intentionally omitted from this download flow.',
    network: 'No installable release; source is configured for Wcash Mainnet',
    version: '2.0.23 (build 317 source)',
    architecture: 'iPhone ARM64 source target',
    signing: 'No signed iOS distribution; compile archive is unsigned',
    install: 'No consumer install method; build from source with Xcode',
    sourceSha: 'f136a09d7b49',
    sourceCommit: 'https://github.com/w-cash/wallet-mobile/commit/f136a09d7b4959ee800dcef6d4cb9a0b4b39b1da',
    sha256: 'Not applicable — no iOS download is offered',
    support: 'Unsupported; no App Store or TestFlight release',
    note: 'The release page retains unsigned compile and simulator archives for developers and history.',
    url: 'https://github.com/w-cash/wallet-mobile/blob/f136a09d7b4959ee800dcef6d4cb9a0b4b39b1da/docs/ios_developer_quickstart.md',
    action: 'View iOS build instructions',
    actionIcon: 'diagonal',
    source: 'https://github.com/w-cash/wallet-mobile',
    release: 'https://github.com/w-cash/wallet-mobile/releases/tag/wcash-2.0.23-317',
    manifest: 'https://github.com/w-cash/wallet-mobile/releases/download/wcash-2.0.23-317/MANIFEST.json',
    checksums: 'https://github.com/w-cash/wallet-mobile/releases/download/wcash-2.0.23-317/SHA256SUMS'
  },
  android: {
    name: 'Android',
    icon: 'android',
    status: 'DEVELOPER PREVIEW · UNSUPPORTED',
    description: 'Debug-signed engineering candidate for technical evaluation.',
    network: 'Wcash Mainnet · plaintext wallet service',
    version: '2.0.23 (build 317)',
    architecture: 'Android ARM64',
    signing: 'Public Android debug certificate; not release-signed',
    install: 'Sideload APK after explicitly allowing apps from this source',
    sourceSha: 'f136a09d7b49',
    sourceCommit: 'https://github.com/w-cash/wallet-mobile/commit/f136a09d7b4959ee800dcef6d4cb9a0b4b39b1da',
    sha256: 'ad41c67ed080d9a394bb80dacd653c195678144db261732fa967ab93d1b2fcc4',
    support: 'Unsupported developer candidate; do not use for material funds',
    note: 'Not a Play Store or controlled-testing release.',
    url: 'https://github.com/w-cash/wallet-mobile/releases/download/wcash-2.0.23-317/Wcash-Wallet-mainnet-2.0.23-317-f136a09d7b49-android-arm64-prodDebug.apk',
    action: 'Download unsupported candidate',
    actionIcon: 'download',
    source: 'https://github.com/w-cash/wallet-mobile',
    release: 'https://github.com/w-cash/wallet-mobile/releases/tag/wcash-2.0.23-317',
    manifest: 'https://github.com/w-cash/wallet-mobile/releases/download/wcash-2.0.23-317/MANIFEST.json',
    checksums: 'https://github.com/w-cash/wallet-mobile/releases/download/wcash-2.0.23-317/SHA256SUMS'
  },
  macos: {
    name: 'macOS',
    icon: 'apple',
    status: 'DEVELOPER PREVIEW · UNSUPPORTED',
    description: 'Unsigned engineering candidate for technical evaluation.',
    network: 'Wcash Mainnet · plaintext wallet service',
    version: '2.0.25 (build 181)',
    architecture: 'Apple silicon (ARM64)',
    signing: 'Unsigned; not notarized',
    install: 'Download ZIP, extract, then launch manually',
    sourceSha: '6687e56a30d5',
    sourceCommit: 'https://github.com/w-cash/wallet-desktop/commit/6687e56a30d5477f6e70375fda0666f966cd6118',
    sha256: 'cba78d82161afbe6b1748184a627b0a20e4bbd52ddfd65195780dc4cdd2df8e0',
    support: 'Unsupported developer candidate; do not use for material funds',
    note: 'macOS may block or warn about this unverified build.',
    url: 'https://github.com/w-cash/wallet-desktop/releases/download/wcash-desktop-2.0.25-181/Wcash-Wallet-MAINNET-UNSIGNED-2.0.25-181-mac-arm64.zip',
    action: 'Download unsupported candidate',
    actionIcon: 'download',
    source: 'https://github.com/w-cash/wallet-desktop',
    release: 'https://github.com/w-cash/wallet-desktop/releases/tag/wcash-desktop-2.0.25-181',
    manifest: 'https://github.com/w-cash/wallet-desktop/releases/download/wcash-desktop-2.0.25-181/MANIFEST.json',
    checksums: 'https://github.com/w-cash/wallet-desktop/releases/download/wcash-desktop-2.0.25-181/SHA256SUMS.txt'
  },
  windows: {
    name: 'Windows',
    icon: 'windows',
    status: 'DEVELOPER PREVIEW · UNSUPPORTED',
    description: 'Existing unsigned engineering candidate. No new Windows build is implied.',
    network: 'Wcash Mainnet · plaintext wallet service',
    version: '2.0.25 (build 181)',
    architecture: 'Windows x64 (ARM64 also listed in release notes)',
    signing: 'Unsigned; no Authenticode publisher signature',
    install: 'Download ZIP, extract, then launch manually; no signed installer',
    sourceSha: '6687e56a30d5',
    sourceCommit: 'https://github.com/w-cash/wallet-desktop/commit/6687e56a30d5477f6e70375fda0666f966cd6118',
    sha256: 'd9bb27dff359de5da58070a73c563b583592aac388b9b3715eb5bc637b5161b0',
    support: 'Unsupported developer candidate; do not use for material funds',
    note: 'Windows may warn about an unknown or unverified publisher.',
    url: 'https://github.com/w-cash/wallet-desktop/releases/download/wcash-desktop-2.0.25-181/Wcash-Wallet-MAINNET-UNSIGNED-2.0.25-181-win-x64.zip',
    action: 'Download unsupported candidate',
    actionIcon: 'download',
    source: 'https://github.com/w-cash/wallet-desktop',
    release: 'https://github.com/w-cash/wallet-desktop/releases/tag/wcash-desktop-2.0.25-181',
    manifest: 'https://github.com/w-cash/wallet-desktop/releases/download/wcash-desktop-2.0.25-181/MANIFEST.json',
    checksums: 'https://github.com/w-cash/wallet-desktop/releases/download/wcash-desktop-2.0.25-181/SHA256SUMS.txt'
  },
  linux: {
    name: 'Linux',
    icon: 'linux',
    status: 'DEVELOPER PREVIEW · UNSUPPORTED',
    description: 'Unsigned engineering candidate for technical evaluation.',
    network: 'Wcash Mainnet · plaintext wallet service',
    version: '2.0.25 (build 181)',
    architecture: 'Linux x86_64 AppImage (amd64 DEB also listed)',
    signing: 'Unsigned; no publisher signature',
    install: 'Download AppImage, mark it executable, then run manually',
    sourceSha: '6687e56a30d5',
    sourceCommit: 'https://github.com/w-cash/wallet-desktop/commit/6687e56a30d5477f6e70375fda0666f966cd6118',
    sha256: 'da2ee38b49933c6b1595478793da51d78e9e23991556dc85f39ebca740c2e405',
    support: 'Unsupported developer candidate; do not use for material funds',
    note: 'A separate unsigned amd64 Debian package is documented in the release manifest.',
    url: 'https://github.com/w-cash/wallet-desktop/releases/download/wcash-desktop-2.0.25-181/Wcash-Wallet-MAINNET-UNSIGNED-2.0.25-181-linux-x86_64.AppImage',
    action: 'Download unsupported candidate',
    actionIcon: 'download',
    source: 'https://github.com/w-cash/wallet-desktop',
    release: 'https://github.com/w-cash/wallet-desktop/releases/tag/wcash-desktop-2.0.25-181',
    manifest: 'https://github.com/w-cash/wallet-desktop/releases/download/wcash-desktop-2.0.25-181/MANIFEST.json',
    checksums: 'https://github.com/w-cash/wallet-desktop/releases/download/wcash-desktop-2.0.25-181/SHA256SUMS.txt'
  }
};
const platformTabs = $$('[data-platform]');
const narrowLayout = matchMedia('(max-width: 700px)');
function updateTabOrientation() { $('.platform-picker').setAttribute('aria-orientation', narrowLayout.matches ? 'horizontal' : 'vertical'); }
updateTabOrientation(); narrowLayout.addEventListener('change', updateTabOrientation);
function selectPlatform(key, focus = false) {
  const platform = platforms[key]; if (!platform) return;
  platformTabs.forEach(tab => {
    const selected = tab.dataset.platform === key;
    tab.classList.toggle('selected',selected); tab.setAttribute('aria-selected',String(selected)); tab.tabIndex=selected?0:-1;
    if (selected && focus) tab.focus();
  });
  $('#platform-panel').setAttribute('aria-labelledby',`tab-${key}`);
  $('#platform-status').textContent=platform.status;
  $('#platform-title').textContent=`${platform.name} developer preview`;
  $('#platform-description').textContent=platform.description;
  $('#platform-network').textContent=platform.network;
  $('#platform-version').textContent=platform.version;
  $('#platform-architecture').textContent=platform.architecture;
  $('#platform-signing').textContent=platform.signing;
  $('#platform-install').textContent=platform.install;
  $('#platform-source-commit').href=platform.sourceCommit;
  $('#platform-source-commit code').textContent=platform.sourceSha;
  $('#platform-sha256').textContent=platform.sha256;
  $('#platform-support').textContent=platform.support;
  $('#platform-download-note').textContent=platform.note;
  $('#selected-platform-symbol').setAttribute('href',`#i-${platform.icon}`);
  $('#platform-download').href=platform.url;
  $('#platform-download span').textContent=platform.action;
  $('#platform-download use').setAttribute('href',`#i-${platform.actionIcon}`);
  $('#platform-download').classList.toggle('build-instructions',key==='ios');
  $('#platform-source').href=platform.source;
  $('#platform-release').href=platform.release;
  $('#platform-manifest').href=platform.manifest;
  $('#platform-checksums').href=platform.checksums;
}
platformTabs.forEach((tab,index) => {
  tab.addEventListener('click',()=>selectPlatform(tab.dataset.platform));
  tab.addEventListener('keydown',event=>{
    let next;
    if(event.key===(narrowLayout.matches?'ArrowRight':'ArrowDown'))next=(index+1)%platformTabs.length;
    if(event.key===(narrowLayout.matches?'ArrowLeft':'ArrowUp'))next=(index-1+platformTabs.length)%platformTabs.length;
    if(event.key==='Home')next=0;if(event.key==='End')next=platformTabs.length-1;
    if(next!==undefined){event.preventDefault();selectPlatform(platformTabs[next].dataset.platform,true);}
  });
});
const device=navigator.userAgent;
if(/iPad|iPhone|iPod/.test(device)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))selectPlatform('ios');
else if(/Android/.test(device))selectPlatform('android');
else if(/Windows/.test(device))selectPlatform('windows');
else if(/Linux/.test(device))selectPlatform('linux');

// Optional agent surface: the same strictly simulated actions as the visible demo.
const context=document.modelContext;
if(context?.registerTool){
 const lifecycle=new AbortController();
 const tools=[
  {name:'get_wallet_demo',title:'Read wallet demo',description:'Read the illustrative Wcash wallet state. It contains sample funds only and has no blockchain connection.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>demoState()},
  {name:'navigate_wallet_demo',title:'Explore wallet demo',description:'Open a wallet demo view. Does not move any real or simulated funds.',inputSchema:{type:'object',properties:{view:{type:'string',enum:allowedViews}},required:['view'],additionalProperties:false},execute:input=>{if(!input||!allowedViews.includes(input.view))throw new Error('Choose overview, send, receive or activity.');return navigateDemo(input.view);}},
  {name:'stage_demo_transfer',title:'Review a simulated transfer',description:'Review a simulated transfer. Alex is a shielded recipient; Morgan is transparent. Privacy follows the recipient address. Optional memos work only with Alex. Does not send real funds or complete the simulation.',inputSchema:{type:'object',properties:{amount:{type:'number',minimum:0.01},recipient:{type:'string',enum:['Alex','Morgan']},shielded:{type:'boolean',description:'Optional assertion of the derived address privacy, not a privacy toggle.'},memo:{type:'string',maxLength:120}},required:['amount','recipient'],additionalProperties:false},execute:input=>{if(!input||typeof input!=='object')throw new Error('Transfer input is required.');return stageDemoTransfer(input);}},
  {name:'complete_demo_transfer',title:'Complete simulated transfer',description:'Complete the currently reviewed simulation, reducing sample balance and updating sample activity. No real money is moved.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:()=>completeDemoTransfer()},
  {name:'reset_wallet_demo',title:'Reset wallet demo',description:'Restore the original sample balance and activity and return to the overview. Affects this demo only.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:()=>resetDemo()}
 ];
 for(const tool of tools){try{Promise.resolve(context.registerTool({...tool,annotations:{readOnlyHint:false,untrustedContentHint:false,...tool.annotations}},{signal:lifecycle.signal})).catch(()=>{});}catch{}}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
