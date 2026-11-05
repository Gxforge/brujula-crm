import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'client_record.dart';

class ClientRepository {
  static const _key = 'brujula.flutter.clients.v1';
  Future<List<ClientRecord>> load() async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final raw = jsonDecode(prefs.getString(_key) ?? '[]') as List;
      return raw.map((e) => ClientRecord.fromJson(Map<String, dynamic>.from(e as Map))).toList();
    } catch (_) { return []; }
  }
  Future<void> save(List<ClientRecord> clients) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(clients.map((c) => c.toJson()).toList()));
  }
  Future<Set<String>> deletedIds() async => (await SharedPreferences.getInstance()).getStringList('$_key.deleted')?.toSet() ?? <String>{};
  Future<void> markDeleted(String id) async {
    final ids = await deletedIds(); ids.add(id);
    await (await SharedPreferences.getInstance()).setStringList('$_key.deleted', ids.toList());
  }
  Future<void> saveDeletedIds(Set<String> ids) async => (await SharedPreferences.getInstance()).setStringList('$_key.deleted', ids.toList());
}
