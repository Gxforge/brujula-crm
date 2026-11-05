import { Window } from 'happy-dom';
import fs from 'node:fs';

const window = new Window({ url: 'app://brujula/index.html' });
window.document.write(fs.readFileSync('index.html', 'utf8'));
Object.assign(globalThis, {
  window, document: window.document, localStorage: window.localStorage,
  location: window.location, history: window.history, navigator: window.navigator,
  confirm: () => true, alert: () => {}, requestAnimationFrame: (fn) => setTimeout(fn, 0)
});
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
const errors = [];
window.addEventListener('error', (event) => errors.push(String(event.error || event.message)));
window.addEventListener('unhandledrejection', (event) => errors.push(String(event.reason)));
const checks = [];
const check = (name, ok) => { checks.push([name, Boolean(ok)]); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };

try {
  await import('../src/main.js?pc-smoke');
  await new Promise((resolve) => setTimeout(resolve, 250));
  check('emojis visibles sustituidos por SVG propios', window.document.querySelectorAll('.crm-icon svg.ui-icon').length > 0 && !/\p{Extended_Pictographic}/u.test(window.document.body.innerText));
  for (const page of ['dashboard', 'clients', 'projects', 'import', 'settings']) {
    window.document.querySelector(`[data-page="${page}"]`).click();
    check(`navegación ${page}`, window.document.getElementById(`page-${page}`).classList.contains('active'));
  }
  window.document.getElementById('newClientBtn').click();
  check('abre formulario cliente', window.document.getElementById('formLayer').classList.contains('open'));
  window.document.getElementById('fName').value = 'Prueba automatizada';
  window.document.getElementById('fPhone').value = '+12065550100';
  window.document.getElementById('clientForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 100));
  check('guarda cliente y actualiza contador', window.document.getElementById('sideCount').textContent === '1');
  check('persiste el cliente en almacenamiento local', [...Array(window.localStorage.length)].some((_, i) => window.localStorage.getItem(window.localStorage.key(i))?.includes('Prueba automatizada')));
  await new Promise((resolve) => setTimeout(resolve, 300));
  check('Ajustes muestra registro e inicio de sesión para sincronizar', Boolean(window.document.getElementById('syncAuth')) && Boolean(window.document.getElementById('syncMode')) && Boolean(window.document.getElementById('syncEmail')) && Boolean(window.document.getElementById('syncPassword')) && !window.document.body.innerText.includes('Cloudflare D1'));
  const teamName = window.document.getElementById('teamName'); teamName.value = 'Sigo escribiendo'; teamName.focus();
  const { appState } = await import('../src/core/app-state.js'); appState.setSync({ enabled: !appState.sync.enabled });
  await new Promise((resolve) => setTimeout(resolve, 30));
  check('no pierde foco ni el valor al actualizar estado', window.document.activeElement.id === 'teamName' && teamName.value === 'Sigo escribiendo');
  check('M18 y formulario público ocultos', !window.document.body.innerText.includes('M18') && !window.document.body.innerText.includes('Formulario captador'));
  check('sin errores de ejecución', errors.length === 0);
} catch (error) {
  errors.push(error.stack || String(error));
  console.error(error);
}
if (errors.length) console.error('Errores:', errors.join('\n'));
window.happyDOM.abort();
process.exit(checks.every(([, ok]) => ok) && errors.length === 0 ? 0 : 1);
