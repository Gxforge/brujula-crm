class ClientRecord {
  const ClientRecord({required this.id, required this.name, this.phone = '', this.contact = '', this.province = '', this.category = '', this.status = 'Pendiente', this.notes = '', required this.updatedAt});
  final String id, name, phone, contact, province, category, status, notes, updatedAt;
  Map<String, Object?> toJson() => {'id': id, 'name': name, 'phone': phone, 'contact': contact, 'province': province, 'category': category, 'status': status, 'notes': notes, 'updatedAt': updatedAt};
  factory ClientRecord.fromJson(Map<String, dynamic> x) => ClientRecord(id: '${x['id'] ?? ''}', name: '${x['name'] ?? ''}', phone: '${x['phone'] ?? ''}', contact: '${x['contact'] ?? ''}', province: '${x['province'] ?? ''}', category: '${x['category'] ?? ''}', status: '${x['status'] ?? 'Pendiente'}', notes: '${x['notes'] ?? ''}', updatedAt: '${x['updatedAt'] ?? ''}');
}
