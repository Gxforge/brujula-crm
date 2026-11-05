import 'package:flutter/material.dart';
import '../features/home/home_screen.dart';
import '../features/settings/theme_controller.dart';
import '../features/settings/sync_scheduler.dart';

class BrujulaApp extends StatefulWidget {
  const BrujulaApp({super.key});
  @override
  State<BrujulaApp> createState() => _BrujulaAppState();
}

class _BrujulaAppState extends State<BrujulaApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    SyncScheduler.instance.initialize();
  }
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) SyncScheduler.instance.synchronize();
  }
  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    SyncScheduler.instance.dispose();
    theme.dispose();
    super.dispose();
  }
  final theme = ThemeController();
  @override
  Widget build(BuildContext context) => SelectionContainer.disabled(child: AnimatedBuilder(
    animation: theme,
    builder: (_, __) => MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Brújula CRM',
      themeMode: theme.mode,
      theme: _theme(Brightness.light),
      darkTheme: _theme(Brightness.dark),
      home: HomeScreen(controller: theme),
    ),
  ));

  ThemeData _theme(Brightness brightness) {
    final dark = brightness == Brightness.dark;
    final scheme = ColorScheme.fromSeed(
      seedColor: const Color(0xffef6849),
      brightness: brightness,
      surface: dark ? const Color(0xff171d2b) : Colors.white,
    );
    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: dark ? const Color(0xff101625) : const Color(0xfff5f7fb),
      appBarTheme: AppBarTheme(backgroundColor: dark ? const Color(0xff171d2b) : Colors.white, foregroundColor: scheme.onSurface, surfaceTintColor: Colors.transparent),
      cardTheme: CardThemeData(color: dark ? const Color(0xff171d2b) : Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: scheme.outlineVariant.withValues(alpha: .55)))),
      inputDecorationTheme: InputDecorationTheme(border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)), filled: true, fillColor: dark ? const Color(0xff20283a) : const Color(0xfffafbfe)),
    );
  }
}
