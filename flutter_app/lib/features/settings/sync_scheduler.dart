import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import '../clients/client_repository.dart';
import '../projects/project_repository.dart';
import 'sync_service.dart';

class SyncScheduler {
  SyncScheduler._();
  static final SyncScheduler instance = SyncScheduler._();
  static const _key = 'brujula.flutter.autoSync';
  final _sync = SyncService();
  final _clients = ClientRepository();
  final _projects = ProjectRepository();
  Timer? _timer;
  bool _running = false;
  bool enabled = false;

  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    enabled = prefs.getBool(_key) ?? false;
    _refreshTimer();
  }
  Future<void> setEnabled(bool value) async {
    enabled = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_key, value);
    _refreshTimer();
    if (enabled) await synchronize();
  }
  void _refreshTimer() {
    _timer?.cancel();
    if (enabled) _timer = Timer.periodic(const Duration(minutes: 5), (_) => synchronize());
  }
  Future<void> synchronize() async {
    if (!enabled || _running) return;
    final hasSession = await _sync.signedIn;
    if (!hasSession) return;
    _running = true;
    try {
      final result = await _sync.syncData(await _clients.load(), await _projects.load(), deletedClients: await _clients.deletedIds(), deletedProjects: await _projects.deletedIds());
      await _clients.save(result.clients);
      await _projects.save(result.projects);
      await _clients.saveDeletedIds(result.deletedClients);
      await _projects.saveDeletedIds(result.deletedProjects);
    } catch (_) {
      // Conserva la base local y vuelve a intentar en el próximo intervalo.
    } finally { _running = false; }
  }
  void dispose() { _timer?.cancel(); }
}
