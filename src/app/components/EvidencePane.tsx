import { X, Code, FileText } from 'lucide-react';
import { Violation } from './ViolationCard';

interface EvidencePaneProps {
  violation: Violation | null;
  onClose: () => void;
}

export default function EvidencePane({ violation, onClose }: EvidencePaneProps) {
  if (!violation) return null;

  const sampleData = violation.data || `{
  "id": "${violation.recordId}",
  "email": "john.doe@example.com",
  "ssn": "123-45-6789",
  "credit_card": "4532-1234-5678-9010",
  "ip_address": "192.168.1.100",
  "location": "US-WEST-2",
  "created_at": "2026-02-05T09:41:23Z",
  "status": "active"
}`;

  const samplePolicy = violation.policy || `According to Article 4.2 of the EU General Data Protection Regulation (GDPR):

"Personal data" means any information relating to an identified or identifiable natural person ("data subject"); an identifiable natural person is one who can be identified, directly or indirectly, in particular by reference to an identifier such as a name, an identification number, location data, an online identifier or to one or more factors specific to the physical, physiological, genetic, mental, economic, cultural or social identity of that natural person.

**Violation**: The detected record contains personal identifiable information (PII) including email addresses and social security numbers stored in a non-EU zone (US-WEST-2), which violates the data residency requirements outlined in our Data Governance Policy Section 3.4.

All personal data originating from EU residents must be stored within EU-compliant data centers or regions with adequate data protection safeguards.`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <div className="bg-[#0f0f0f] border border-white/20 rounded-xl max-w-7xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#0a0a0a]/50">
          <div>
            <h2 className="text-xl font-bold text-white">Evidence Review</h2>
            <p className="text-sm text-gray-400 mt-1">Record ID: {violation.recordId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Split View */}
        <div className="grid grid-cols-2 divide-x divide-white/10 h-[calc(90vh-120px)]">
          {/* Left: Code/Data View */}
          <div className="flex flex-col overflow-hidden">
            <div className="p-4 bg-[#0a0a0a]/30 border-b border-white/10 flex items-center gap-2">
              <Code className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
                Record Data
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="text-sm text-gray-300 font-mono bg-black/40 p-4 rounded-lg border border-white/10 overflow-x-auto">
                {sampleData}
              </pre>
            </div>
          </div>

          {/* Right: Policy Document View */}
          <div className="flex flex-col overflow-hidden">
            <div className="p-4 bg-[#0a0a0a]/30 border-b border-white/10 flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-semibold text-rose-400 uppercase tracking-wider">
                Policy Reference
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="prose prose-invert max-w-none">
                <div className="text-sm text-gray-300 leading-relaxed bg-black/40 p-4 rounded-lg border border-white/10">
                  {samplePolicy.split('**Violation**').map((part, index) => (
                    <span key={index}>
                      {index === 0 ? (
                        part
                      ) : (
                        <>
                          <span className="block mt-4 mb-2 font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/30">
                            ⚠️ Violation
                          </span>
                          {part}
                        </>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
