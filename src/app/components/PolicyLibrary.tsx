import { useState } from 'react';
import { Search, Filter, Download, Edit, Trash2, Archive, AlertCircle, Info } from 'lucide-react';
import RuleEditorModal from './RuleEditorModal';

export interface Rule {
  id: string;
  name: string;
  sourceDocument: string;
  severity: 'High' | 'Medium' | 'Low';
  status: 'Active' | 'Stale';
  logicType: 'SQL' | 'JSON';
  logic: string;
  violationCount: number;
  lastModifiedBy: string;
  lastModified: string;
}

interface PolicyLibraryProps {
  isAdmin: boolean;
}

const mockRules: Rule[] = [
  {
    id: 'R-001',
    name: 'EU Resident PII Data Residency',
    sourceDocument: 'GDPR_Compliance_v3.2.pdf',
    severity: 'High',
    status: 'Active',
    logicType: 'SQL',
    logic: 'SELECT * FROM users WHERE eu_resident = TRUE AND location NOT IN (\'EU-CENTRAL-1\', \'EU-WEST-1\')',
    violationCount: 23,
    lastModifiedBy: 'admin@company.com',
    lastModified: '2026-02-05',
  },
  {
    id: 'R-002',
    name: 'Credit Card Masking in Non-Prod',
    sourceDocument: 'PII_Handling_Guidelines.pdf',
    severity: 'High',
    status: 'Active',
    logicType: 'SQL',
    logic: 'SELECT * FROM financial_data WHERE environment != \'production\' AND credit_card IS NOT NULL AND LENGTH(credit_card) = 16',
    violationCount: 8,
    lastModifiedBy: 'security@company.com',
    lastModified: '2026-02-04',
  },
  {
    id: 'R-003',
    name: 'Data Retention - 7 Year Policy',
    sourceDocument: 'Data_Retention_Policy.pdf',
    severity: 'Medium',
    status: 'Active',
    logicType: 'SQL',
    logic: 'SELECT * FROM financial_data WHERE account_status = \'closed\' AND DATEDIFF(NOW(), last_activity) > 2555',
    violationCount: 142,
    lastModifiedBy: 'compliance@company.com',
    lastModified: '2026-02-03',
  },
  {
    id: 'R-004',
    name: 'SSN Format Validation',
    sourceDocument: 'PII_Handling_Guidelines.pdf',
    severity: 'Low',
    status: 'Active',
    logicType: 'JSON',
    logic: '{"field": "ssn", "pattern": "^\\\\d{3}-\\\\d{2}-\\\\d{4}$", "required": true}',
    violationCount: 5,
    lastModifiedBy: 'dev@company.com',
    lastModified: '2026-01-28',
  },
  {
    id: 'R-005',
    name: 'Legacy Email Encryption Check',
    sourceDocument: 'Data_Security_Standards.pdf',
    severity: 'Medium',
    status: 'Stale',
    logicType: 'SQL',
    logic: 'SELECT * FROM users WHERE email_encrypted = FALSE AND created_at < \'2020-01-01\'',
    violationCount: 0,
    lastModifiedBy: 'admin@company.com',
    lastModified: '2025-11-15',
  },
];

