/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { KanbanBoard } from './components/KanbanBoard';
import { LoginScreen } from './components/LoginScreen';
import { 
  Layers, 
  Clock, 
  BarChart4,
  Lock,
  Archive,
  Settings,
  LogOut
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function App() {
  const [currentTime, setCurrentTime] = useState('');
  const [activeTab, setActiveTab] = useState<'board' | 'closed' | 'stats' | 'settings'>('board');
  const [sellers, setSellers] = useState<any[]>([]);
  const [vendorRank, setVendorRank] = useState<{rank: number, rate: number, tier: string | null} | null>(null);

  const [session, setSession] = useState<{ id: number; name: string; role: 'ADMIN' | 'VENDEDOR' } | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_session');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const userRole = session?.role || 'VENDEDOR';
  const selectedVendedor = session?.name || '';

  const setUserRole = (role: 'ADMIN' | 'VENDEDOR') => {
    if (session) {
      const updated = { ...session, role };
      setSession(updated);
      localStorage.setItem('crm_session', JSON.stringify(updated));
    }
  };

  const setSelectedVendedor = (name: string) => {
    if (session) {
      const updated = { ...session, name };
      setSession(updated);
      localStorage.setItem('crm_session', JSON.stringify(updated));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('crm_session');
    setSession(null);
  };

  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
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
  }, [userRole, activeTab]);

  if (!session) {
    return <LoginScreen onLogin={(user) => setSession(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-zinc-800 antialiased">
      
      <aside className="w-full md:w-64 bg-[#014ACD] text-white flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#01359c] shrink-0 md:h-screen md:sticky md:top-0 z-40">
        
        <div className="flex flex-col">
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
            <div className="md:hidden flex items-center gap-1.5 text-[10px] bg-white/10 px-2 py-1 rounded-full text-white border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              <span>Activo</span>
            </div>
          </div>

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

        <div className="hidden md:flex flex-col gap-3 p-4 border-t border-white/10 bg-white/5">
          <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl border border-white/5 text-white font-mono text-xs">
            <Clock className="w-4 h-4 text-white/60 flex-shrink-0" />
            <span>{currentTime || '08:00'}</span>
          </div>

          <div className="space-y-3 border-t border-white/10 pt-3">
            <div className="flex items-center gap-2.5 px-3 py-2 bg-white/10 rounded-xl border border-white/10">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-extrabold text-white">
                {session.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{session.name}</p>
                <p className="text-[10px] text-white/50">{userRole === 'ADMIN' ? 'Administrador' : 'Vendedor'}</p>
              </div>
            </div>

            {userRole === 'VENDEDOR' && vendorRank && (
              <div className="px-3 py-2.5 rounded-xl bg-white/10 border border-white/10">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1">Tu Ranking</span>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{vendorRank.rank === 0 ? '🥇' : vendorRank.rank === 1 ? '🥈' : vendorRank.rank === 2 ? '🥉' : '🏅'}</span>
                    <div>
                      <span className="text-white font-extrabold text-sm">#{vendorRank.rank + 1}</span>
                      {vendorRank.tier && <span className="text-white/60 text-[10px] font-bold ml-1.5">{vendorRank.tier}</span>}
                    </div>
                  </div>
                  <span className={`text-sm font-black ${vendorRank.rate >= 100 ? 'text-amber-300' : vendorRank.rate >= 80 ? 'text-slate-300' : vendorRank.rate >= 60 ? 'text-orange-300' : 'text-white/50'}`}>
                    {vendorRank.rate}%
                  </span>
                </div>
              </div>
            )}
            
            <button
              onClick={() => setShowChangePassword(true)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors text-xs font-bold"
            >
              <Lock className="w-4 h-4" />
              Cambiar Contraseña
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors text-xs font-bold"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

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
            sellers={sellers}
            onVendorRankUpdate={setVendorRank}
          />
        </main>

        {showChangePassword && session && (
          <ChangePasswordModal userId={session.id} onClose={() => setShowChangePassword(false)} />
        )}
        
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
