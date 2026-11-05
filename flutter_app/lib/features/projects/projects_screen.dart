import 'package:flutter/material.dart';
import 'project_record.dart';
import 'project_repository.dart';

const projectStages = ['Solicitado', 'Cotizado', 'Aprobado', 'En desarrollo', 'Revisión', 'Entregado', 'Cancelado'];

class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});
  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  final repo = ProjectRepository();
  final search = TextEditingController();
  List<ProjectRecord> values = [];
  bool loading = true;

  @override
  void initState() { super.initState(); _load(); }
  Future<void> _load() async {
    final items = await repo.load();
    if (mounted) setState(() { values = items; loading = false; });
  }
  Future<void> _save(ProjectRecord project) async {
    setState(() {
      final index = values.indexWhere((item) => item.id == project.id);
      if (index < 0) { values = [project, ...values]; } else { values[index] = project; }
    });
    await repo.save(values);
  }
  Future<void> _delete(ProjectRecord project) async {
    await repo.markDeleted(project.id);
    setState(() => values.removeWhere((item) => item.id == project.id));
    await repo.save(values);
  }
  @override
  void dispose() { search.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final query = search.text.toLowerCase().trim();
    final visible = values.where((item) => '${item.title} ${item.clientName} ${item.stage}'.toLowerCase().contains(query)).toList();
    return Scaffold(
      body: loading ? const Center(child: CircularProgressIndicator()) : Column(children: [
        Padding(padding: const EdgeInsets.all(16), child: TextField(controller: search, onChanged: (_) => setState(() {}), decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Buscar proyectos')),
        Expanded(child: visible.isEmpty ? Center(child: Text(values.isEmpty ? 'Aún no hay proyectos' : 'Sin resultados')) : ListView.builder(padding: const EdgeInsets.fromLTRB(12, 0, 12, 90), itemCount: visible.length, itemBuilder: (_, i) => _card(visible[i]))),
      ]),
      floatingActionButton: FloatingActionButton.extended(onPressed: () => _edit(), icon: const Icon(Icons.add), label: const Text('Nuevo proyecto')),
    );
  }

  Widget _card(ProjectRecord project) => Card(
    margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
    child: ListTile(
      leading: const CircleAvatar(child: Icon(Icons.work_outline)),
      title: Text(project.title),
      subtitle: Text('${project.clientName.isEmpty ? 'Sin cliente asociado' : project.clientName} · ${project.stage} · ${project.value.toStringAsFixed(2)} ${project.currency}'),
      onTap: () => _edit(project),
      trailing: PopupMenuButton<String>(
        onSelected: (value) { if (value == 'edit') _edit(project); if (value == 'delete') _delete(project); },
        itemBuilder: (_) => const [PopupMenuItem(value: 'edit', child: Text('Editar')), PopupMenuItem(value: 'delete', child: Text('Eliminar'))],
      ),
    ),
  );

  Future<void> _edit([ProjectRecord? old]) async {
    final title = TextEditingController(text: old?.title ?? '');
    final client = TextEditingController(text: old?.clientName ?? '');
    final amount = TextEditingController(text: old?.value.toString() ?? '');
    final paid = TextEditingController(text: old?.paid.toString() ?? '');
    final deadline = TextEditingController(text: old?.deadline ?? '');
    final notes = TextEditingController(text: old?.notes ?? '');
    var stage = old?.stage ?? projectStages.first;
    var currency = old?.currency ?? 'USD';
    final result = await showDialog<ProjectRecord>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, update) => AlertDialog(
        title: Text(old == null ? 'Nuevo proyecto' : 'Editar proyecto'),
        content: SizedBox(width: 440, child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
          _field(title, 'Proyecto *'),
          _field(client, 'Cliente'),
          DropdownButtonFormField<String>(value: stage, decoration: const InputDecoration(labelText: 'Etapa'), items: projectStages.map((item) => DropdownMenuItem(value: item, child: Text(item))).toList(), onChanged: (value) => update(() => stage = value ?? stage)),
          Row(children: [
            Expanded(child: _field(amount, 'Valor', keyboard: TextInputType.number)),
            const SizedBox(width: 8),
            Expanded(child: DropdownButtonFormField<String>(value: currency, decoration: const InputDecoration(labelText: 'Moneda'), items: const ['USD', 'CUP', 'EUR'].map((item) => DropdownMenuItem(value: item, child: Text(item))).toList(), onChanged: (value) => update(() => currency = value ?? currency))),
          ]),
          _field(paid, 'Pagado', keyboard: TextInputType.number),
          _field(deadline, 'Fecha límite (AAAA-MM-DD)'),
          _field(notes, 'Notas', lines: 3),
        ]))),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancelar')),
          FilledButton(onPressed: () {
            if (title.text.trim().isEmpty) return;
            Navigator.pop(dialogContext, ProjectRecord(id: old?.id ?? DateTime.now().microsecondsSinceEpoch.toString(), title: title.text.trim(), clientName: client.text.trim(), stage: stage, value: double.tryParse(amount.text) ?? 0, paid: double.tryParse(paid.text) ?? 0, currency: currency, deadline: deadline.text.trim(), notes: notes.text.trim(), updatedAt: DateTime.now().toIso8601String()));
          }, child: const Text('Guardar')),
        ],
      )),
    );
    for (final controller in [title, client, amount, paid, deadline, notes]) { controller.dispose(); }
    if (result != null) await _save(result);
  }

  Widget _field(TextEditingController controller, String label, {TextInputType? keyboard, int lines = 1}) => Padding(padding: const EdgeInsets.only(top: 8), child: TextField(controller: controller, keyboardType: keyboard, maxLines: lines, decoration: InputDecoration(labelText: label)));
}