export default function PolicyLibrary({ isAdmin }: PolicyLibraryProps) {
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'stale' | 'audit'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const filteredRules = mockRules.filter((rule) => {
    const matchesSearch = rule.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         rule.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === 'all' || rule.sourceDocument === sourceFilter;
    const matchesSeverity = severityFilter === 'all' || rule.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || rule.status === statusFilter;
    const matchesTab = activeSubTab === 'active' ? rule.status === 'Active' : 
                      activeSubTab === 'stale' ? rule.status === 'Stale' : true;
    
    return matchesSearch && matchesSource && matchesSeverity && matchesStatus && matchesTab;
  });

  const handleExportCSV = () => {
    const headers = ['Rule_ID', 'Rule_Name', 'Source_PDF', 'Logic_Type', 'Violation_Count', 'Last_Modified_By'];
    const rows = filteredRules.map(rule => [
      rule.id,
      rule.name,
      rule.sourceDocument,
      rule.logicType,
      rule.violationCount.toString(),
      rule.lastModifiedBy,
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `policy-library-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEditRule = (rule: Rule) => {
    setSelectedRule(rule);
    setIsEditorOpen(true);
  };

  const severityColors = {
    High: 'text-rose-400 bg-rose-500/20 border-rose-500/50',
    Medium: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50',
    Low: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/50',
  };

  const uniqueSources = ['all', ...Array.from(new Set(mockRules.map(r => r.sourceDocument)))];

  return (
    <>
      <div className="p-8">
        {/* Header with Sub-tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">Policy Library</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveSubTab('active')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSubTab === 'active'
                    ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/50'
                    : 'text-gray-400 hover:text-gray-200 bg-white/5'
                }`}
              >
                Active Rules
              </button>
              <button
                onClick={() => setActiveSubTab('stale')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSubTab === 'stale'
                    ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/50'
                    : 'text-gray-400 hover:text-gray-200 bg-white/5'
                }`}
              >
                Stale Rules
              </button>
              <button
                onClick={() => setActiveSubTab('audit')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSubTab === 'audit'
                    ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/50'
                    : 'text-gray-400 hover:text-gray-200 bg-white/5'
                }`}
              >
                Audit Log
              </button>
            </div>
          </div>
          {activeSubTab !== 'audit' && (
            <div className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm font-semibold">
              {filteredRules.length} Rules
            </div>
          )}
        </div>

        {/* Render Audit Log or Rules Table */}
        {activeSubTab === 'audit' ? (
          <AuditLog />
        ) : (
          <>
            {/* Filter Bar */}
            <div className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by Rule ID or Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50"
                  />
                </div>

                {/* Source Filter */}
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400/50"
                >
                  {uniqueSources.map(source => (
                    <option key={source} value={source} className="bg-[#0a0a0a]">
                      {source === 'all' ? 'All Documents' : source}
                    </option>
                  ))}
                </select>

                {/* Severity Filter */}
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400/50"
                >
                  <option value="all" className="bg-[#0a0a0a]">All Severities</option>
                  <option value="High" className="bg-[#0a0a0a]">High</option>
                  <option value="Medium" className="bg-[#0a0a0a]">Medium</option>
                  <option value="Low" className="bg-[#0a0a0a]">Low</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400/50"
                >
                  <option value="all" className="bg-[#0a0a0a]">All Status</option>
                  <option value="Active" className="bg-[#0a0a0a]">Active</option>
                  <option value="Stale" className="bg-[#0a0a0a]">Stale</option>
                </select>

                {/* Export Button */}
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 hover:border-cyan-400 transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Export CSV</span>
                </button>
              </div>
            </div>

            {/* Rules Table */}
            <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-black/40 border-b border-white/10">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rule ID</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Source</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Severity</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Violations</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-cyan-400 text-sm">{rule.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white font-medium">{rule.name}</div>
                        <div className="text-xs text-gray-500 mt-1">Modified by {rule.lastModifiedBy}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300">{rule.sourceDocument}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${severityColors[rule.severity]}`}>
                          {rule.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-gray-300">{rule.logicType}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-white font-semibold">{rule.violationCount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isAdmin ? (
                            <>
                              <button
                                onClick={() => handleEditRule(rule)}
                                className="p-2 hover:bg-cyan-400/10 text-cyan-400 rounded-lg transition-all"
                                title="Edit Rule"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                className="p-2 hover:bg-yellow-400/10 text-yellow-400 rounded-lg transition-all"
                                title="Mark as Stale"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                              <button
                                className="p-2 hover:bg-rose-400/10 text-rose-400 rounded-lg transition-all"
                                title="Delete Rule"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="p-2 text-gray-600 cursor-not-allowed relative group"
                                disabled
                                title="Admin permissions required"
                              >
                                <Edit className="w-4 h-4" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 border border-white/20 rounded text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  Admin permissions required
                                </div>
                              </button>
                              <button
                                className="p-2 text-gray-600 cursor-not-allowed relative group"
                                disabled
                                title="Admin permissions required"
                              >
                                <Archive className="w-4 h-4" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 border border-white/20 rounded text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  Admin permissions required
                                </div>
                              </button>
                              <button
                                className="p-2 text-gray-600 cursor-not-allowed relative group"
                                disabled
                                title="Admin permissions required"
                              >
                                <Trash2 className="w-4 h-4" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 border border-white/20 rounded text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  Admin permissions required
                                </div>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRules.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No rules match the current filters</p>
              </div>
            )}
          </>
        )}
      </div>

      <RuleEditorModal
        isOpen={isEditorOpen}
        rule={selectedRule}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedRule(null);
        }}
        isAdmin={isAdmin}
      />
    </>
  );
}

function AuditLog() {
  const auditEntries = [
    {
      id: '1',
      timestamp: '2026-02-05 14:23:15',
      user: 'admin@company.com',
      action: 'Updated',
      ruleId: 'R-001',
      ruleName: 'EU Resident PII Data Residency',
      changes: 'Modified SQL logic to include additional EU regions',
    },
    {
      id: '2',
      timestamp: '2026-02-04 09:15:42',
      user: 'security@company.com',
      action: 'Created',
      ruleId: 'R-002',
      ruleName: 'Credit Card Masking in Non-Prod',
      changes: 'Initial rule creation',
    },
    {
      id: '3',
      timestamp: '2026-02-03 16:45:28',
      user: 'compliance@company.com',
      action: 'Updated',
      ruleId: 'R-003',
      ruleName: 'Data Retention - 7 Year Policy',
      changes: 'Adjusted retention period calculation',
    },
    {
      id: '4',
      timestamp: '2026-01-28 11:30:00',
      user: 'dev@company.com',
      action: 'Created',
      ruleId: 'R-004',
      ruleName: 'SSN Format Validation',
      changes: 'Initial rule creation from PII guidelines',
    },
    {
      id: '5',
      timestamp: '2025-11-15 13:20:10',
      user: 'admin@company.com',
      action: 'Archived',
      ruleId: 'R-005',
      ruleName: 'Legacy Email Encryption Check',
      changes: 'Marked as stale - no longer applicable',
    },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Info className="w-6 h-6 text-cyan-400" />
        <h2 className="text-2xl font-bold text-white">Audit Log</h2>
      </div>

      <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-black/40 border-b border-white/10">
            <tr>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Timestamp</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rule</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Changes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {auditEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-mono text-sm text-gray-300">{entry.timestamp}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-cyan-400">{entry.user}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                    entry.action === 'Created' ? 'bg-cyan-500/20 text-cyan-400' :
                    entry.action === 'Updated' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {entry.action}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-white font-medium">{entry.ruleId}</div>
                  <div className="text-xs text-gray-500 mt-1">{entry.ruleName}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-300">{entry.changes}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}