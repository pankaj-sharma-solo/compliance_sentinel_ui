import { Eye, AlertCircle, Wrench } from 'lucide-react';

export interface Violation {
  id: string;
  recordId: string;
  table: string;
  risk: 'High' | 'Medium' | 'Low';
  violation: string;
  data?: string;
  policy?: string;
}

interface ViolationCardProps {
  violation: Violation;
  onViewEvidence: (violation: Violation) => void;
  onRemediate?: (violation: Violation) => void;
}

const riskStyles = {
  High: {
    badge: 'bg-rose-500/20 text-rose-400 border-rose-500/50',
    button: 'bg-rose-500/20 border-rose-500/50 text-rose-400 hover:bg-rose-500/30 hover:border-rose-500',
    border: 'border-rose-500/30',
  },
  Medium: {
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    button: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30 hover:border-yellow-500',
    border: 'border-yellow-500/30',
  },
  Low: {
    badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
    button: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30 hover:border-cyan-500',
    border: 'border-cyan-500/30',
  },
};

export default function ViolationCard({ violation, onViewEvidence, onRemediate }: ViolationCardProps) {
  const styles = riskStyles[violation.risk];
  
  return (
    <div className={`bg-[#0a0a0a]/60 backdrop-blur-xl border ${styles.border} rounded-lg p-5 hover:border-opacity-50 transition-all`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-md text-xs font-semibold border uppercase tracking-wider ${styles.badge}`}>
            {violation.risk} Risk
          </div>
          <AlertCircle className={`w-4 h-4 ${violation.risk === 'High' ? 'text-rose-400' : violation.risk === 'Medium' ? 'text-yellow-400' : 'text-cyan-400'}`} />
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="text-sm text-gray-400">
          <span className="text-gray-500">Record ID:</span> <span className="font-mono text-gray-300">{violation.recordId}</span>
        </div>
        <div className="text-sm text-gray-400">
          <span className="text-gray-500">Table:</span> <span className="font-mono text-gray-300">{violation.table}</span>
        </div>
        <div className="text-sm text-gray-300 mt-2">
          <span className="text-gray-500">Violation:</span> {violation.violation}
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={() => onViewEvidence(violation)}
          className={`flex-1 px-4 py-2 rounded-lg border backdrop-blur-sm flex items-center justify-center gap-2 transition-all ${styles.button}`}
        >
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">View Evidence</span>
        </button>
        
        {onRemediate && violation.risk === 'High' && (
          <button
            onClick={() => onRemediate(violation)}
            className="px-4 py-2 rounded-lg border backdrop-blur-sm flex items-center justify-center gap-2 transition-all bg-cyan-500/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30 hover:border-cyan-500"
            title="AI Remediation"
          >
            <Wrench className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}