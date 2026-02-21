import { useState } from 'react';
import { Search, Download, Calendar, AlertTriangle, Eye } from 'lucide-react';

interface ViolationLog {
  id: string;
  timestamp: string;
  recordId: string;
  table: string;
  ruleId: string;
  ruleName: string;
  severity: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Remediated' | 'Dismissed';
  detectedBy: string;
  remediatedBy?: string;
  remediationDate?: string;
}

const mockLogs: ViolationLog[] = [
  {
    id: 'V-1234',
    timestamp: '2026-02-05 14:23:15',
    recordId: '8829',
    table: 'users_raw',
    ruleId: 'R-001',
    ruleName: 'EU Resident PII Data Residency',
    severity: 'High',
    status: 'Remediated',
    detectedBy: 'Sentinel Agent',
    remediatedBy: 'admin@company.com',
    remediationDate: '2026-02-05 15:10:42',
  },
  {
    id: 'V-1235',
    timestamp: '2026-02-05 14:24:03',
    recordId: '8830',
    table: 'users_raw',
    ruleId: 'R-001',
    ruleName: 'EU Resident PII Data Residency',
    severity: 'High',
    status: 'Open',
    detectedBy: 'Sentinel Agent',
  },
  {
    id: 'V-1236',
    timestamp: '2026-02-05 13:15:28',
    recordId: 'S52',
    table: 'financial_data',
    ruleId: 'R-002',
    ruleName: 'Credit Card Masking in Non-Prod',
    severity: 'High',
    status: 'Open',
    detectedBy: 'Sentinel Agent',
  },
  {
    id: 'V-1237',
    timestamp: '2026-02-05 12:45:10',
    recordId: '1kmq-187djw2',
    table: 'financial_data',
    ruleId: 'R-003',
    ruleName: 'Data Retention - 7 Year Policy',
    severity: 'Medium',
    status: 'Open',
    detectedBy: 'Sentinel Agent',
  },
  {
    id: 'V-1238',
    timestamp: '2026-02-04 18:30:55',
    recordId: '7721',
    table: 'users_raw',
    ruleId: 'R-004',
    ruleName: 'SSN Format Validation',
    severity: 'Low',
    status: 'Remediated',
    detectedBy: 'Sentinel Agent',
    remediatedBy: 'dev@company.com',
    remediationDate: '2026-02-04 19:15:20',
  },
  {
    id: 'V-1239',
    timestamp: '2026-02-04 16:20:12',
    recordId: '4521',
    table: 'customer_data',
    ruleId: 'R-001',
    ruleName: 'EU Resident PII Data Residency',
    severity: 'High',
    status: 'Dismissed',
    detectedBy: 'Sentinel Agent',
  },
  {
    id: 'V-1240',
    timestamp: '2026-02-04 15:10:45',
    recordId: 'T894',
    table: 'transactions',
    ruleId: 'R-002',
    ruleName: 'Credit Card Masking in Non-Prod',
    severity: 'High',
    status: 'Remediated',
    detectedBy: 'Sentinel Agent',
    remediatedBy: 'security@company.com',
    remediationDate: '2026-02-04 15:45:30',
  },
  {
    id: 'V-1241',
    timestamp: '2026-02-04 14:05:33',
    recordId: '9012',
    table: 'financial_data',
    ruleId: 'R-003',
    ruleName: 'Data Retention - 7 Year Policy',
    severity: 'Medium',
    status: 'Open',
    detectedBy: 'Sentinel Agent',
  },
  {
    id: 'V-1242',
    timestamp: '2026-02-04 11:22:18',
    recordId: '3456',
    table: 'users_raw',
    ruleId: 'R-001',
    ruleName: 'EU Resident PII Data Residency',
    severity: 'High',
    status: 'Remediated',
    detectedBy: 'Sentinel Agent',
    remediatedBy: 'admin@company.com',
    remediationDate: '2026-02-04 12:05:10',
  },
  {
    id: 'V-1243',
    timestamp: '2026-02-03 16:45:50',
    recordId: '6789',
    table: 'customer_data',
    ruleId: 'R-004',
    ruleName: 'SSN Format Validation',
    severity: 'Low',
    status: 'Open',
    detectedBy: 'Sentinel Agent',
  },
];

