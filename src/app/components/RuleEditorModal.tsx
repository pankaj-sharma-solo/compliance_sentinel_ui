import { useState } from 'react';
import { X, Code, TestTube, Save, AlertCircle } from 'lucide-react';
import { Rule } from './PolicyLibrary';

interface RuleEditorModalProps {
  isOpen: boolean;
  rule: Rule | null;
  onClose: () => void;
  isAdmin: boolean;
}

export default function RuleEditorModal({ isOpen, rule, onClose, isAdmin }: RuleEditorModalProps) {
  const [logic, setLogic] = useState(rule?.logic || '');
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<{ passed: number; failed: number } | null>(null);

  if (!isOpen || !rule) return null;

  const handleTestLogic = () => {
    setIsTestRunning(true);
    setTestResults(null);
    
    // Simulate test execution
    setTimeout(() => {
      setTestResults({
        passed: 847,
        failed: 3,
      });
      setIsTestRunning(false);
    }, 2000);
  };

  const handleSave = () => {
    console.log('Saving rule:', { ...rule, logic });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <div className="bg-[#0f0f0f] border border-white/20 rounded-xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#0a0a0a]/50">
          <div>
            <h2 className="text-xl font-bold text-white">Rule Editor</h2>
            <p className="text-sm text-gray-400 mt-1">
              {rule.id} - {rule.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Rule Metadata */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-black/40 border border-white/10 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Source Document</div>
              <div className="text-sm text-gray-300">{rule.sourceDocument}</div>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Severity</div>
              <div className="text-sm text-gray-300">{rule.severity}</div>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Logic Type</div>
              <div className="text-sm text-gray-300">{rule.logicType}</div>
            </div>
          </div>

          {/* Technical Logic Editor */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Code className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
                Technical Logic
              </h3>
            </div>
            <textarea
              value={logic}
              onChange={(e) => setLogic(e.target.value)}
              disabled={!isAdmin}
              className="w-full h-48 bg-black/60 border border-white/10 rounded-lg p-4 text-sm text-gray-300 font-mono focus:outline-none focus:border-cyan-400/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder={`Enter ${rule.logicType} logic here...`}
            />
          </div>

          {/* Test Logic Section */}
          <div className="bg-cyan-400/5 border border-cyan-400/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TestTube className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
                  Test Against Mock Data
                </h3>
              </div>
              <button
                onClick={handleTestLogic}
                disabled={!isAdmin || isTestRunning}
                className="px-4 py-2 bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 hover:border-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isTestRunning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4" />
                    Test Logic
                  </>
                )}
              </button>
            </div>

            {testResults && (
              <div className="bg-black/40 border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Records Passed</div>
                    <div className="text-2xl font-bold text-cyan-400">{testResults.passed}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Violations Found</div>
                    <div className="text-2xl font-bold text-rose-400">{testResults.failed}</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Test completed successfully. Rule logic validated against 850 mock records.
                </p>
              </div>
            )}

            {!isAdmin && (
              <div className="flex items-start gap-2 text-sm text-gray-500">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>Testing is only available for Admin users.</p>
              </div>
            )}
          </div>

          {/* Save Info */}
          {isAdmin && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-yellow-400 mb-1">Important Notice</h4>
                  <p className="text-sm text-gray-300">
                    Changes to rule logic will affect all future scans. It is recommended to test the logic thoroughly before saving.
                    This action will be logged in the audit trail.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 bg-[#0a0a0a]/50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          {isAdmin && (
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 hover:border-cyan-400 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
