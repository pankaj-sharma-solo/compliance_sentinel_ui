import { useState } from 'react';
import Sidebar from './components/Sidebar';
import RoleToggle from './components/RoleToggle';
import Dashboard from './components/Dashboard';
import PolicyLibrary from './components/PolicyLibrary';
import ViolationLogs from './components/ViolationLogs';
import ActiveScans from "./components/ActiveScans.tsx";
import DatabaseConnections from "./components/DatabaseConnections.tsx";

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAdmin, setIsAdmin] = useState(true);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-1">
          {/* Header */}
          <header className="border-b border-white/10 bg-[#0a0a0a]/50 backdrop-blur-xl px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Data Compliance & Policy Enforcement</h1>
                <p className="text-gray-400 text-sm mt-1">Real-time monitoring and automated remediation</p>
              </div>
              <RoleToggle isAdmin={isAdmin} onToggle={() => setIsAdmin(!isAdmin)} />
            </div>
          </header>
          
          {/* Content */}
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'policy' && <PolicyLibrary isAdmin={isAdmin} />}
          {activeTab === 'logs' && <ViolationLogs />}
          {activeTab === 'scans' && <ActiveScans />}
          {activeTab == 'database' && <DatabaseConnections />}
          {/*{activeTab === 'database' && (*/}
          {/*  <div className="p-8">*/}
          {/*    <h2 className="text-2xl font-bold text-white mb-4">Database Connections</h2>*/}
          {/*    <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center">*/}
          {/*      <p className="text-gray-400">Database Connections module coming soon...</p>*/}
          {/*    </div>*/}
          {/*  </div>*/}
          {/*)}*/}
          {/*{activeTab === 'scans' && (*/}
          {/*  <div className="p-8">*/}
          {/*    <h2 className="text-2xl font-bold text-white mb-4">Active Scans</h2>*/}
          {/*    <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center">*/}
          {/*      <p className="text-gray-400">Active Scans module coming soon...</p>*/}
          {/*    </div>*/}
          {/*  </div>*/}
          {/*)}*/}
        </main>
      </div>
    </div>
  );
}
