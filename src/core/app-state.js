import { DEFAULT_RATES, ADDON_CATALOG } from '../data/finance.js';
const KEYS = {
  rates: 'brujula-rates-v1',
  team: 'brujula-team-v1',
  demos: 'brujula-demos-v1',
  profile: 'brujula-profile-v1',
  goals: 'brujula-goals-v1',
  theme: 'brujula-theme-v1',
  snaps: 'brujula-snaps-v1',
  notif: 'brujula-notif-v1',
  sync: 'brujula-sync-v1'
};
class AppState {
  constructor() {
    this.rates = this.load(KEYS.rates, { ...DEFAULT_RATES });
    this.team = this.load(KEYS.team, []);
    this.demos = this.load(KEYS.demos, { Gastronomía: 'https://ejemplo.com/demo/resto', 'Ropa/Boutique': 'https://ejemplo.com/demo/boutique', 'Celulares/Taller': 'https://ejemplo.com/demo/celulares', Dulcería: 'https://ejemplo.com/demo/dulce', default: 'https://ejemplo.com/demo/general' });
    this.profile = this.load(KEYS.profile, { businessName: 'Brújula CRM', portfolioUrl: 'https://ejemplo.com/portfolio', phone: '' });
    this.goals = this.load(KEYS.goals, { monthlyTarget: 500, currency: 'USD', dailyTarget: 10, streak: 0, lastActive: '' });
    this.theme = this.load(KEYS.theme, 'light');
    this.snaps = this.load(KEYS.snaps, []);
    this.notif = this.load(KEYS.notif, { enabled: false });
    this.sync = this.load(KEYS.sync, { endpoint: '', token: '', lastSync: '', enabled: false });
    this.listeners = new Set();
    this.applyTheme();
  }
  load(k, fb) { try { if (typeof localStorage === 'undefined') return fb; const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? fb; } catch { return fb; } }
  save(k, v) { if (typeof localStorage !== 'undefined') localStorage.setItem(k, JSON.stringify(v)); this.notify(); }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach((fn) => fn(this)); }
  setRates(r) { this.rates = { ...this.rates, ...r }; this.save(KEYS.rates, this.rates); }
  setTeam(t) { this.team = t; this.save(KEYS.team, this.team); }
  setDemos(d) { this.demos = { ...this.demos, ...d }; this.save(KEYS.demos, this.demos); }
  setProfile(p) { this.profile = { ...this.profile, ...p }; this.save(KEYS.profile, this.profile); }
  setGoals(g) { this.goals = { ...this.goals, ...g }; this.save(KEYS.goals, this.goals); }
  setTheme(th) { this.theme = th; this.save(KEYS.theme, th); this.applyTheme(); }
  applyTheme() { if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', this.theme); }
  isNode() { return typeof document === 'undefined'; }
  pushSnap(data) {
    const snap = { id: Date.now().toString(36), at: new Date().toISOString(), data: JSON.parse(JSON.stringify(data)) };
    this.snaps.unshift(snap); if (this.snaps.length > 5) this.snaps.length = 5; this.save(KEYS.snaps, this.snaps);
  }
  restoreSnap(id) { const s = this.snaps.find((x) => x.id === id); return s ? s.data : null; }
  setNotif(en) { this.notif.enabled = en; this.save(KEYS.notif, this.notif); }
  setSync(cfg) { this.sync = { ...this.sync, ...cfg }; this.save(KEYS.sync, this.sync); }
}
export const appState = new AppState();
