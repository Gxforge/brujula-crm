import { $, $$, showToast } from './core/utils.js';
import { store } from './core/store.js';
import { CUBA_SEED_PROSPECTS } from './data/seed-cuba.js';
import { exportClientsCSV, exportClientsXLSX, exportFullBackupJSON } from './services/exporter.js';
import { renderDashboard } from './ui/dashboard-view.js';
import { ClientsView } from './ui/clients-view.js';
import { ImportView } from './ui/import-view.js';
import { ModalsView } from './ui/modals-view.js';

const PAGE_TITLES = {
  dashboard: 'Resumen comercial',
  clients: 'Clientes y prospectos',
  import: 'Centro de importación',
  settings: 'Ajustes y respaldo'
};

function goto(page) {
  $$('.page').forEach((el) => el.classList.toggle('active', el.id === `page-${page}`));
  $$('.nav button[data-page]').forEach((btn) => btn.classList.toggle('active', btn.dataset.page === page));
  const crumb = $('#crumb');
  if (crumb) crumb.textContent = PAGE_TITLES[page] || 'Resumen';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadCubaSeed() {
  const { added, updated } = store.importBatch(CUBA_SEED_PROSPECTS, 'Investigación Cuba (16 regiones)');
  showToast('Base de Cuba cargada', `${added} negocios añadidos · ${updated} actualizados`);
  goto('clients');
}

function renderSidebarCounters() {
  const n = store.clients.length;
  $('#sideCount').textContent = n;
  $('#storageText').textContent = `${n} cliente${n === 1 ? '' : 's'}`;
  $('#storageBar').style.width = `${Math.min(100, Math.max(8, n * 1.5))}%`;
  const undoBtn = $('#undoBtn');
  if (undoBtn) undoBtn.style.display = store.lastSnapshot ? 'inline-flex' : 'none';
}

function init() {
  // Fecha actual en cabecera
  const d = new Date();
  const dateText = d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  if ($('#today')) {
    $('#today').textContent = dateText.charAt(0).toUpperCase() + dateText.slice(1);
  }

  const modals = new ModalsView(store);

  const sharedHandlers = {
    goto,
    loadCubaSeed,
    openForm: (client = null) => modals.openForm(client),
    openDetail: (id) => modals.openDetail(id),
    filterByProvince: (prov) => {
      goto('clients');
      clientsView.setProvinceFilter(prov);
    }
  };

  const clientsView = new ClientsView(store, sharedHandlers);
  // Inicializa el centro de importación
  new ImportView(store, sharedHandlers);

  const refreshAll = () => {
    renderSidebarCounters();
    renderDashboard(store, sharedHandlers);
    clientsView.render();
  };

  store.subscribe(refreshAll);
  refreshAll();

  // Navegación principal
  $$('.nav button[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => goto(btn.dataset.page));
  });

  $('#headerImportBtn')?.addEventListener('click', () => goto('import'));
  $('#newClientBtn')?.addEventListener('click', () => modals.openForm());
  $('#newClientBtn2')?.addEventListener('click', () => modals.openForm());
  $('#viewClientsBtn')?.addEventListener('click', () => goto('clients'));
  $('#seedBannerBtn')?.addEventListener('click', loadCubaSeed);
  $('#seedSettingsBtn')?.addEventListener('click', loadCubaSeed);

  $('#undoBtn')?.addEventListener('click', () => {
    if (store.undoLast()) {
      showToast('Cambio deshecho', 'Se restauró el estado anterior.');
    }
  });

  // Exportaciones
  const ensureClients = () => {
    if (!store.clients.length) {
      showToast('Base vacía', 'Importa o añade clientes antes de exportar.', true);
      return false;
    }
    return true;
  };

  $('#exportXlsxBtn')?.addEventListener('click', () => {
    if (ensureClients()) {
      exportClientsXLSX(store.clients);
      showToast('Excel generado', 'Se descargó tu archivo .xlsx compatible con Excel.');
    }
  });

  $('#exportCsvBtn')?.addEventListener('click', () => {
    if (ensureClients()) {
      exportClientsCSV(store.clients);
      showToast('CSV generado', 'Se descargó tu respaldo en formato CSV.');
    }
  });

  $('#exportXlsxSettingsBtn')?.addEventListener('click', () => {
    if (ensureClients()) exportClientsXLSX(store.clients);
  });

  $('#exportJsonSettingsBtn')?.addEventListener('click', () => {
    exportFullBackupJSON(store);
    showToast('Respaldo JSON listo', 'Incluye clientes, historial y plantillas.');
  });

  $('#clearAllBtn')?.addEventListener('click', () => {
    if (!store.clients.length) return;
    if (confirm('¿Vaciar todos los clientes guardados en este navegador? Puedes usar "Deshacer" justo después si te equivocas.')) {
      store.clearAll();
      showToast('Base vaciada', 'Todos los contactos fueron eliminados.');
    }
  });
}

init();
