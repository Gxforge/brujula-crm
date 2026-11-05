import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'project_record.dart';
class ProjectRepository {
  static const _key = 'brujula.flutter.projects.v1';
  Future<List<ProjectRecord>> load() async {
    final prefs = await SharedPreferences.getInstance();
    try { final list = jsonDecode(prefs.getString(_key) ?? '[]') as List; return list.map((e) => ProjectRecord.fromJson(Map<String, dynamic>.from(e as Map))).toList(); } catch (_) { return []; }
  }
  Future<void> save(List<ProjectRecord> values) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(values.map((p) => p.toJson()).toList()));
  }
  Future<Set<String>> deletedIds() async => (await SharedPreferences.getInstance()).getStringList('$_key.deleted')?.toSet() ?? <String>{};
  Future<void> markDeleted(String id) async {
    final ids = await deletedIds(); ids.add(id);
    await (await SharedPreferences.getInstance()).setStringList('$_key.deleted', ids.toList());
  }
  Future<void> saveDeletedIds(Set<String> ids) async => (await SharedPreferences.getInstance()).setStringList('$_key.deleted', ids.toList());
}
