import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import '../clients/client_record.dart';
import '../projects/project_record.dart';

class SyncService {
  static const endpoint = 'https://brujula-crm-sync.brujulacrm6207.workers.dev';
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'sync_token';
  static const _emailKey = 'sync_email';
  Future<String?> get email => _storage.read(key: _emailKey);
  Future<bool> get signedIn async => (await _storage.read(key: _tokenKey)) != null;
  Future<void> _saveSession(Map<String, dynamic> data) async {
    await _storage.write(key: _tokenKey, value: data['token'] as String);
    await _storage.write(key: _emailKey, value: data['account']['email'] as String);
  }
  Future<void> authenticate(String email, String password, {required bool createAccount}) async {
    final response = await http.post(Uri.parse('$endpoint/auth/${createAccount ? 'register' : 'login'}'), headers: {'Content-Type': 'application/json'}, body: jsonEncode({'email': email.trim(), 'password': password})).timeout(const Duration(seconds: 25));
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) throw Exception(data['error'] ?? 'No se pudo iniciar sesión.');
    await _saveSession(data);
  }
  Future<void> signOut() async {
    final token = await _storage.read(key: _tokenKey);
    if (token != null) { try { await http.post(Uri.parse('$endpoint/auth/logout'), headers: {'Authorization': 'Bearer $token'}).timeout(const Duration(seconds: 10)); } catch (_) {} }
    await _storage.delete(key: _tokenKey); await _storage.delete(key: _emailKey);
  }
  Future<({List<ClientRecord> clients, List<ProjectRecord> projects, Set<String> deletedClients, Set<String> deletedProjects})> syncData(List<ClientRecord> local, List<ProjectRecord> localProjects, {Set<String> deletedClients = const {}, Set<String> deletedProjects = const {}}) async {
    final token = await _storage.read(key: _tokenKey);
    if (token == null) throw Exception('Inicia sesión primero.');
    final headers = {'Authorization': 'Bearer $token', 'Content-Type': 'application/json', 'X-Device-Id': 'brujula-flutter'};
    final get = await http.get(Uri.parse('$endpoint/sync'), headers: headers).timeout(const Duration(seconds: 25));
    final remoteData = jsonDecode(get.body) as Map<String, dynamic>;
    if (get.statusCode < 200 || get.statusCode >= 300) throw Exception(remoteData['error'] ?? 'No se pudieron descargar los datos.');
    final remote = (remoteData['clients'] as List? ?? []).map((e) => ClientRecord.fromJson(Map<String, dynamic>.from(e as Map))).toList();
    final remoteProjects = (remoteData['projects'] as List? ?? []).map((e) => ProjectRecord.fromJson(Map<String, dynamic>.from(e as Map))).toList();
    final deletedClientIds = {...deletedClients, ...List<String>.from(remoteData['deletedClientIds'] as List? ?? [])};
    final deletedProjectIds = {...deletedProjects, ...List<String>.from(remoteData['deletedProjectIds'] as List? ?? [])};
    final merged = _merge<ClientRecord>(local, remote, (x) => x.id, (x) => x.updatedAt).where((x) => !deletedClientIds.contains(x.id)).toList();
    final mergedProjects = _merge<ProjectRecord>(localProjects, remoteProjects, (x) => x.id, (x) => x.updatedAt).where((x) => !deletedProjectIds.contains(x.id)).toList();
    final all = merged;
    final put = await http.post(Uri.parse('$endpoint/sync'), headers: headers, body: jsonEncode({'clients': all.map((c) => c.toJson()).toList(), 'projects': mergedProjects.map((p) => p.toJson()).toList(), 'deletedClientIds': deletedClientIds.toList(), 'deletedProjectIds': deletedProjectIds.toList(), 'services': []})).timeout(const Duration(seconds: 25));
    final putData = jsonDecode(put.body) as Map<String, dynamic>;
    if (put.statusCode < 200 || put.statusCode >= 300) throw Exception(putData['error'] ?? 'No se pudieron subir los datos.');
    return (clients: all, projects: mergedProjects, deletedClients: deletedClientIds, deletedProjects: deletedProjectIds);
  }
  List<T> _merge<T>(List<T> local, List<T> remote, String Function(T) id, String Function(T) updatedAt) {
    final result = <String, T>{for (final item in local) id(item): item};
    for (final item in remote) {
      final previous = result[id(item)];
      final incomingDate = DateTime.tryParse(updatedAt(item)) ?? DateTime.fromMillisecondsSinceEpoch(0);
      final previousDate = DateTime.tryParse(previous == null ? '' : updatedAt(previous)) ?? DateTime.fromMillisecondsSinceEpoch(0);
      if (previous == null || incomingDate.isAfter(previousDate)) result[id(item)] = item;
    }
    return result.values.toList();
  }
}
