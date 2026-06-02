import React, { useState, useEffect, useMemo } from 'react';
import { BarChart4, CheckCircle2, DollarSign, Clock, Calendar, Trophy } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Column {
  id: string;
  title: string;
  color: string;
}

// ─── StatsBoardProps ──────────────────────────────────────────────────────────

interface StatsBoardProps {
  userRole: 'ADMIN' | 'VENDEDOR';
  selectedVendedor: string;
}

export const StatsBoard: React.FC<StatsBoardProps> = ({ userRole, selectedVendedor }) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('Todos');

  const columns: Column[] = useMemo(() => {
    const defaults = [
      { id: 'NUEVO', title: 'NUEVO', color: 'bg-blue-500' },
      { id: 'CONTACTADO', title: 'CONTACTADO', color: 'bg-amber-500' },
      { id: 'NEGOCIANDO', title: 'NEGOCIANDO', color: 'bg-pink-500' },
      { id: 'CERRADO', title: 'CERRADO', color: 'bg-zinc-500' },
    ];
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_kanban_columns');
      if (saved) {
        try { return JSON.parse(saved); } catch { return defaults; }
      }
    }
    return defaults;
  }, []);

  useEffect(() => {
    fetch('/api/leads').then(r => r.json()).then(data => { if (Array.isArray(data)) setLeads(data); }).catch(() => {});
    fetch('/api/sellers').then(r => r.json()).then(data => { if (Array.isArray(data)) setSellers(data); }).catch(() => {});
  }, []);

  const sellersMap = useMemo(() => {
    const map: Record<string, string> = {};
    sellers.forEach(s => { if (s?.id != null) map[s.id.toString()] = s.name || ''; });
    return map;
  }, [sellers]);

  const sellersPerformance = useMemo(() => {
    return sellers.map(seller => {
      const vName = seller.name || 'Sin Asignar';
      const vLeads = leads.filter(l => (l.seller_name || '').trim().toLowerCase() === vName.toLowerCase());
      const vActive = vLeads.filter(l => !['CERRADO_VENTA', 'CERRADO_ABANDONADO', 'CERRADO'].includes(l.estatus)).length;
      const vWon = vLeads.filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO').length;
      const vLost = vLeads.filter(l => l.estatus === 'CERRADO_ABANDONADO').length;
      const totalClosed = vWon + vLost;
      const vRate = totalClosed > 0 ? Math.round((vWon / totalClosed) * 100) : 0;
      const vRev = vLeads.filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO').reduce((sum, l) => sum + (l.valorEstimado || 0), 0);
      const vClosedWithDates = vLeads.filter(l => ['CERRADO_VENTA', 'CERRADO', 'CERRADO_ABANDONADO'].includes(l.estatus) && l.fechaIngreso && l.fechaVenta);
      const vTotalClosureDays = vClosedWithDates.reduce((sum, l) => sum + Math.round((new Date(l.fechaVenta).getTime() - new Date(l.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24)), 0);
      const vAverageClosureTime = vClosedWithDates.length > 0 ? Math.round(vTotalClosureDays / vClosedWithDates.length) : 0;
      return { vName, total: vLeads.length, vActive, vWon, vLost, vRate, vRev, vAverageClosureTime };
    }).sort((a, b) => {
      if (b.vRate !== a.vRate) return b.vRate - a.vRate;
      if (b.vWon !== a.vWon) return b.vWon - a.vWon;
      return b.vRev - a.vRev;
    });
  }, [sellers, leads]);

  const currentFilter = userRole === 'ADMIN' ? selectedVendorFilter : selectedVendedor;

  const localStatsLeads = currentFilter === 'Todos'
    ? leads
    : leads.filter(l => {
        const sellerName = sellersMap[l.seller_id?.toString()] || l.vendedor || 'Sin Asignar';
        return sellerName.trim().toLowerCase() === currentFilter.trim().toLowerCase();
      });

  const CLOSED = ['CERRADO_VENTA', 'CERRADO', 'CERRADO_ABANDONADO'];
  const localClosed = localStatsLeads.filter(l => CLOSED.includes(l.estatus));
  const localSales = localClosed.filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO');
  const localSalesCount = localSales.length;
  const localSalesValue = localSales.reduce((sum, l) => sum + (l.valorEstimado || 0), 0);
  const localConversionPct = localClosed.length > 0 ? Math.round((localSalesCount / localClosed.length) * 100) : 0;

  const closedWithDates = localStatsLeads.filter(l =>
    (l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO') &&
    l.fechaIngreso && l.fechaVentaISO &&
    !isNaN(new Date(l.fechaIngreso).getTime()) &&
    !isNaN(new Date(l.fechaVentaISO).getTime())
  );
  const totalClosureMinutes = closedWithDates.reduce((sum, l) =>
    sum + Math.max(0, Math.round((new Date(l.fechaVentaISO).getTime() - new Date(l.fechaIngreso).getTime()) / (1000 * 60))), 0);
  const avgClosureTime = closedWithDates.length > 0 ? Math.round(totalClosureMinutes / closedWithDates.length) : 0;

  const leadsConContacto = localStatsLeads.filter(l => l.tiempoPrimerContacto != null);
  const totalMinContacto = leadsConContacto.reduce((sum, l) => sum + Number(l.tiempoPrimerContacto), 0);
  const avgContactoMin = leadsConContacto.length > 0 ? Math.round(totalMinContacto / leadsConContacto.length) : 0;

  const formatMin = (min: number): string => {
    if (min <= 0) return '—';
    const dias = Math.floor(min / (24 * 60));
    const horas = Math.floor((min % (24 * 60)) / 60);
    const minutos = min % 60;
    const p = [];
    if (dias > 0) p.push(`${dias}d`);
    if (horas > 0) p.push(`${horas}h`);
    if (minutos > 0 || p.length === 0) p.push(`${minutos}m`);
    return p.join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
        <h2 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
          <BarChart4 className="w-5 h-5 text-blue-600" />
          Estadísticas de Rendimiento y Conversión
        </h2>
        {userRole === 'ADMIN' ? (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs font-bold text-zinc-500 uppercase">Filtrar por vendedor:</span>
            <select value={selectedVendorFilter} onChange={e => setSelectedVendorFilter(e.target.value)} className="p-1 border rounded text-xs">
              <option value="Todos">Todos</option>
              {sellers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        ) : (
          <div className="mt-3">
            <span className="text-xs font-bold text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-lg inline-block">
              👤 Vista Comercial: <span className="text-blue-700 font-extrabold">{selectedVendedor}</span>
            </span>
          </div>
        )}
        <p className="text-xs text-zinc-500 mt-2">Métricas consolidadas en tiempo real directamente desde MySQL.</p>
      </div>

      {/* Top vendedores */}
      {userRole === 'ADMIN' && (
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" /> Top Vendedores por Efectividad de Cierre
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 items-end justify-center">
            {[...sellersPerformance].sort((a, b) => b.vRate - a.vRate).slice(0, 3).map((seller, idx) => {
              const medals = ['🥇', '🥈', '🥉'];
              const tiers = [
                { label: 'Oro', minRate: 100, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600' },
                { label: 'Plata', minRate: 80, bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600' },
                { label: 'Bronce', minRate: 60, bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
              ];
              const tier = tiers[idx];
              const qualifies = seller.vRate >= tier.minRate;
              return (
                <div key={seller.vName} className={`flex-1 flex flex-col items-center gap-2 p-5 rounded-2xl border ${tier.bg} ${tier.border} ${!qualifies ? 'opacity-40' : ''}`}>
                  <span className="text-4xl">{medals[idx]}</span>
                  <span className="text-sm font-extrabold text-zinc-900 text-center truncate w-full">{seller.vName}</span>
                  <span className={`text-3xl font-black ${tier.text}`}>{seller.vRate}%</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${tier.border} ${tier.text} ${tier.bg}`}>{tier.label} · {tier.minRate}%+</span>
                  <span className="text-[11px] text-zinc-500">{seller.vWon} cierres por venta</span>
                  {!qualifies && <span className="text-[10px] text-red-400 font-bold mt-1">No alcanza el umbral</span>}
                </div>
              );
            })}
            {sellersPerformance.length === 0 && <p className="text-zinc-400 text-sm text-center py-8 w-full">Sin datos de vendedores aún.</p>}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
          <div><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Cierres con Venta</span><span className="text-xl font-black text-emerald-700 mt-1 block">{localSalesCount} leads</span></div>
          <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 className="w-5 h-5" /></span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
          <div><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Recaudado USD</span><span className="text-xl font-bold mt-1 block">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(localSalesValue)}</span></div>
          <span className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><DollarSign className="w-5 h-5" /></span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
          <div><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Tiempo Primer Contacto</span><span className="text-xl font-black text-indigo-700 mt-1 block font-mono">{formatMin(avgContactoMin)}</span></div>
          <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg"><Clock className="w-5 h-5" /></span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
          <div><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Tiempo Promedio Cierre</span><span className="text-xl font-black text-indigo-700 mt-1 block font-mono">{formatMin(avgClosureTime)}</span></div>
          <span className="p-2.5 bg-amber-50 text-amber-600 rounded-lg"><Calendar className="w-5 h-5" /></span>
        </div>
      </div>

      {/* Gráficas circulares */}
      <div className="flex flex-col md:flex-row gap-6 justify-center">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col items-center flex-1 max-w-xs mx-auto md:mx-0">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pb-4 self-start">Tasa de Efectividad</h3>
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="80" cy="80" r="65" className="stroke-zinc-100" strokeWidth="10" fill="transparent" />
              <circle cx="80" cy="80" r="65" className="stroke-emerald-500 transition-all duration-1000" strokeWidth="12"
                strokeDasharray={408.4} strokeDashoffset={408.4 - (408.4 * localConversionPct) / 100}
                strokeLinecap="round" fill="transparent" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-extrabold text-zinc-900">{localConversionPct}%</span>
              <span className="text-[10px] text-zinc-400 font-bold uppercase">Eficiencia</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col items-center flex-1 max-w-xs mx-auto md:mx-0">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pb-4 self-start">Tasa de Reactivación</h3>
          {(() => {
            const reactivados = localStatsLeads.filter(l => (l.reactivaciones || 0) > 0).length;
            const sinReactivar = localStatsLeads.filter(l => ['CERRADO_VENTA', 'CERRADO_ABANDONADO', 'CERRADO'].includes(l.estatus) && !((l.reactivaciones || 0) > 0)).length;
            const total = reactivados + sinReactivar;
            const pct = total > 0 ? Math.min(Math.round((reactivados / total) * 100), 100) : 0;
            return (
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="65" className="stroke-zinc-100" strokeWidth="10" fill="transparent" />
                  <circle cx="80" cy="80" r="65" className="stroke-blue-500 transition-all duration-1000" strokeWidth="12"
                    strokeDasharray={408.4} strokeDashoffset={408.4 - (408.4 * pct) / 100}
                    strokeLinecap="round" fill="transparent" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-extrabold text-zinc-900">{pct}%</span>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">Reactivados</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Distribución por etapa */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pb-4">Distribución de Leads por Etapa</h3>
        <div className="space-y-3">
          {columns.filter(c => c.id !== 'CERRADO').map(col => {
            const active = localStatsLeads.filter(l => !['CERRADO_VENTA', 'CERRADO_ABANDONADO', 'CERRADO'].includes(l.estatus));
            const amt = active.filter(l => l.estatus === col.id).length;
            const ratio = active.length > 0 ? (amt / active.length) * 100 : 0;
            return (
              <div key={col.id} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-800 flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${col.color}`} />{col.title}</span>
                  <span className="text-zinc-500 font-mono">{amt} leads</span>
                </div>
                <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full rounded-full ${col.color}`} style={{ width: `${Math.max(ratio, amt > 0 ? 2 : 0)}%` }} />
                </div>
              </div>
            );
          })}
          <div className="pt-2 space-y-2 border-t border-zinc-100">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Cierre</p>
            {[
              { label: 'Venta', color: 'bg-emerald-500', filter: (l: any) => l.estatus === 'CERRADO_VENTA' },
              { label: 'Abandonado', color: 'bg-red-500', filter: (l: any) => l.estatus === 'CERRADO_ABANDONADO' || l.estatus === 'CERRADO' },
            ].map(({ label, color, filter }) => {
              const amt = localStatsLeads.filter(filter).length;
              const ratio = localStatsLeads.length > 0 ? (amt / localStatsLeads.length) * 100 : 0;
              return (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-800 flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${color}`} />{label}</span>
                    <span className="text-zinc-500 font-mono">{amt} leads</span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(ratio, amt > 0 ? 2 : 0)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabla de rendimiento por vendedor */}
      {userRole === 'ADMIN' && (
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Rendimiento por Vendedores</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 font-bold bg-zinc-50/50">
                  <th className="p-3">Vendedor</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Activos</th>
                  <th className="p-3">Ganados</th>
                  <th className="p-3">Perdidos</th>
                  <th className="p-3 text-right">Recaudado</th>
                  <th className="p-3 text-center">Conversión</th>
                  <th className="p-3 text-center">T. Promedio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {sellersPerformance.map(s => (
                  <tr key={s.vName} className="hover:bg-zinc-50/45 text-zinc-700">
                    <td className="p-3 font-bold text-zinc-900">{s.vName}</td>
                    <td className="p-3 font-semibold">{s.total}</td>
                    <td className="p-3 text-zinc-500">{s.vActive}</td>
                    <td className="p-3 font-bold text-emerald-700">{s.vWon}</td>
                    <td className="p-3 text-zinc-400">{s.vLost}</td>
                    <td className="p-3 text-right font-bold">${s.vRev.toLocaleString()}</td>
                    <td className="p-3 text-center"><span className="px-2 py-0.5 bg-zinc-100 rounded font-bold font-mono">{s.vRate}%</span></td>
                    <td className="p-3 text-center text-zinc-600">{s.vAverageClosureTime > 0 ? `${s.vAverageClosureTime} días` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsBoard;
