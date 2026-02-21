import HealthPulse from './HealthPulse';
import AgentActions from './AgentActions';
import ViolationTriage from './ViolationTriage';
import PolicyUpload from './PolicyUpload';

export default function Dashboard() {
  return (
    <>
      {/* Hero Section */}
      <div className="grid grid-cols-2 gap-6 p-8">
        <div className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl flex items-center justify-center">
          <HealthPulse />
        </div>
        
        <AgentActions />
      </div>
      
      {/* Violation Triage */}
      <ViolationTriage />
      
      {/* Policy Upload */}
      <PolicyUpload />
    </>
  );
}
