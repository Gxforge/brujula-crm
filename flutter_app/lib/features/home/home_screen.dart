import 'package:flutter/material.dart';
import '../settings/settings_screen.dart';
import '../settings/theme_controller.dart';
import '../clients/clients_screen.dart';
import '../projects/projects_screen.dart';
import '../clients/client_repository.dart';
import '../projects/project_repository.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.controller});
  final ThemeController controller;
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int selected = 0;
  static const titles = ['Resumen', 'Clientes', 'Proyectos', 'Ajustes'];
  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 760;
    final pages = [
      _Overview(onClients: () => setState(() => selected = 1), onProjects: () => setState(() => selected = 2)), const ClientsScreen(),
      const ProjectsScreen(),
      SettingsScreen(controller: widget.controller),
    ];
    return Scaffold(
      appBar: AppBar(title: Text('Brújula · ${titles[selected]}'), actions: [IconButton(tooltip: 'Ajustes', onPressed: () => setState(() => selected = 3), icon: const Icon(Icons.settings_outlined))]),
      body: Row(children: [
        if (wide) NavigationRail(selectedIndex: selected, onDestinationSelected: (i) => setState(() => selected = i), labelType: NavigationRailLabelType.all, destinations: const [NavigationRailDestination(icon: Icon(Icons.dashboard_outlined), label: Text('Resumen')), NavigationRailDestination(icon: Icon(Icons.people_outline), label: Text('Clientes')), NavigationRailDestination(icon: Icon(Icons.inventory_2_outlined), label: Text('Proyectos')), NavigationRailDestination(icon: Icon(Icons.settings_outlined), label: Text('Ajustes'))]),
        Expanded(child: pages[selected]),
      ]),
      bottomNavigationBar: wide ? null : NavigationBar(selectedIndex: selected, onDestinationSelected: (i) => setState(() => selected = i), destinations: const [NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: 'Resumen'), NavigationDestination(icon: Icon(Icons.people_outline), label: 'Clientes'), NavigationDestination(icon: Icon(Icons.inventory_2_outlined), label: 'Proyectos'), NavigationDestination(icon: Icon(Icons.settings_outlined), label: 'Ajustes')]),
    );
  }
}

class _Overview extends StatelessWidget {
  const _Overview({required this.onClients, required this.onProjects});
  final VoidCallback onClients, onProjects;
  @override
  Widget build(BuildContext context) => FutureBuilder<List<Object>>(
    future: Future.wait<Object>([ClientRepository().load(), ProjectRepository().load()]),
    builder: (context, snapshot) {
      final clients = snapshot.data == null ? 0 : (snapshot.data![0] as List).length;
      final projectRows = snapshot.data == null ? <dynamic>[] : (snapshot.data![1] as List);
      final projects = projectRows.length;
      final pending = projectRows.where((p) => !['Entregado', 'Cancelado'].contains(p.stage)).length;
      return ListView(padding: const EdgeInsets.all(20), children: [
        Text('Tu negocio, en orden.', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 6), Text('Resumen de actividad', style: Theme.of(context).textTheme.bodyLarge),
        const SizedBox(height: 20), Wrap(spacing: 12, runSpacing: 12, children: [ _Metric(label: 'Clientes', value: '$clients', icon: Icons.people_outline), _Metric(label: 'Proyectos', value: '$projects', icon: Icons.inventory_2_outlined), _Metric(label: 'Pendientes', value: '$pending', icon: Icons.task_alt)]),
        const SizedBox(height: 18), Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Empieza con lo esencial', style: Theme.of(context).textTheme.titleLarge), const SizedBox(height: 8), const Text('Agrega clientes y registra proyectos. La aplicación comienza vacía, sin datos de ejemplo.'), const SizedBox(height: 12), Wrap(spacing: 10, children: [FilledButton.icon(onPressed: onClients, icon: const Icon(Icons.person_add_alt_1), label: const Text('Clientes')), OutlinedButton.icon(onPressed: onProjects, icon: const Icon(Icons.add), label: const Text('Nuevo proyecto'))])]))),
      ]);
    },
  );
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value, required this.icon});
  final String label, value; final IconData icon;
  @override
  Widget build(BuildContext context) => SizedBox(width: 180, child: Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(icon, color: Theme.of(context).colorScheme.primary), const SizedBox(height: 12), Text(value, style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)), Text(label)]))));
}
