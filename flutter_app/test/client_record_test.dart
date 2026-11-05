import 'package:flutter_test/flutter_test.dart';
import 'package:brujula_crm/features/clients/client_record.dart';

void main() {
  test('round-trip retains legacy CRM fields not yet migrated', () {
    final original = ClientRecord.fromJson({
      'id': 'c-1',
      'name': 'Cliente Demo',
      'phone': '+1 206 555 0140',
      'updatedAt': '2026-11-05T12:00:00.000Z',
      'projects': [{'id': 'p-1', 'title': 'Catálogo', 'stage': 'En desarrollo'}],
      'timeline': [{'type': 'nota', 'note': 'Seguimiento'}],
      'audit': {'noCatalog': true},
    });
    final restored = ClientRecord.fromJson(original.toJson());
    expect(restored.name, 'Cliente Demo');
    expect(restored.extra['projects'], original.extra['projects']);
    expect(restored.extra['timeline'], original.extra['timeline']);
    expect(restored.extra['audit'], original.extra['audit']);
  });
}
