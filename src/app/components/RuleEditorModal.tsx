import { useState, useEffect } from 'react';
import { X, Code, TestTube, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { Rule } from './PolicyLibrary';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

interface RuleEditorModalProps {
  isOpen  : boolean;
  rule    : Rule | null;
  onClose : () => void;
  onSaved : () => void;       // ← added: refresh parent after save
  isAdmin : boolean;
}

interface TestResult {
  passed        : number;
  failed        : number;
  total         : number;
  error         : string | null;
}

export default function RuleEditorModal({ isOpen, rule, onClose, onSaved, isAdmin }: RuleEditorModalProps) {
  const [logic, setLogic]               = useState('');
  const [isSaving, setIsSaving]         = useState(false);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResults, setTestResults]   = useState<TestResult | null>(null);
  const [saveError, setSaveError]       = useState<string | null>(null);

  // ── Sync logic when rule changes ──────────────────────────────────────
  useEffect(() => {
    if (rule) {
      setLogic(rule.logic);
      setTestResults(null);
      setSaveError(null);
    }
  }, [rule]);

  if (!isOpen || !rule) return null;

  // ── Test logic against backend ────────────────────────────────────────
  const handleTestLogic = async () => {
    setIsTestRunning(true);
    setTestResults(null);
    try {
      const res = await fetch(`${API_BASE}/policies/rules/${rule.id}/test`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ rule_text: logic }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResults({
          passed: data.passed  ?? 0,
          failed: data.failed  ?? 0,
          total : data.total   ?? 0,
          error : null,
        });
      } else {
        setTestResults({ passed: 0, failed: 0, total: 0, error: 'Test endpoint failed' });
      }
    } catch {
      setTestResults({ passed: 0, failed: 0, total: 0, error: 'Could not reach test endpoint' });
    } finally {
      setIsTestRunning(false);
    }
  };

  // ── Save to backend ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!logic.trim()) { setSaveError('Rule text cannot be empty'); return; }
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${API_BASE}/policies/rules/${rule.id}`, {
        method : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ rule_text: logic }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? 'Save failed');
      }
      onSaved();   // ✅ refresh parent rule list + close modal
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-8">
        <div className="bg-[#0f0f0f] border border-white/20 rounded-xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">

          {/* ── Header ── */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#0a0a0a]/50">
            <div>
              <h2 className="text-xl font-bold text-white">Rule Editor</h2>
              <p className="text-sm text-gray-400 mt-1">
                <span className="font-mono text-cyan-400">{rule.id}</span>
                {rule.articleRef && <span className="text-gray-500"> · {rule.articleRef}</span>}
                <span className="text-gray-500"> · v{rule.version}</span>
              </p>
            </div>
            <button onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-auto p-6">

            {/* Metadata row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Source Document', value: rule.sourceDocument },
                { label: 'Severity',        value: rule.severity       },
                { label: 'Logic Type',      value: rule.logicType      },
              ].map(({ label, value }) => (
                  <div key={label} className="bg-black/40 border border-white/10 rounded-lg p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
                    <div className="text-sm text-gray-300 font-mono truncate">{value}</div>
                  </div>
              ))}
            </div>

            {/* Logic editor */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Code className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
                  Technical Logic
                </h3>
              </div>
              <textarea
                  value={logic}
                  onChange={e => setLogic(e.target.value)}
                  disabled={!isAdmin}
                  rows={8}
                  className="w-full bg-black/60 border border-white/10 rounded-lg p-4 text-sm text-gray-300 font-mono focus:outline-none focus:border-cyan-400/50 resize-y disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  placeholder={`Enter ${rule.logicType} logic here...`}
              />
              {saveError && (
                  <div className="mt-2 flex items-center gap-2 text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4" /> {saveError}
                  </div>
              )}
            </div>

            {/* Test section */}
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
                    className="px-4 py-2 bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 hover:border-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                  {isTestRunning
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> Testing...</>
                      : <><TestTube className="w-4 h-4" /> Run Test</>
                  }
                </button>
              </div>

              {/* Test results */}
              {testResults && (
                  <div className="bg-black/40 border border-white/10 rounded-lg p-4">
                    {testResults.error ? (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                          <AlertCircle className="w-4 h-4" /> {testResults.error}
                        </div>
                    ) : (
                        <>
                          <div className="flex items-center gap-6">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Records Passed</div>
                              <div className="text-2xl font-bold text-cyan-400">{testResults.passed}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Violations Found</div>
                              <div className={`text-2xl font-bold ${testResults.failed > 0 ? 'text-rose-400' : 'text-green-400'}`}>
                                {testResults.failed}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Total Records</div>
                              <div className="text-2xl font-bold text-gray-300">{testResults.total}</div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-3">
                            Test completed. Rule validated against {testResults.total} mock records.
                          </p>
                        </>
                    )}
                  </div>
              )}

              {!isAdmin && (
                  <div className="flex items-start gap-2 text-sm text-gray-500">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>Testing is only available for Admin users.</p>
                  </div>
              )}
            </div>

            {/* Warning notice */}
            {isAdmin && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-yellow-400 mb-1">Important Notice</h4>
                      <p className="text-sm text-gray-300">
                        Changes to rule logic will affect all future scans. Test thoroughly before saving.
                        This action will be logged in the audit trail.
                      </p>
                    </div>
                  </div>
                </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 bg-[#0a0a0a]/50">
            <button onClick={onClose}
                    className="px-6 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-all text-sm">
              Cancel
            </button>
            {isAdmin && (
                <button onClick={handleSave} disabled={isSaving}
                        className="px-6 py-2 bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 hover:border-cyan-400 transition-all flex items-center gap-2 text-sm disabled:opacity-50">
                  {isSaving
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                      : <><Save className="w-4 h-4" /> Save Changes</>
                  }
                </button>
            )}
          </div>
        </div>
      </div>
  );
}
