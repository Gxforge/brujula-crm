import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeController extends ChangeNotifier {
  static const _key = 'brujula.flutter.theme';
  ThemeMode mode = ThemeMode.system;
  ThemeController() { _load(); }
  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_key);
    mode = ThemeMode.values.firstWhere((x) => x.name == saved, orElse: () => ThemeMode.system);
    notifyListeners();
  }
  Future<void> setMode(ThemeMode value) async {
    mode = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, value.name);
  }
}
