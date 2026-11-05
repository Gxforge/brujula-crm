import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../clients/client_repository.dart';
import '../projects/project_repository.dart';
import '../clients/client_record.dart';
import '../projects/project_record.dart';
import 'sync_service.dart';
import 'theme_controller.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key, required this.controller});
  final ThemeController controller;
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final sync = SyncService();
  final repo = ClientRepository();
  final projectRepo = ProjectRepository();
  final email = TextEditingController();
  final password = TextEditingController();
  bool createAccount = false, busy = false, signedIn = false, obscure = true;
  String? currentEmail;
  @override
  void initState() { super.initState(); _loadSession(); }
  Future<void> _loadSession() async { final yes = await sync.signedIn; final address = await sync.email; if (mounted) setState(() { signedIn = yes; currentEmail = address; }); }
  @override
  void dispose() { email.dispose(); password.dispose(); super.dispose(); }
  Future<void> _authenticate() async {
    if (email.text.trim().isEmpty || password.text.isEmpty) { _message('Escribe tu correo y contraseña.'); return; }
    setState(() => busy = true);
    try { await sync.authenticate(email.text, password.text, createAccount: createAccount); await _loadSession(); password.clear(); _message(createAccount ? 'Cuenta creada. Ya puedes sincronizar tus dispositivos.' : 'Sesión iniciada.'); }
    catch (e) { _message(e.toString().replaceFirst('Exception: ', '')); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> _synchronize() async {
    setState(() => busy = true);
    try { final result = await sync.syncData(await repo.load(), await projectRepo.load(), deletedClients: await repo.deletedIds(), deletedProjects: await projectRepo.deletedIds()); await repo.save(result.clients); await projectRepo.save(result.projects); await repo.saveDeletedIds(result.deletedClients); await projectRepo.saveDeletedIds(result.deletedProjects); _message('Sincronización terminada: ${result.clients.length} clientes y ${result.projects.length} proyectos.'); }
    catch (e) { _message(e.toString().replaceFirst('Exception: ', '')); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> _logout() async { setState(() => busy = true); await sync.signOut(); if (mounted) { setState(() { signedIn = false; currentEmail = null; busy = false; }); _message('Sesión cerrada.'); } }
  void _message(String text) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text))); }
  Future<void> _backupExport() async {
    try {
      final data = {'format': 'brujula-backup-v1', 'createdAt': DateTime.now().toIso8601String(), 'clients': (await repo.load()).map((x) => x.toJson()).toList(), 'projects': (await projectRepo.load()).map((x) => x.toJson()).toList()};
      await FilePicker.platform.saveFile(fileName: 'brujula-respaldo.json', type: FileType.custom, allowedExtensions: ['json'], bytes: Uint8List.fromList(utf8.encode(const JsonEncoder.withIndent('  ').convert(data))));
      _message('Respaldo exportado.');
    } catch (e) { _message('No se pudo exportar el respaldo: $e'); }
  }
  Future<void> _backupImport() async {
    try {
      final picked = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['json'], withData: true);
      final bytes = picked?.files.single.bytes;
      if (bytes == null) return;
      final data = jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
      if (data['format'] != 'brujula-backup-v1' || data['clients'] is! List || data['projects'] is! List) throw Exception('El formato del respaldo no es válido.');
      final ok = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(title: const Text('Restaurar respaldo'), content: const Text('Esta acción reemplazará los clientes y proyectos actuales de este dispositivo.'), actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')), FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Reemplazar datos'))]));
      if (ok != true) return;
      await repo.save((data['clients'] as List).map((e) => ClientRecord.fromJson(Map<String, dynamic>.from(e as Map))).toList());
      await projectRepo.save((data['projects'] as List).map((e) => ProjectRecord.fromJson(Map<String, dynamic>.from(e as Map))).toList());
      _message('Respaldo restaurado en este dispositivo.');
    } catch (e) { _message('No se pudo restaurar el respaldo: $e'); }
  }

  @override
  Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(20), children: [
    Text('Ajustes', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
    const SizedBox(height: 18),
    Card(child: Padding(padding: const EdgeInsets.all(18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Tema', style: Theme.of(context).textTheme.titleLarge), const SizedBox(height: 8), const Text('El aspecto de tarjetas, fondos, textos y controles cambia junto con el tema.'), const SizedBox(height: 12), SegmentedButton<ThemeMode>(segments: const [ButtonSegment(value: ThemeMode.system, label: Text('Sistema'), icon: Icon(Icons.brightness_auto)), ButtonSegment(value: ThemeMode.light, label: Text('Claro'), icon: Icon(Icons.light_mode_outlined)), ButtonSegment(value: ThemeMode.dark, label: Text('Oscuro'), icon: Icon(Icons.dark_mode_outlined))], selected: {widget.controller.mode}, onSelectionChanged: (s) => widget.controller.setMode(s.first))]))),
    const SizedBox(height: 12),
    Card(child: Padding(padding: const EdgeInsets.all(18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Sincronización', style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 6),
      const Text('Crea una cuenta o inicia sesión con el mismo correo en tu PC y Android. Tus clientes se guardan asociados a esa cuenta.'),
      const SizedBox(height: 14),
      if (signedIn) ...[
        Row(children: [const Icon(Icons.cloud_done_outlined, color: Colors.green), const SizedBox(width: 9), Expanded(child: Text(currentEmail ?? 'Sesión iniciada'))]),
        const SizedBox(height: 14),
        Wrap(spacing: 10, runSpacing: 8, children: [FilledButton.icon(onPressed: busy ? null : _synchronize, icon: busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.sync), label: Text(busy ? 'Conectando…' : 'Sincronizar ahora')), OutlinedButton.icon(onPressed: busy ? null : _logout, icon: const Icon(Icons.logout), label: const Text('Cerrar sesión'))]),
      ] else ...[
        TextField(controller: email, keyboardType: TextInputType.emailAddress, autofillHints: const [AutofillHints.email], decoration: const InputDecoration(labelText: 'Correo electrónico', prefixIcon: Icon(Icons.mail_outline))),
        const SizedBox(height: 10),
        TextField(controller: password, obscureText: obscure, autofillHints: [createAccount ? AutofillHints.newPassword : AutofillHints.password], decoration: InputDecoration(labelText: createAccount ? 'Contraseña (mínimo 10 caracteres)' : 'Contraseña', prefixIcon: const Icon(Icons.lock_outline), suffixIcon: IconButton(onPressed: () => setState(() => obscure = !obscure), icon: Icon(obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined)))),
        const SizedBox(height: 12),
        Wrap(spacing: 10, runSpacing: 8, children: [FilledButton.icon(onPressed: busy ? null : _authenticate, icon: busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : Icon(createAccount ? Icons.person_add_alt_1 : Icons.login), label: Text(createAccount ? 'Crear cuenta' : 'Iniciar sesión')), TextButton(onPressed: busy ? null : () => setState(() => createAccount = !createAccount), child: Text(createAccount ? 'Ya tengo cuenta' : 'Crear una cuenta'))]),
        const SizedBox(height: 8),
        Text('La contraseña se envía por HTTPS y se almacena en el servidor mediante derivación criptográfica; el token de sesión se guarda en el almacén seguro del dispositivo.', style: Theme.of(context).textTheme.bodySmall),
      ],
    ]))),
    const SizedBox(height: 12),
    Card(child: Padding(padding: const EdgeInsets.all(18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Respaldo local', style: Theme.of(context).textTheme.titleMedium), const SizedBox(height: 6), const Text('Exporta o restaura los clientes y proyectos como archivo JSON. El archivo no incluye credenciales.'), const SizedBox(height: 10), Wrap(spacing: 10, children: [OutlinedButton.icon(onPressed: _backupExport, icon: const Icon(Icons.download_outlined), label: const Text('Exportar respaldo')), OutlinedButton.icon(onPressed: _backupImport, icon: const Icon(Icons.restore), label: const Text('Restaurar respaldo'))])]))),
    const SizedBox(height: 12),
    Card(child: Padding(padding: const EdgeInsets.all(18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Privacidad', style: Theme.of(context).textTheme.titleMedium), const SizedBox(height: 6), const Text('La app inicia vacía. Tus registros se almacenan en este dispositivo; la sincronización sube los clientes a la cuenta cuando la activas.')]))),
  ]);
}
