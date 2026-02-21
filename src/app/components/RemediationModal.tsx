import { X, CheckCircle, XCircle, Code, Zap } from 'lucide-react';

interface RemediationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export default function RemediationModal({ isOpen, onClose, onApprove, onReject }: RemediationModalProps) {
  if (!isOpen) return null;

  const suggestedFix = `UPDATE users_raw
SET email = MASK_EMAIL(email),
    ssn = MASK_SSN(ssn),
    _MASK_PII(email) = TRUE
WHERE id = 8829
  AND eu_resident = TRUE
  AND location NOT IN ('EU-CENTRAL-1', 'EU-WEST-1');

-- Alternative: Migrate to compliant region
INSERT INTO users_raw_eu (SELECT * FROM users_raw WHERE id = 8829);
DELETE FROM users_raw WHERE id = 8829;`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <div className="bg-[#0f0f0f] border border-white/20 rounded-xl max-w-3xl w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#0a0a0a]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-400/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Suggested Remediation</h2>
              <p className="text-sm text-gray-400 mt-0.5">AI-generated fix for violation #8829</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Violation Summary */}
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-rose-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-rose-400 text-xs font-bold">!</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-rose-400 mb-1">HIGH RISK VIOLATION DETECTED</h3>
                <p className="text-sm text-gray-300">
                  Record #8829 contains EU resident PII stored in US-WEST-2, violating GDPR data residency requirements.
                </p>
              </div>
            </div>
          </div>

          {/* SQL Fix */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Code className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
                Suggested SQL Fix
              </h3>
            </div>
            <div className="bg-black/60 border border-white/10 rounded-lg overflow-hidden">
              <pre className="text-sm text-gray-300 font-mono p-4 overflow-x-auto">
                {suggestedFix}
              </pre>
            </div>
          </div>

          {/* Impact Assessment */}
          <div className="bg-cyan-400/5 border border-cyan-400/20 rounded-lg p-4 mb-6">
            <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
              Impact Assessment
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>Affects 1 record in <code className="font-mono text-cyan-400">users_raw</code> table</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>No downstream dependencies detected</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>Estimated execution time: {'<'}50ms</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onApprove}
              className="flex-1 px-6 py-3 bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 hover:border-cyan-400 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <CheckCircle className="w-5 h-5" />
              Approve & Execute Fix
            </button>
            <button
              onClick={onReject}
              className="flex-1 px-6 py-3 bg-rose-500/20 border border-rose-500/50 text-rose-400 rounded-lg hover:bg-rose-500/30 hover:border-rose-500 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <XCircle className="w-5 h-5" />
              Reject
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            This action will be logged and require approval from compliance officer.
          </p>
        </div>
      </div>
    </div>
  );
}
