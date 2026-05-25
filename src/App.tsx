/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KanbanBoard } from './components/KanbanBoard';
import { 
  Layers, 
  Clock, 
  BarChart4,
  Lock,
  Archive,
  Settings
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function App() {
  const [currentTime, setCurrentTime] = useState('');
  const [activeTab, setActiveTab] = useState<'board' | 'closed' | 'stats' | 'settings'>('board');
  const [sellers, setSellers] = useState<string[]>([]);

  const [userRole, setUserRole] = useState<'ADMIN' | 'VENDEDOR'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_user_role');
      return (saved as 'ADMIN' | 'VENDEDOR') || 'ADMIN';
    }
    return 'ADMIN';
  });

  const [selectedVendedor, setSelectedVendedor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('crm_selected_vendedor') || 'Carlos Pérez';
    }
    return 'Carlos Pérez';
  });

  useEffect(() => {
    // Keep local clock running beautifully 
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (userRole === 'VENDEDOR' && activeTab === 'settings') {
      setActiveTab('board');
    }
  }, [userRole, activeTab]);  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-zinc-800 antialiased">
      
      {/* Sidebar Navigation: Left on Desktop, Top on Mobile */}
      <aside className="w-full md:w-64 bg-[#014ACD] text-white flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#01359c] shrink-0 md:h-screen md:sticky md:top-0 z-40">
        
        {/* Top brand + logo & tabs */}
        <div className="flex flex-col">
          {/* Header row with Brand identity */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shadow-xs">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight font-sans text-white">
                    SupricomCRM
                  </span>
                  <span className="text-[9px] bg-white/20 border border-white/30 text-white px-1.5 py-0.5 rounded font-bold">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] text-white/70 -mt-0.5 font-medium">Gestor de Embudos</p>
              </div>
            </div>

            {/* Micro layout for showing online state on mobile header */}
            <div className="md:hidden flex items-center gap-1.5 text-[10px] bg-white/10 px-2 py-1 rounded-full text-white border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              <span>Activo</span>
            </div>
          </div>

          {/* Navigation links - Scrollable horizontally on mobile, stacked on desktop */}
          <nav className="flex md:flex-col gap-1.5 p-3 overflow-x-auto md:overflow-x-visible pb-3 md:pb-6 scrollbar-none scroll-smooth">
            <button 
              onClick={() => setActiveTab('board')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer text-xs font-bold whitespace-nowrap w-auto md:w-full ${
                activeTab === 'board' 
                  ? 'text-white bg-white/20 border-white/20 shadow-sm font-extrabold' 
                  : 'text-white/60 hover:text-white hover:bg-white/10 border-transparent'
              }`}
            >
              <Layers className="w-4 h-4 text-white" />
              <span>Tablero de Leads</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('closed')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer text-xs font-bold whitespace-nowrap w-auto md:w-full ${
                activeTab === 'closed' 
                  ? 'text-white bg-white/20 border-white/20 shadow-sm font-extrabold' 
                  : 'text-white/60 hover:text-white hover:bg-white/10 border-transparent'
              }`}
            >
              <Archive className="w-4 h-4 text-white" />
              <span>Cierres</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('stats')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer text-xs font-bold whitespace-nowrap w-auto md:w-full ${
                activeTab === 'stats' 
                  ? 'text-white bg-white/20 border-white/20 shadow-sm font-extrabold' 
                  : 'text-white/60 hover:text-white hover:bg-white/10 border-transparent'
              }`}
            >
              <BarChart4 className="w-4 h-4 text-white" />
              <span>Estadísticas / KPIs</span>
            </button>
            
            {userRole === 'ADMIN' && (
              <button 
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer text-xs font-bold whitespace-nowrap w-auto md:w-full ${
                  activeTab === 'settings' 
                    ? 'text-white bg-white/20 border-white/20 shadow-sm font-extrabold' 
                    : 'text-white/60 hover:text-white hover:bg-white/10 border-transparent'
                }`}
              >
                <Settings className="w-4 h-4 text-white" />
                <span>Configuraciones</span>
              </button>
            )}
          </nav>
        </div>

        {/* Bottom utility section (Hidden or rearranged on mobile, tidy on desktop) */}
        <div className="hidden md:flex flex-col gap-3 p-4 border-t border-white/10 bg-white/5">
          {/* Local Real Time Clock */}
          <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl border border-white/5 text-white font-mono text-xs">
            <Clock className="w-4 h-4 text-white/60 flex-shrink-0" />
            <span>{currentTime || '08:00'}</span>
          </div>

          {/* CRM status indicator and role info */}
          <div className="space-y-4 border-t border-white/10 pt-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-white/60 uppercase px-1">Rol de Acceso</span>
              <div className="flex bg-white/10 rounded-lg p-1">
                <button onClick={() => {setUserRole('ADMIN'); setActiveTab('board');}} className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${userRole === 'ADMIN' ? 'bg-white text-[#014ACD]' : 'text-white/60'}`}>Admin</button>
                <button onClick={() => {setUserRole('VENDEDOR'); setActiveTab('board');}} className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${userRole === 'VENDEDOR' ? 'bg-white text-[#014ACD]' : 'text-white/60'}`}>Vendedor</button>
              </div>
            </div>
            {userRole === 'VENDEDOR' && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-white/60 uppercase px-1">Ver Como</span>
                <select value={selectedVendedor} onChange={(e) => setSelectedVendedor(e.target.value)} className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-2 py-2 text-xs cursor-pointer">
                  {sellers.length > 0 ? sellers.map(s => <option key={s} value={s}>{s}</option>) : <option>Sin Asignar</option>}
                </select>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Container Workspace */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <main className="flex-1 pb-16">
          <KanbanBoard 
            userRole={userRole}
            setUserRole={setUserRole}
            selectedVendedor={selectedVendedor}
            setSelectedVendedor={setSelectedVendedor}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onSellersUpdate={setSellers}
          />
        </main>

        {/* Footer Banner */}
        <footer className="bg-white border-t border-zinc-200/60 py-4 text-xs text-zinc-400 text-center">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} ArtemisCRM. Diseñado para integraciones robustas de Webhook con n8n.</p>
            <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-500">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-zinc-400" />
                Estado Seguro
              </span>
              <span>·</span>
              <span>n8n Webhook v1.0</span>
            </div>
          </div>
        </footer>
      </div>

    </div>
  );
}
