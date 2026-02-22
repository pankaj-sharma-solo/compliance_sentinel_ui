import React, { useState, useEffect, useCallback } from 'react';
import {
    Database, Plus, Trash2, RefreshCw, CheckCircle, XCircle,
    Clock, Edit2, X, Save, AlertTriangle, Shield,
    ChevronDown, ChevronUp, Table2, Zap
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────────────────

type ScanMode = 'CDC' | 'SCHEDULED' | 'MANUAL';

interface DbConnection {
    id              : number;
    name            : string;
    db_type         : string;
    server_region   : string | null;
    scan_mode       : ScanMode;
    cron_expression : string | null;
    schema_mapped   : boolean;
    owner_user_id   : string | null;
    last_scanned_at : string | null;
    created_at      : string | null;
}

interface ConnectionForm {
    name                  : string;
    connection_string_enc : string;
    db_type               : string;
    server_region         : string;
    scan_mode             : ScanMode;
    cron_expression       : string;
    owner_user_id         : string;
}

interface SchemaColumn {
    column_name             : string;
    data_type               : string;
    compliance_category     : string;
    sensitivity             : 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
    applicable_regulations  : string[];
    reason                  : string;
}

interface SchemaTable {
    table_name : string;
    columns    : SchemaColumn[];
}

interface SchemaMapData {
    tables    : SchemaTable[];
    mapped_at : string | null;
}

interface TriggerInfo {
    trigger_name : string;
    table_name   : string;
    event        : string;
    timing       : string;
    statement    : string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_FORM: ConnectionForm = {
    name                  : '',
    connection_string_enc : '',
    db_type               : 'mysql',
    server_region         : '',
    scan_mode             : 'MANUAL',
    cron_expression       : '',
    owner_user_id         : '',
};

const SCAN_MODE_INFO: Record<ScanMode, { label: string; desc: string }> = {
    MANUAL    : { label: 'Manual',    desc: 'Triggered on demand from Active Scans'       },
    SCHEDULED : { label: 'Scheduled', desc: 'Runs on cron schedule automatically'          },
    CDC       : { label: 'CDC',       desc: 'Change Data Capture — real-time event stream' },
};

const SENSITIVITY_STYLES: Record<string, string> = {
    HIGH  : 'bg-red-500/20 text-red-400 border border-red-500/30',
    MEDIUM: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    LOW   : 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    NONE  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

const CATEGORY_STYLES: Record<string, string> = {
    PII_contact : 'text-rose-400',
    PII_gov_id  : 'text-rose-400',
    Financial   : 'text-orange-400',
    Health      : 'text-purple-400',
    Geographic  : 'text-blue-400',
    Internal    : 'text-gray-400',
    None        : 'text-gray-600',
};

const EVENT_STYLES: Record<string, string> = {
    INSERT: 'bg-green-500/20 text-green-400 border border-green-500/30',
    UPDATE: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    DELETE: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

// ── Schema Map Panel ──────────────────────────────────────────────────────────

function SchemaMapPanel({ connectionId }: { connectionId: number }) {
    const [schemaMap, setSchemaMap]         = useState<SchemaMapData | null>(null);
    const [triggers, setTriggers]           = useState<TriggerInfo[]>([]);
    const [loadingSchema, setLoadingSchema] = useState(true);
    const [loadingTriggers, setLoadingTriggers] = useState(true);
    const [expandedTable, setExpandedTable] = useState<string | null>(null);
    const [activeView, setActiveView]       = useState<'schema' | 'triggers'>('schema');

    useEffect(() => {
        // Fetch both in parallel
        Promise.all([
            fetch(`${API_BASE}/connections/${connectionId}/schema-map`)
                .then(r => r.ok ? r.json() : null)
                .then(data => { setSchemaMap(data); setLoadingSchema(false); })
                .catch(() => setLoadingSchema(false)),

            fetch(`${API_BASE}/connections/${connectionId}/triggers`)
                .then(r => r.ok ? r.json() : [])
                .then(data => { setTriggers(data); setLoadingTriggers(false); })
                .catch(() => setLoadingTriggers(false)),
        ]);
    }, [connectionId]);

    return (
        <div className="border-t border-white/5 bg-black/20 p-5">

            {/* Sub-tabs */}
            <div className="flex items-center gap-2 mb-4">
                {(['schema', 'triggers'] as const).map(view => (
                    <button
                        key={view}
                        onClick={() => setActiveView(view)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            activeView === view
                                ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30'
                                : 'text-gray-500 hover:text-gray-300 bg-white/5'
                        }`}
                    >
                        {view === 'schema'
                            ? <><Table2 className="w-3.5 h-3.5" /> Schema Map</>
                            : <><Zap className="w-3.5 h-3.5" /> Tabular Triggers</>
                        }
                    </button>
                ))}
            </div>

            {/* ── Schema Map ── */}
            {activeView === 'schema' && (
                loadingSchema ? (
                    <div className="flex items-center gap-2 text-gray-500 text-xs py-3">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading schema map...
                    </div>
                ) : !schemaMap || schemaMap.tables.length === 0 ? (
                    <p className="text-xs text-gray-500 py-3">No schema map available yet.</p>
                ) : (
                    <>
                        {/* Summary line */}
                        <p className="text-xs text-gray-600 mb-3 font-mono">
                            {schemaMap.mapped_at && `Mapped ${new Date(schemaMap.mapped_at).toLocaleString()} · `}
                            {schemaMap.tables.length} tables ·{' '}
                            {schemaMap.tables.reduce((a, t) => a + t.columns.length, 0)} columns classified
                        </p>

                        <div className="space-y-2">
                            {schemaMap.tables.map(table => {
                                const highCount = table.columns.filter(c => c.sensitivity === 'HIGH').length;
                                const isExpanded = expandedTable === table.table_name;

                                return (
                                    <div key={table.table_name} className="border border-white/5 rounded-lg overflow-hidden">

                                        {/* Table header */}
                                        <div
                                            className="flex items-center justify-between px-4 py-3 bg-black/30 cursor-pointer hover:bg-black/50 transition-all"
                                            onClick={() => setExpandedTable(isExpanded ? null : table.table_name)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Table2 className="w-4 h-4 text-cyan-400/60" />
                                                <span className="text-sm font-mono text-white">{table.table_name}</span>
                                                <span className="text-xs text-gray-500">{table.columns.length} cols</span>
                                                {highCount > 0 && (
                                                    <span className="text-xs px-1.5 py-0.5 bg-red-500/15 text-red-400 border border-red-500/25 rounded font-mono">
                                                        {highCount} HIGH
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Sensitivity summary */}
                                                {(['HIGH', 'MEDIUM', 'LOW'] as const).map(s => {
                                                    const count = table.columns.filter(c => c.sensitivity === s).length;
                                                    if (!count) return null;
                                                    return (
                                                        <span key={s} className={`text-xs px-1.5 py-0.5 rounded font-mono ${SENSITIVITY_STYLES[s]}`}>
                                                            {count} {s[0]}
                                                        </span>
                                                    );
                                                })}
                                                {isExpanded
                                                    ? <ChevronUp className="w-4 h-4 text-gray-500 ml-1" />
                                                    : <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />
                                                }
                                            </div>
                                        </div>

                                        {/* Column details */}
                                        {isExpanded && (
                                            <div className="border-t border-white/5 overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-black/20">
                                                    <tr>
                                                        {['Column', 'Type', 'Category', 'Sensitivity', 'Regulations', 'Risk Reason'].map(h => (
                                                            <th key={h} className="text-left px-4 py-2 text-gray-500 uppercase tracking-wider font-semibold whitespace-nowrap">
                                                                {h}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                    {table.columns.map(col => (
                                                        <tr key={col.column_name} className="hover:bg-white/5 transition-colors">
                                                            <td className="px-4 py-2.5 font-mono text-white whitespace-nowrap">
                                                                {col.column_name}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-gray-500 font-mono whitespace-nowrap">
                                                                {col.data_type}
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                    <span className={`font-medium ${CATEGORY_STYLES[col.compliance_category] ?? 'text-gray-400'}`}>
                                                                        {col.compliance_category}
                                                                    </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                    <span className={`px-1.5 py-0.5 rounded font-mono text-xs ${SENSITIVITY_STYLES[col.sensitivity]}`}>
                                                                        {col.sensitivity}
                                                                    </span>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <div className="flex flex-wrap gap-1 min-w-[120px]">
                                                                    {col.applicable_regulations?.length
                                                                        ? col.applicable_regulations.map(reg => (
                                                                            <span key={reg}
                                                                                  className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded font-mono whitespace-nowrap">
                                                                                    {reg}
                                                                                </span>
                                                                        ))
                                                                        : <span className="text-gray-600">—</span>
                                                                    }
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-gray-400 max-w-xs">
                                                                    <span className="line-clamp-2" title={col.reason}>
                                                                        {col.reason || '—'}
                                                                    </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )
            )}

            {/* ── Tabular Triggers ── */}
            {activeView === 'triggers' && (
                loadingTriggers ? (
                    <div className="flex items-center gap-2 text-gray-500 text-xs py-3">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading triggers...
                    </div>
                ) : triggers.length === 0 ? (
                    <p className="text-xs text-gray-500 py-3">No triggers found on this database.</p>
                ) : (
                    <div className="border border-white/5 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-black/30">
                            <tr>
                                {['Trigger Name', 'Table', 'Timing', 'Event', 'Statement'].map(h => (
                                    <th key={h} className="text-left px-4 py-2.5 text-gray-500 uppercase tracking-wider font-semibold">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                            {triggers.map(t => (
                                <tr key={t.trigger_name} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-2.5 font-mono text-cyan-400">{t.trigger_name}</td>
                                    <td className="px-4 py-2.5 font-mono text-white">{t.table_name}</td>
                                    <td className="px-4 py-2.5 text-gray-400">{t.timing}</td>
                                    <td className="px-4 py-2.5">
                                            <span className={`px-1.5 py-0.5 rounded font-mono ${EVENT_STYLES[t.event] ?? 'bg-gray-500/20 text-gray-400'}`}>
                                                {t.event}
                                            </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-500 font-mono max-w-xs truncate" title={t.statement}>
                                        {t.statement}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DatabaseConnections() {
    const [connections, setConnections] = useState<DbConnection[]>([]);
    const [loading, setLoading]         = useState(true);
    const [showForm, setShowForm]       = useState(false);
    const [form, setForm]               = useState<ConnectionForm>(EMPTY_FORM);
    const [editingId, setEditingId]     = useState<number | null>(null);
    const [saving, setSaving]           = useState(false);
    const [deletingId, setDeletingId]   = useState<number | null>(null);
    const [error, setError]             = useState<string | null>(null);
    const [successMsg, setSuccessMsg]   = useState<string | null>(null);
    const [expandedConn, setExpandedConn] = useState<number | null>(null);  // ← NEW

    useEffect(() => { fetchConnections(); }, []);

    const fetchConnections = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/connections`);
            if (res.ok) setConnections(await res.json());
        } catch {
            setError('Failed to load connections');
        } finally {
            setLoading(false);
        }
    };

    const flash = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 3000);
    };

    const retrySchemaMapping = async (id: number) => {
        await fetch(`${API_BASE}/connections/${id}/map-schema`, { method: 'POST' });
        flash('Schema mapping triggered — refresh in a moment');
    };

    const handleSubmit = async () => {
        if (!form.name || !form.connection_string_enc) {
            setError('Name and connection string are required');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const payload = {
                ...form,
                server_region  : form.server_region   || null,
                cron_expression: form.cron_expression || null,
                owner_user_id  : form.owner_user_id   || null,
            };
            const res = editingId
                ? await fetch(`${API_BASE}/connections/${editingId}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
                : await fetch(`${API_BASE}/connections`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            if (!res.ok) { const err = await res.json(); throw new Error(err.detail ?? 'Save failed'); }
            await fetchConnections();
            setShowForm(false); setEditingId(null); setForm(EMPTY_FORM);
            flash(editingId ? 'Connection updated' : 'Connection registered');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        try {
            await fetch(`${API_BASE}/connections/${id}`, { method: 'DELETE' });
            await fetchConnections();
            if (expandedConn === id) setExpandedConn(null);
            flash('Connection removed');
        } finally {
            setDeletingId(null);
        }
    };

    const startEdit = (conn: DbConnection) => {
        setForm({
            name: conn.name, connection_string_enc: '',
            db_type: conn.db_type, server_region: conn.server_region ?? '',
            scan_mode: conn.scan_mode, cron_expression: conn.cron_expression ?? '',
            owner_user_id: conn.owner_user_id ?? '',
        });
        setEditingId(conn.id); setShowForm(true); setError(null);
    };

    const cancelForm = () => {
        setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setError(null);
    };

    return (
        <div className="p-8">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Database className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-2xl font-bold text-white">Database Connections</h2>
                    <span className="text-xs text-gray-500 font-mono bg-white/5 px-2 py-0.5 rounded-full">
                        {connections.length} registered
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchConnections} className="p-2 text-gray-400 hover:text-cyan-400 transition-colors" title="Refresh">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 text-sm rounded-lg hover:bg-cyan-500/30 hover:border-cyan-400 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Register Connection
                    </button>
                </div>
            </div>

            {/* Toasts */}
            {successMsg && (
                <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" /> {successMsg}
                </div>
            )}
            {error && (
                <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    <XCircle className="w-4 h-4" /> {error}
                </div>
            )}

            {/* Register / Edit Form */}
            {showForm && (
                <div className="mb-6 bg-[#0a0a0a]/60 backdrop-blur-xl border border-cyan-400/20 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-semibold text-white">
                            {editingId ? 'Edit Connection' : 'Register New Connection'}
                        </h3>
                        <button onClick={cancelForm} className="text-gray-500 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Friendly Name *</label>
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                   placeholder="e.g. Production MySQL"
                                   className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400/50 transition-colors" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">DB Type</label>
                            <select value={form.db_type} onChange={e => setForm(f => ({ ...f, db_type: e.target.value }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/50 transition-colors">
                                {['mysql', 'postgresql', 'mssql', 'oracle', 'sqlite'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">
                                Connection String * <span className="text-yellow-400/60 normal-case">(encrypted at rest)</span>
                            </label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                <input type="password" value={form.connection_string_enc}
                                       onChange={e => setForm(f => ({ ...f, connection_string_enc: e.target.value }))}
                                       placeholder={editingId ? 'Leave blank to keep existing' : 'mysql+pymysql://user:pass@host/db'}
                                       className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400/50 transition-colors font-mono" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Server Region</label>
                            <input value={form.server_region} onChange={e => setForm(f => ({ ...f, server_region: e.target.value }))}
                                   placeholder="e.g. us-east-1, eu-west-1"
                                   className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400/50 transition-colors" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Scan Mode</label>
                            <select value={form.scan_mode} onChange={e => setForm(f => ({ ...f, scan_mode: e.target.value as ScanMode }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/50 transition-colors">
                                {(Object.keys(SCAN_MODE_INFO) as ScanMode[]).map(mode => (
                                    <option key={mode} value={mode}>{SCAN_MODE_INFO[mode].label}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-600 mt-1">{SCAN_MODE_INFO[form.scan_mode].desc}</p>
                        </div>
                        {form.scan_mode === 'SCHEDULED' && (
                            <div>
                                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Cron Expression</label>
                                <input value={form.cron_expression} onChange={e => setForm(f => ({ ...f, cron_expression: e.target.value }))}
                                       placeholder="0 2 * * *  (daily at 2am)"
                                       className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 font-mono focus:outline-none focus:border-cyan-400/50 transition-colors" />
                            </div>
                        )}
                        <div>
                            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Owner User ID</label>
                            <input value={form.owner_user_id} onChange={e => setForm(f => ({ ...f, owner_user_id: e.target.value }))}
                                   placeholder="e.g. admin"
                                   className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400/50 transition-colors" />
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 mt-5">
                        <button onClick={cancelForm} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                        <button onClick={handleSubmit} disabled={saving}
                                className="flex items-center gap-2 px-5 py-2 bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 text-sm rounded-lg hover:bg-cyan-500/30 hover:border-cyan-400 transition-all disabled:opacity-50">
                            {saving
                                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                                : <><Save className="w-4 h-4" /> {editingId ? 'Save Changes' : 'Register'}</>
                            }
                        </button>
                    </div>
                </div>
            )}

            {/* Connections List */}
            <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                {loading ? (
                    <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Loading connections...
                    </div>
                ) : connections.length === 0 ? (
                    <div className="text-center py-16">
                        <Database className="w-12 h-12 mx-auto mb-4 text-gray-700" />
                        <p className="text-gray-500 text-sm">No database connections registered yet.</p>
                        <p className="text-gray-600 text-xs mt-1">
                            Click <span className="text-cyan-400">Register Connection</span> to add your first database.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {connections.map(conn => (
                            <div key={conn.id} className="border border-white/5 rounded-lg overflow-hidden">

                                {/* Connection card row */}
                                <div className="flex items-center justify-between p-4 bg-black/40 hover:bg-black/50 transition-all">

                                    {/* Left — info */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                                            <Database className="w-5 h-5 text-cyan-400/70" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-white">{conn.name}</span>
                                                {conn.schema_mapped
                                                    ? <span className="text-xs px-1.5 py-0.5 bg-green-500/15 text-green-400 border border-green-500/25 rounded font-mono">
                                                        Schema mapped
                                                    </span>
                                                    : <button onClick={() => retrySchemaMapping(conn.id)}
                                                              className="text-xs px-1.5 py-0.5 bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 rounded font-mono flex items-center gap-1 hover:bg-yellow-500/25 transition-colors">
                                                        <AlertTriangle className="w-3 h-3" /> Unmapped — click to map
                                                    </button>
                                                }
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                <span className="uppercase font-mono">{conn.db_type}</span>
                                                {conn.server_region && <span>· {conn.server_region}</span>}
                                                <span>· {SCAN_MODE_INFO[conn.scan_mode].label}</span>
                                                {conn.cron_expression && (
                                                    <span className="font-mono text-gray-600">({conn.cron_expression})</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right — actions */}
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                                                <Clock className="w-3 h-3" />
                                                {conn.last_scanned_at
                                                    ? `Last scan ${new Date(conn.last_scanned_at).toLocaleDateString()}`
                                                    : 'Never scanned'
                                                }
                                            </div>
                                            {conn.owner_user_id && (
                                                <div className="text-xs text-gray-600 mt-0.5">Owner: {conn.owner_user_id}</div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => startEdit(conn)}
                                                    className="p-2 text-gray-500 hover:text-cyan-400 transition-colors rounded-lg hover:bg-cyan-400/10" title="Edit">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(conn.id)} disabled={deletingId === conn.id}
                                                    className="p-2 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10 disabled:opacity-40" title="Delete">
                                                {deletingId === conn.id
                                                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                                                    : <Trash2 className="w-4 h-4" />
                                                }
                                            </button>
                                            {/* ── Expand toggle ── */}
                                            <button
                                                onClick={() => setExpandedConn(expandedConn === conn.id ? null : conn.id)}
                                                className="p-2 text-gray-500 hover:text-cyan-400 transition-colors rounded-lg hover:bg-cyan-400/10"
                                                title="View schema map & triggers"
                                            >
                                                {expandedConn === conn.id
                                                    ? <ChevronUp className="w-4 h-4" />
                                                    : <ChevronDown className="w-4 h-4" />
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Expand panel ── */}
                                {expandedConn === conn.id && (
                                    <SchemaMapPanel connectionId={conn.id} />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
