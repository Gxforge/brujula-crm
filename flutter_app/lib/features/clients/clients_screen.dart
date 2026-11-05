import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:excel/excel.dart';
import 'package:file_picker/file_picker.dart';
import 'client_record.dart';
import 'client_repository.dart';

class ClientsScreen extends StatefulWidget {
  const ClientsScreen({super.key});
  @override
  State<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends State<ClientsScreen> {
  final repo = ClientRepository();
  final search = TextEditingController();
  List<ClientRecord> clients = [];
  bool loading = true;
  @override
  void initState() { super.initState(); _load(); }
  Future<void> _load() async { final data = await repo.load(); if (mounted) setState(() { clients = data; loading = false; }); }
  Future<void> _save(ClientRecord c) async {
    setState(() { final i = clients.indexWhere((x) => x.id == c.id); if (i < 0) { clients = [c, ...clients]; } else { clients[i] = c; } });
    await repo.save(clients);
  }
  Future<void> _remove(ClientRecord c) async { await repo.markDeleted(c.id); setState(() => clients.removeWhere((x) => x.id == c.id)); await repo.save(clients); }
  @override
  void dispose() { search.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    final q = search.text.trim().toLowerCase();
    final filtered = clients.where((c) => '${c.name} ${c.phone} ${c.province} ${c.category}'.toLowerCase().contains(q)).toList();
    return Scaffold(body: loading ? const Center(child: CircularProgressIndicator()) : Column(children: [
      Padding(padding: const EdgeInsets.fromLTRB(16, 16, 16, 8), child: Row(children: [Expanded(child: TextField(controller: search, onChanged: (_) => setState(() {}), decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Buscar clientes', border: OutlineInputBorder()))), PopupMenuButton<String>(tooltip: 'Importar / exportar', onSelected: (v) => v == 'import' ? _importXlsx() : _exportXlsx(), itemBuilder: (_) => const [PopupMenuItem(value: 'import', child: Text('Importar Excel')), PopupMenuItem(value: 'export', child: Text('Exportar Excel'))], icon: const Icon(Icons.more_vert))]),
      Expanded(child: filtered.isEmpty ? _empty(context) : ListView.builder(padding: const EdgeInsets.fromLTRB(12, 0, 12, 88), itemCount: filtered.length, itemBuilder: (_, i) => _tile(filtered[i]))),
    ]), floatingActionButton: FloatingActionButton.extended(onPressed: () => _edit(), icon: const Icon(Icons.person_add_alt_1), label: const Text('Añadir')));
  }
  Widget _empty(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.people_outline, size: 48), const SizedBox(height: 12), Text(clients.isEmpty ? 'Aún no hay clientes' : 'No encontramos coincidencias', style: Theme.of(context).textTheme.titleLarge), const SizedBox(height: 6), const Text('Agrega un cliente para comenzar.')])));
  Widget _tile(ClientRecord c) => Card(margin: const EdgeInsets.symmetric(vertical: 5), child: ListTile(leading: CircleAvatar(child: Text(c.name.isEmpty ? '?' : c.name.substring(0, 1).toUpperCase())), title: Text(c.name), subtitle: Text([c.category, c.phone, c.province].where((x) => x.isNotEmpty).join(' · ')), trailing: PopupMenuButton<String>(onSelected: (v) { if (v == 'edit') _edit(c); if (v == 'delete') _confirmDelete(c); }, itemBuilder: (_) => const [PopupMenuItem(value: 'edit', child: Text('Editar')), PopupMenuItem(value: 'delete', child: Text('Eliminar'))])));
  Future<void> _exportXlsx() async {
    try {
      final book = Excel.createExcel();
      final sheet = book['Clientes'];
      sheet.appendRow(['Nombre', 'Contacto', 'Teléfono', 'Localidad', 'Rubro', 'Estado', 'Notas', 'Actualizado'].map((x) => TextCellValue(x)).toList());
      for (final c in clients) { sheet.appendRow([c.name, c.contact, c.phone, c.province, c.category, c.status, c.notes, c.updatedAt].map((x) => TextCellValue(x)).toList()); }
      final bytes = book.encode();
      if (bytes == null) throw Exception('No se pudo crear el Excel.');
      await FilePicker.platform.saveFile(fileName: 'brujula-clientes.xlsx', bytes: Uint8List.fromList(bytes), type: FileType.custom, allowedExtensions: ['xlsx']);
    } catch (e) { _message('Error exportando: $e'); }
  }
  Future<void> _importXlsx() async {
    try {
      final picked = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['xlsx'], withData: true);
      if (picked == null || picked.files.single.bytes == null) return;
      final book = Excel.decodeBytes(picked.files.single.bytes!);
      final sheets = book.tables.values.whereType<Sheet>().toList();
      if (sheets.isEmpty || sheets.first.rows.length < 2) throw Exception('El archivo no contiene filas de datos.');
      final sheet = sheets.first;
      String key(String value) => value.toLowerCase().replaceAll(RegExp(r'[^a-z0-9áéíóúñ]'), '');
      String cell(List<Data?> row, int index) {
        if (index < 0 || index >= row.length) return '';
        final value = row[index]?.value;
        if (value is TextCellValue) return value.value.trim();
        if (value is IntCellValue) return value.value.toString();
        if (value is DoubleCellValue) return value.value.toString();
        if (value is DateCellValue) return value.asDateTimeLocal().toIso8601String().split('T').first;
        return value?.toString() ?? '';
      }
      final headers = sheet.rows.first.map((c) => key(cell([c], 0))).toList();
      int col(List<String> aliases) => headers.indexWhere((h) => aliases.any((a) => h == key(a)));
      final nameCol = col(['Nombre', 'Negocio', 'Cliente']);
      if (nameCol < 0) throw Exception('No encontré una columna Nombre, Negocio o Cliente.');
      final phoneCol = col(['Teléfono', 'Telefono', 'WhatsApp', 'Tel']);
      final contactCol = col(['Contacto', 'Persona de contacto']);
      final cityCol = col(['Localidad', 'Provincia', 'Municipio']);
      final categoryCol = col(['Rubro', 'Categoría', 'Categoria']);
      final notesCol = col(['Notas', 'Observaciones']);
      final imported = <ClientRecord>[];
      for (final row in sheet.rows.skip(1)) {
        final name = cell(row, nameCol); if (name.isEmpty) continue;
        final phone = cell(row, phoneCol);
        final matches = clients.where((c) => (phone.isNotEmpty && c.phone == phone) || c.name.toLowerCase() == name.toLowerCase()).toList();
        final old = matches.isEmpty ? null : matches.first;
        imported.add(ClientRecord(id: old?.id ?? DateTime.now().microsecondsSinceEpoch.toString() + imported.length.toString(), name: name, phone: cell(row, phoneCol), contact: cell(row, contactCol), province: cell(row, cityCol), category: cell(row, categoryCol), notes: cell(row, notesCol), status: old?.status ?? 'Pendiente', updatedAt: DateTime.now().toIso8601String()));
      }
      final map = <String, ClientRecord>{for (final c in clients) c.id: c};
      for (final c in imported) { map[c.id] = c; }
      clients = map.values.toList(); await repo.save(clients);
      if (mounted) setState(() {});
      _message('Importación lista: ${imported.length} registros procesados.');
    } catch (e) { _message('Error importando: $e'); }
  }
  void _message(String text) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text))); }
  Future<void> _confirmDelete(ClientRecord c) async { final yes = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(title: const Text('Eliminar cliente'), content: Text('¿Eliminar ${c.name}?'), actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')), FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Eliminar'))])); if (yes == true) _remove(c); }
  Future<void> _edit([ClientRecord? old]) async {
    final name = TextEditingController(text: old?.name ?? ''), phone = TextEditingController(text: old?.phone ?? ''), contact = TextEditingController(text: old?.contact ?? ''), province = TextEditingController(text: old?.province ?? ''), category = TextEditingController(text: old?.category ?? ''), notes = TextEditingController(text: old?.notes ?? '');
    final result = await showDialog<ClientRecord>(context: context, builder: (ctx) => _ClientDialog(old: old, name: name, phone: phone, contact: contact, province: province, category: category, notes: notes));
    for (final c in [name, phone, contact, province, category, notes]) { c.dispose(); }
    if (result != null) await _save(result);
  }
}

