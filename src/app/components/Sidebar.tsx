import { Shield, Database, Activity, FileText, ServerCog, LayoutDashboard } from 'lucide-react';

interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems: NavItem[] = [
  { id: 'dashboard', icon: <LayoutDashboard className="w-6 h-6" />, label: 'Dashboard' },
  { id: 'policy', icon: <Shield className="w-6 h-6" />, label: 'Policy Library' },
  { id: 'database', icon: <Database className="w-6 h-6" />, label: 'Database Connections' },
  { id: 'scans', icon: <Activity className="w-6 h-6" />, label: 'Active Scans' },
  { id: 'logs', icon: <FileText className="w-6 h-6" />, label: 'Violation Logs' },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-48 min-h-screen border-r border-white/10 bg-[#0a0a0a]/50 backdrop-blur-xl p-6">
      <div className="flex items-center gap-3 mb-12">
        <ServerCog className="w-8 h-8 text-cyan-400" />
        <div className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">Sentinel</div>
      </div>
      
      <nav className="space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === item.id
                ? 'bg-cyan-400/10 text-cyan-400 border-l-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            {item.icon}
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}