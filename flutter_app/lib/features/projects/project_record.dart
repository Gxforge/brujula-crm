class ProjectRecord {
  const ProjectRecord({required this.id, required this.title, this.clientId = '', this.clientName = '', this.stage = 'Solicitado', this.value = 0, this.paid = 0, this.currency = 'USD', this.deadline = '', this.notes = '', required this.updatedAt});
  final String id, title, clientId, clientName, stage, currency, deadline, notes, updatedAt;
  final double value, paid;
  Map<String, Object?> toJson() => {'id': id, 'title': title, 'clientId': clientId, 'clientName': clientName, 'stage': stage, 'value': value, 'paid': paid, 'currency': currency, 'deadline': deadline, 'notes': notes, 'updatedAt': updatedAt};
  factory ProjectRecord.fromJson(Map<String, dynamic> x) => ProjectRecord(id: '${x['id'] ?? ''}', title: '${x['title'] ?? ''}', clientId: '${x['clientId'] ?? ''}', clientName: '${x['clientName'] ?? ''}', stage: '${x['stage'] ?? 'Solicitado'}', value: (x['value'] as num? ?? 0).toDouble(), paid: (x['paid'] as num? ?? 0).toDouble(), currency: '${x['currency'] ?? 'USD'}', deadline: '${x['deadline'] ?? ''}', notes: '${x['notes'] ?? ''}', updatedAt: '${x['updatedAt'] ?? ''}');
}