class _ClientDialog extends StatelessWidget {
  const _ClientDialog({required this.old, required this.name, required this.phone, required this.contact, required this.province, required this.category, required this.notes});
  final ClientRecord? old; final TextEditingController name, phone, contact, province, category, notes;
  @override
  Widget build(BuildContext context) => AlertDialog(title: Text(old == null ? 'Nuevo cliente' : 'Editar cliente'), content: SizedBox(width: 420, child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [_field(name, 'Nombre *'), _field(contact, 'Persona de contacto'), _field(phone, 'Teléfono / WhatsApp', keyboard: TextInputType.phone), _field(province, 'Provincia / localidad'), _field(category, 'Rubro'), _field(notes, 'Notas', lines: 3)]))), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')), FilledButton(onPressed: () { if (name.text.trim().isEmpty) return; Navigator.pop(context, ClientRecord(id: old?.id ?? DateTime.now().microsecondsSinceEpoch.toString(), name: name.text.trim(), phone: phone.text.trim(), contact: contact.text.trim(), province: province.text.trim(), category: category.text.trim(), notes: notes.text.trim(), status: old?.status ?? 'Pendiente', updatedAt: DateTime.now().toIso8601String())); }, child: const Text('Guardar'))]);
  Widget _field(TextEditingController c, String label, {TextInputType? keyboard, int lines = 1}) => Padding(padding: const EdgeInsets.only(bottom: 10), child: TextField(controller: c, keyboardType: keyboard, maxLines: lines, decoration: InputDecoration(labelText: label)));
}
