import { useState } from 'react';
import ViolationCard, { Violation } from './ViolationCard';
import EvidencePane from './EvidencePane';
import RemediationModal from './RemediationModal';
import { AlertTriangle } from 'lucide-react';

const mockViolations: Violation[] = [
  {
    id: '1',
    recordId: '8829',
    table: 'users_raw',
    risk: 'High',
    violation: 'Data Residency - PII stored outside compliant region',
    data: `{
  "id": "8829",
  "email": "maria.santos@example.com",
  "ssn": "987-65-4321",
  "phone": "+1-555-0123",
  "credit_card": "5105-1051-0510-5100",
  "ip_address": "203.0.113.42",
  "location": "US-WEST-2",
  "eu_resident": true,
  "created_at": "2026-02-04T14:22:15Z"
}`,
  },
  {
    id: '2',
    recordId: 'S52',
    table: 'financial_data',
    risk: 'Medium',
    violation: 'Unmasked PII in non-production environment',
    data: `{
  "transaction_id": "S52",
  "account_holder": "Robert Chen",
  "account_number": "9876543210",
  "routing_number": "021000021",
  "amount": 15420.50,
  "currency": "USD",
  "environment": "staging"
}`,
  },
  {
    id: '3',
    recordId: '1kmq-187djw2',
    table: 'financial_data',
    risk: 'Low',
    violation: 'Old Data Retention - Record exceeds 7-year policy',
    data: `{
  "record_id": "1kmq-187djw2",
  "customer_name": "Jane Wilson",
  "account_status": "closed",
  "last_activity": "2015-03-12",
  "retention_date": "2022-03-12",
  "current_date": "2026-02-05",
  "days_overdue": 1425
}`,
  },
];

export default function ViolationTriage() {
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [remediationOpen, setRemediationOpen] = useState(false);

  const handleRemediate = (violation: Violation) => {
    setSelectedViolation(violation);
    setRemediationOpen(true);
  };

  const handleApprove = () => {
    console.log('Remediation approved');
    setRemediationOpen(false);
    setSelectedViolation(null);
  };

  const handleReject = () => {
    console.log('Remediation rejected');
    setRemediationOpen(false);
    setSelectedViolation(null);
  };

  return (
    <>
      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-6 h-6 text-rose-400" />
          <h2 className="text-2xl font-bold text-white">Violation Triage</h2>
          <div className="ml-auto px-3 py-1 bg-rose-500/20 text-rose-400 rounded-full text-sm font-semibold">
            {mockViolations.length} Active
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {mockViolations.map((violation) => (
            <ViolationCard
              key={violation.id}
              violation={violation}
              onViewEvidence={setSelectedViolation}
              onRemediate={handleRemediate}
            />
          ))}
        </div>
      </div>

      <EvidencePane
        violation={selectedViolation}
        onClose={() => setSelectedViolation(null)}
      />

      <RemediationModal
        isOpen={remediationOpen}
        onClose={() => setRemediationOpen(false)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </>
  );
}