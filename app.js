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
    description: 'Your private money, always close. Made for iPhone.',
    note: 'Unsigned ARM64 device compile archive. Not an App Store or TestFlight build.',
    url: 'https://github.com/w-cash/wallet-mobile/releases/download/wcash-2.0.23-317/Wcash-Wallet-mainnet-2.0.23-317-f136a09d7b49-ios-arm64-device-compile-unsigned.zip'
  },
  android: {
    name: 'Android',
    icon: 'android',
    description: 'Your Wcash, in your pocket. Made for Android.',
    note: 'ARM64 prerelease signed with the public Android debug certificate.',
    url: 'https://github.com/w-cash/wallet-mobile/releases/download/wcash-2.0.23-317/Wcash-Wallet-mainnet-2.0.23-317-f136a09d7b49-android-arm64-prodDebug.apk'
  },
  macos: {
    name: 'macOS',
    icon: 'apple',
    description: 'A little more privacy for your everyday desktop.',
    note: 'Unsigned ARM64 prerelease. macOS may show an unverified-developer warning.',
    url: 'https://github.com/w-cash/wallet-desktop/releases/download/wcash-desktop-2.0.25-181/Wcash-Wallet-MAINNET-UNSIGNED-2.0.25-181-mac-arm64.zip'
  },
  windows: {
    name: 'Windows',
    icon: 'windows',
    description: 'A clear view of your Wcash. Made for your PC.',
    note: 'Unsigned x64 prerelease. An ARM64 package is available on GitHub.',
    url: 'https://github.com/w-cash/wallet-desktop/releases/download/wcash-desktop-2.0.25-181/Wcash-Wallet-MAINNET-UNSIGNED-2.0.25-181-win-x64.zip'
  },
  linux: {
    name: 'Linux',
    icon: 'linux',
    description: 'Your system. Your wallet. A home for Wcash on Linux.',
    note: 'Unsigned x86_64 AppImage prerelease. A Debian package is available on GitHub.',
    url: 'https://github.com/w-cash/wallet-desktop/releases/download/wcash-desktop-2.0.25-181/Wcash-Wallet-MAINNET-UNSIGNED-2.0.25-181-linux-x86_64.AppImage'
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
  $('#platform-title').textContent=`Wcash for ${platform.name}`;
  $('#platform-description').textContent=platform.description;
  $('#platform-download-note').textContent=platform.note;
  $('#selected-platform-symbol').setAttribute('href',`#i-${platform.icon}`);
  $('#platform-download').href=platform.url;
  $('#platform-download span').textContent=`Download for ${platform.name}`;
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