export default function ViolationLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const filteredLogs = mockLogs.filter((log) => {
    const matchesSearch = 
      log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.recordId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.table.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ruleName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const handleExportCSV = () => {
    const headers = ['Violation_ID', 'Timestamp', 'Record_ID', 'Table', 'Rule_ID', 'Rule_Name', 'Severity', 'Status', 'Detected_By', 'Remediated_By', 'Remediation_Date'];
    const rows = filteredLogs.map(log => [
      log.id,
      log.timestamp,
      log.recordId,
      log.table,
      log.ruleId,
      log.ruleName,
      log.severity,
      log.status,
      log.detectedBy,
      log.remediatedBy || '',
      log.remediationDate || '',
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `violation-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const severityColors = {
    High: 'text-rose-400 bg-rose-500/20 border-rose-500/50',
    Medium: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50',
    Low: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/50',
  };

  const statusColors = {
    Open: 'text-rose-400 bg-rose-500/20 border-rose-500/50',
    Remediated: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/50',
    Dismissed: 'text-gray-400 bg-gray-500/20 border-gray-500/50',
  };

  const stats = {
    total: mockLogs.length,
    open: mockLogs.filter(l => l.status === 'Open').length,
    remediated: mockLogs.filter(l => l.status === 'Remediated').length,
    dismissed: mockLogs.filter(l => l.status === 'Dismissed').length,
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-rose-400" />
          <h2 className="text-2xl font-bold text-white">Violation Logs</h2>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1 bg-rose-500/20 text-rose-400 rounded-full text-sm font-semibold">
            {stats.open} Open
          </div>
          <div className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm font-semibold">
            {stats.remediated} Remediated
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl p-5">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Total Violations</div>
          <div className="text-3xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-rose-500/30 rounded-xl p-5">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Open</div>
          <div className="text-3xl font-bold text-rose-400">{stats.open}</div>
        </div>
        <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-5">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Remediated</div>
          <div className="text-3xl font-bold text-cyan-400">{stats.remediated}</div>
        </div>
        <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-gray-500/30 rounded-xl p-5">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Dismissed</div>
          <div className="text-3xl font-bold text-gray-400">{stats.dismissed}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Violation ID, Record ID, Table, or Rule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50"
            />
          </div>

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
            <option value="Open" className="bg-[#0a0a0a]">Open</option>
            <option value="Remediated" className="bg-[#0a0a0a]">Remediated</option>
            <option value="Dismissed" className="bg-[#0a0a0a]">Dismissed</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400/50"
          >
            <option value="all" className="bg-[#0a0a0a]">All Time</option>
            <option value="today" className="bg-[#0a0a0a]">Today</option>
            <option value="week" className="bg-[#0a0a0a]">This Week</option>
            <option value="month" className="bg-[#0a0a0a]">This Month</option>
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

      {/* Logs Table */}
      <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/40 border-b border-white/10">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Timestamp</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Record</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rule</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Severity</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-cyan-400 text-sm">{log.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-mono text-sm text-gray-300">{log.timestamp}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white font-medium">{log.recordId}</div>
                    <div className="text-xs text-gray-500 mt-1">{log.table}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white font-medium">{log.ruleId}</div>
                    <div className="text-xs text-gray-500 mt-1">{log.ruleName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${severityColors[log.severity]}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${statusColors[log.status]}`}>
                      {log.status}
                    </span>
                    {log.remediatedBy && (
                      <div className="text-xs text-gray-500 mt-1">by {log.remediatedBy}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      className="p-2 hover:bg-cyan-400/10 text-cyan-400 rounded-lg transition-all"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
