import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  DndContext, DragEndEvent, DragStartEvent, DragOverlay,
  useSensor, useSensors, PointerSensor, TouchSensor,
  useDroppable, useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, CheckCircle2, TrendingUp, Users2, Trash2,
  LayoutGrid, Table, Search, X, Building2, Phone,
  MapPin, GripVertical, DollarSign, Clock, Loader2,
  Edit3, FileText, FolderOpen,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  nombre: string;
  empresa: string;
  rif?: string;
  telefono: string;
  ubicacionEstado?: string;
  ubicacionDetalle?: string;
  canalOrigen?: string;
  campana?: string;
  vendedor?: string;
  seller_name?: string;
  estatus: string;
  notas?: string;
  valorEstimado: number;
  numFactura?: string;
  fechaVenta?: string;
  fechaIngreso?: string;
  categoriaInteres?: string;
  motivoCierre?: string;
  hasPassedContactado?: boolean;
  seller_id?: number;
  reactivaciones?: number;
  tiempoPrimerContacto?: number | null;
}

interface Column {
  id: string;
  title: string;
  color: string;
  bgClass: string;
  borderClass: string;
  accentClass: string;
  textClass: string;
}

const COLOR_PRESETS = [
  { color: 'bg-indigo-500', bgClass: 'bg-[#faf5ff]', borderClass: 'border-indigo-200', accentClass: 'bg-indigo-100', textClass: 'text-indigo-700' },
  { color: 'bg-purple-500', bgClass: 'bg-[#faf5ff]', borderClass: 'border-purple-200', accentClass: 'bg-purple-100', textClass: 'text-purple-700' },
  { color: 'bg-orange-500', bgClass: 'bg-[#fff7ed]', borderClass: 'border-orange-200', accentClass: 'bg-orange-100', textClass: 'text-orange-700' },
  { color: 'bg-pink-500', bgClass: 'bg-[#fff1f2]', borderClass: 'border-pink-200', accentClass: 'bg-pink-100', textClass: 'text-pink-700' },
];

// ─── LeadCard ─────────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead: Lead;
  isUpdating: boolean;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onCloseLead?: (lead: Lead) => void;
  userRole?: 'ADMIN' | 'VENDEDOR';
  onSecondPurchase?: (lead: Lead) => void;
  onChangeClosureType?: (lead: Lead) => void;
  onTransfer?: (lead: Lead, newVendedor: string) => void;
  vendorList?: string[];
  isDragging?: boolean;
}

const LeadCard: React.FC<LeadCardProps> = ({
  lead, isUpdating, onEdit, onDelete, onCloseLead, userRole = 'ADMIN',
  onSecondPurchase, onChangeClosureType, onTransfer, vendorList = [],
}) => {
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const transferMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (transferMenuRef.current && !transferMenuRef.current.contains(event.target as Node))
        setIsTransferOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    disabled: isUpdating,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : isUpdating ? 0.8 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const formattedValue = lead.valorEstimado
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(lead.valorEstimado)
    : null;

  const creationDate = lead.fechaIngreso
    ? new Date(lead.fechaIngreso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })
    : 'S/F';

  return (
    <div
      id={`lead-card-${lead.id}`}
      ref={setNodeRef}
      style={style}
      className={`relative group bg-white border rounded-xl shadow-xs transition-shadow duration-200 hover:shadow-md
        ${isUpdating ? 'border-amber-300 ring-1 ring-amber-300 bg-amber-50/20' : 'border-zinc-200/80 hover:border-zinc-300'}
        ${isDragging ? 'scale-[1.02] cursor-grabbing border-blue-400 ring-2 ring-blue-500/10 shadow-lg' : ''}
      `}
    >
      {isUpdating && (
        <div className="absolute inset-x-0 top-0 h-1 bg-amber-500 rounded-t-xl overflow-hidden">
          <div className="w-full h-full bg-amber-400 animate-pulse" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-zinc-800 tracking-tight leading-tight truncate group-hover:text-blue-600 transition-colors">{lead.nombre}</h4>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500 font-medium">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
              <span className="truncate">{lead.empresa}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button {...attributes} {...listeners}
              className={`p-1 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors cursor-grab ${isUpdating ? 'opacity-30 cursor-not-allowed' : ''}`}
              title="Arrastrar lead">
              <GripVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5 my-3 text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            <a href={`tel:${lead.telefono}`} className="hover:underline truncate">{lead.telefono || 'Sin teléfono'}</a>
          </div>
          {lead.rif && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded leading-none">RIF</span>
              <span className="truncate text-zinc-500">{lead.rif}</span>
            </div>
          )}
          {(lead.ubicacionEstado || lead.ubicacionDetalle) && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              <span className="truncate">{lead.ubicacionEstado}{lead.ubicacionDetalle ? ` (${lead.ubicacionDetalle})` : ''}</span>
            </div>
          )}
          {lead.canalOrigen && (
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium border border-slate-200">{lead.canalOrigen}</span>
              {lead.campana && <span className="truncate italic text-zinc-400">{lead.campana}</span>}
            </div>
          )}
        </div>

        {lead.notas && (
          <div className="mt-2.5 p-2 bg-zinc-50 rounded-lg text-xs text-zinc-500 line-clamp-2 border border-zinc-100">
            <div className="flex items-start gap-1">
              <FileText className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
              <p className="leading-relaxed italic">"{lead.notas}"</p>
            </div>
          </div>
        )}

        {(lead.estatus === 'CERRADO_VENTA' || lead.estatus === 'CERRADO' || lead.estatus === 'CERRADO_ABANDONADO') && (() => {
          let closedPct = 0;
          let daysLeftStr = '';
          if (lead.fechaVenta) {
            const saleDate = new Date(lead.fechaVenta).getTime();
            if (!isNaN(saleDate)) {
              const elapsed = Math.max(0, (new Date().getTime() - saleDate) / (1000 * 60 * 60 * 24));
              closedPct = Math.min(100, (elapsed / 30) * 100);
              const rem = Math.max(0, 30 - elapsed);
              daysLeftStr = rem > 0 ? `${Math.ceil(rem)}d restantes` : 'Expiró (30 días)';
            }
          }
          return (
            <div className="mt-2.5 flex flex-col gap-1.5 p-2 bg-zinc-50 border border-zinc-200/60 rounded-lg">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-zinc-500">Estado Cierre:</span>
                <span className={lead.estatus === 'CERRADO_VENTA' || lead.estatus === 'CERRADO'
                  ? 'text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 text-[9px] font-extrabold uppercase'
                  : 'text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200 text-[9px] font-extrabold uppercase'}>
                  {lead.estatus === 'CERRADO_VENTA' || lead.estatus === 'CERRADO' ? 'VENTA' : 'ABANDONADO'}
                </span>
              </div>
              {lead.numFactura && <div className="text-[10px] text-zinc-500 font-mono">Factura: <span className="font-semibold text-zinc-700">{lead.numFactura}</span></div>}
              {lead.fechaVenta && (
                <div className="mt-1 space-y-1">
                  <div className="flex items-center justify-between text-[9px] text-zinc-400 font-mono">
                    <span>Vida en Cerrado:</span><span>{daysLeftStr} ({Math.round(closedPct)}%)</span>
                  </div>
                  <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${closedPct > 85 ? 'bg-red-500' : closedPct > 50 ? 'bg-amber-500' : 'bg-blue-600'}`}
                      style={{ width: `${closedPct}%` }} />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-1 border-t border-zinc-200/40 pt-1.5">
                {(lead.estatus === 'CERRADO_VENTA' || lead.estatus === 'CERRADO') && onSecondPurchase && (
                  <button type="button" onClick={() => onSecondPurchase(lead)} disabled={isUpdating}
                    className="flex-1 py-1 px-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] rounded flex items-center justify-center gap-1 active:scale-95">
                    🛍️ Segunda Compra
                  </button>
                )}
                {lead.estatus === 'CERRADO_ABANDONADO' && onChangeClosureType && (
                  <button type="button" onClick={() => onChangeClosureType(lead)} disabled={isUpdating}
                    className="flex-1 py-1 px-2 bg-zinc-700 hover:bg-zinc-800 text-white font-extrabold text-[10px] rounded flex items-center justify-center gap-1 active:scale-95">
                    🔄 Cambiar Cierre
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        <div className="h-px bg-zinc-100 my-2.5" />

        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            {formattedValue && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100">
                <DollarSign className="w-3 h-3 -ml-0.5" />{formattedValue}
              </span>
            )}
            {lead.vendedor && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-zinc-600 bg-zinc-100 border border-zinc-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{lead.vendedor}
              </span>
            )}
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-400">
              <Clock className="w-3 h-3" />{creationDate}
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
            {onCloseLead && !['CERRADO', 'CERRADO_VENTA', 'CERRADO_ABANDONADO'].includes(lead.estatus) && (() => {
              const allowed = userRole === 'ADMIN' || lead.hasPassedContactado || lead.estatus !== 'NUEVO';
              return (
                <button onClick={() => { if (allowed) onCloseLead(lead); }} disabled={isUpdating || !allowed}
                  className={`p-1 rounded-md transition-colors ${allowed ? 'text-zinc-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer' : 'text-zinc-300 opacity-50 cursor-not-allowed'}`}
                  title={allowed ? 'Cerrar Lead' : 'Debe pasar por CONTACTADO primero'}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              );
            })()}
            <button onClick={() => onEdit(lead)} disabled={isUpdating}
              className="p-1 text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors" title="Editar">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            {userRole === 'ADMIN' && onTransfer && (
              <div className="relative" ref={transferMenuRef}>
                <button onClick={() => setIsTransferOpen(!isTransferOpen)}
                  className={`p-1 rounded-md transition-colors ${isTransferOpen ? 'text-blue-700 bg-blue-50' : 'text-zinc-500 hover:text-blue-700 hover:bg-blue-50'}`}
                  title="Transferir Lead">
                  <Users2 className="w-3.5 h-3.5" />
                </button>
                {isTransferOpen && (
                  <div className="absolute right-0 bottom-full mb-2 bg-white border border-zinc-200 rounded-lg shadow-lg p-2 w-48 z-50">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Transferir a:</p>
                    {vendorList.filter(v => v !== lead.vendedor).map(v => (
                      <button key={v} onClick={() => { onTransfer!(lead, v); setIsTransferOpen(false); }}
                        className="block w-full text-left px-2 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 rounded-md">{v}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button onClick={() => onDelete(lead.id)} disabled={isUpdating}
              className="p-1 text-zinc-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors" title="Eliminar">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {isUpdating && (
        <div className="flex items-center justify-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-b-xl text-[11px] font-medium animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" /><span>Guardando...</span>
        </div>
      )}
    </div>
  );
};

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  column: Column;
  leads: Lead[];
  updatingLeadIds: string[];
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onCloseLead?: (lead: Lead) => void;
  userRole?: 'ADMIN' | 'VENDEDOR';
  onSecondPurchase?: (lead: Lead) => void;
  onChangeClosureType?: (lead: Lead) => void;
  onTransfer?: (lead: Lead, newVendedor: string) => void;
  vendorList?: string[];
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column, leads, updatingLeadIds, onEditLead, onDeleteLead, onCloseLead,
  userRole, onSecondPurchase, onChangeClosureType, onTransfer, vendorList,
}) => {
  const { isOver, setNodeRef } = useDroppable({ id: column.id });
  const totalValue = leads.reduce((sum, l) => sum + (l.valorEstimado || 0), 0);
  const formattedTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalValue);

  return (
    <div ref={setNodeRef}
      className={`flex flex-col h-full rounded-2xl border transition-all duration-200 min-h-[500px] md:min-h-[600px]
        ${column.bgClass} ${column.borderClass}
        ${isOver ? 'ring-2 ring-zinc-400 border-zinc-500 shadow-sm scale-[1.005]' : ''}
      `}
    >
      <div className="p-4 rounded-t-2xl border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${column.color}`} />
          <h3 className={`text-sm font-bold tracking-wider ${column.textClass}`}>{column.title}</h3>
          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold leading-none ${column.accentClass} ${column.textClass}`}>{leads.length}</span>
        </div>
        {totalValue > 0 && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 bg-white px-2 py-1 rounded-md border border-zinc-200">
            <TrendingUp className="w-3 h-3 text-zinc-400" /><span>{formattedTotal}</span>
          </div>
        )}
      </div>
      <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-[400px]">
        {leads.length > 0 ? leads.map(lead => (
          <LeadCard
            key={lead.id} lead={lead}
            isUpdating={updatingLeadIds.includes(lead.id)}
            onEdit={onEditLead} onDelete={onDeleteLead}
            onCloseLead={onCloseLead} userRole={userRole}
            onSecondPurchase={onSecondPurchase}
            onChangeClosureType={onChangeClosureType}
            onTransfer={onTransfer} vendorList={vendorList}
          />
        )) : (
          <div className="flex flex-col items-center justify-center h-48 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50 p-4">
            <FolderOpen className="w-8 h-8 text-zinc-300 mb-2" />
            <p className="text-xs text-zinc-400 font-medium">No hay leads</p>
            <p className="text-[11px] text-zinc-400 mt-1 text-center">Arrastra prospectos aquí</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── LeadsBoard (componente principal) ────────────────────────────────────────

interface LeadsBoardProps {
  userRole: 'ADMIN' | 'VENDEDOR';
  selectedVendedor: string;
  sellers: any[];
  onSellersUpdate: (sellers: any[]) => void;
}

export const LeadsBoard: React.FC<LeadsBoardProps> = ({
  userRole, selectedVendedor, sellers, onSellersUpdate,
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [updatingLeadIds, setUpdatingLeadIds] = useState<string[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminVendedorFilter, setAdminVendedorFilter] = useState('todos');
  const [boardLayout, setBoardLayout] = useState<'columns' | 'table'>('columns');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [columns, setColumns] = useState<Column[]>(() => {
    const defaults: Column[] = [
      { id: 'NUEVO', title: 'NUEVO', color: 'bg-blue-500', bgClass: 'bg-[#f8fafc]', borderClass: 'border-slate-200', accentClass: 'bg-blue-100', textClass: 'text-blue-700' },
      { id: 'CONTACTADO', title: 'CONTACTADO', color: 'bg-amber-500', bgClass: 'bg-[#fffbeb]', borderClass: 'border-amber-200', accentClass: 'bg-amber-100', textClass: 'text-amber-700' },
      { id: 'NEGOCIANDO', title: 'NEGOCIANDO', color: 'bg-pink-500', bgClass: 'bg-[#fff1f2]', borderClass: 'border-pink-200', accentClass: 'bg-pink-100', textClass: 'text-pink-700' },
      { id: 'CERRADO', title: 'CERRADO', color: 'bg-zinc-500', bgClass: 'bg-[#fafafa]', borderClass: 'border-zinc-200', accentClass: 'bg-zinc-100', textClass: 'text-zinc-600' },
    ];
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_kanban_columns');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Column[];
          if (!parsed.some(c => c.id === 'CERRADO')) parsed.push(defaults[3]);
          return parsed;
        } catch { return defaults; }
      }
    }
    return defaults;
  });

  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formLead, setFormLead] = useState<any>(null);
  const [formError, setFormError] = useState('');
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [closingLead, setClosingLead] = useState<any>(null);
  const [motivoCierre, setMotivoCierre] = useState<'VENTA' | 'ABANDONADO'>('VENTA');
  const [montoCerrado, setMontoCerrado] = useState('');
  const [nroFactura, setNroFactura] = useState('');
  const [fechaCierre, setFechaCierre] = useState('');
  const [closureError, setClosureError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(curr => curr?.message === message ? null : curr), 4500);
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data) setLeads(data);
    } catch {
      const saved = localStorage.getItem('crm_leads_data');
      setLeads(saved ? JSON.parse(saved) : []);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  useEffect(() => {
    fetch('/api/sellers')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) onSellersUpdate(data); })
      .catch(() => {});
  }, []);

  // Filtering
  const roleFilteredLeads = leads.filter(lead => {
    const leadSeller = (lead.seller_name || lead.vendedor || '').toLowerCase().trim();
    if (userRole === 'ADMIN') {
      return adminVendedorFilter === 'todos' || leadSeller === adminVendedorFilter.toLowerCase().trim();
    }
    return leadSeller === (selectedVendedor || '').toLowerCase().trim();
  });

  const filteredLeads = roleFilteredLeads.filter(lead => {
    const q = searchQuery.toLowerCase();
    return (lead.nombre || '').toLowerCase().includes(q) ||
      (lead.empresa || '').toLowerCase().includes(q) ||
      (lead.ubicacionEstado || '').toLowerCase().includes(q);
  });

  const CLOSED_STATUSES = ['CERRADO', 'CERRADO_VENTA', 'CERRADO_ABANDONADO'];
  const activeLeads = filteredLeads.filter(l => !CLOSED_STATUSES.includes(l.estatus));
  const recentClosedLeads = filteredLeads.filter(l => {
    if (!CLOSED_STATUSES.includes(l.estatus) || !l.fechaVenta) return false;
    const diffDays = (new Date().getTime() - new Date(l.fechaVenta).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 30;
  });

  const uniqueSellersNames = Array.from(new Set(leads.map(l => (l.seller_name || l.vendedor || '').trim()).filter(Boolean)));
  const vendorList = Array.from(new Set(leads.map(l => (l.vendedor || '').trim()).filter(Boolean)));

  const activeLeadsCount = activeLeads.length;
  const activePipelineValue = activeLeads.reduce((sum, l) => sum + (l.valorEstimado || 0), 0);
  const closedAll = leads.filter(l => CLOSED_STATUSES.includes(l.estatus));
  const closedSales = closedAll.filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO').length;
  const conversionPercentage = closedAll.length > 0 ? Math.round((closedSales / closedAll.length) * 100) : 0;

  // Handlers
  const handleStatusChange = async (leadId: string, newStatus: string, extraData?: any) => {
    const idx = leads.findIndex(l => l.id.toString() === leadId.toString());
    if (idx === -1) return;
    const original = leads[idx];
    const updated = {
      ...original, estatus: newStatus,
      hasPassedContactado: original.hasPassedContactado || newStatus === 'CONTACTADO' || newStatus !== 'NUEVO',
      ...(extraData || {}),
    };
    setLeads(prev => prev.map(l => l.id.toString() === leadId.toString() ? updated : l));
    setUpdatingLeadIds(prev => [...prev, leadId.toString()]);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast(`"${original.nombre}" guardado con éxito.`, 'success');
      fetchLeads();
    } catch {
      showToast('Error: No se pudo guardar en la base de datos.', 'error');
    } finally {
      setUpdatingLeadIds(prev => prev.filter(id => id !== leadId.toString()));
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find(l => l.id === event.active.id);
    if (lead) setActiveLead(lead);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);
    if (!over) return;
    const lead = leads.find(l => l.id === active.id);
    if (lead && lead.estatus !== over.id) {
      if (over.id === 'CERRADO') {
        if (userRole !== 'ADMIN' && lead.estatus === 'NUEVO' && !lead.hasPassedContactado) {
          alert('Acción bloqueada: debe pasar por CONTACTADO primero.');
          return;
        }
        handleOpenClosureModal(lead);
      } else {
        await handleStatusChange(lead.id, over.id as string);
      }
    }
  };

  const handleOpenClosureModal = (lead: any) => {
    setClosingLead(lead);
    setMotivoCierre(lead.motivoCierre === 'ABANDONADO' ? 'ABANDONADO' : 'VENTA');
    setMontoCerrado(lead.valorEstimado > 0 ? lead.valorEstimado.toString() : '');
    setNroFactura(lead.numFactura || '');
    setFechaCierre(lead.fechaVenta || new Date().toISOString().split('T')[0]);
    setClosureError('');
    setIsClosureModalOpen(true);
  };

  const handleSecondPurchase = (lead: any) => {
    setClosingLead(lead);
    setMotivoCierre('VENTA');
    setMontoCerrado('');
    setNroFactura('');
    setFechaCierre(new Date().toISOString().split('T')[0]);
    setClosureError('');
    setIsClosureModalOpen(true);
  };

  const handleSaveClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingLead) return;
    const isSale = motivoCierre === 'VENTA';
    const finalMonto = isSale ? Number(montoCerrado || 0) : 0;
    if (isSale && (!montoCerrado || finalMonto <= 0)) { setClosureError('Monto inválido.'); return; }
    if (!fechaCierre) { setClosureError('Especifica la fecha.'); return; }
    setIsClosureModalOpen(false);
    await handleStatusChange(closingLead.id, isSale ? 'CERRADO_VENTA' : 'CERRADO_ABANDONADO', {
      valorEstimado: finalMonto,
      numFactura: isSale ? nroFactura.trim() : '',
      fechaVenta: fechaCierre,
      motivoCierre,
    });
    setClosingLead(null);
  };

  const handleOpenAddForm = () => {
    setFormLead({
      nombre: '', empresa: '', rif: '', telefono: '', ubicacionEstado: '', ubicacionDetalle: '',
      canalOrigen: '', campana: '', vendedor: userRole === 'VENDEDOR' ? selectedVendedor : '',
      estatus: 'NUEVO', notas: '', valorEstimado: 0, numFactura: '', fechaVenta: '', categoriaInteres: '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLead) return;
    if (!formLead.nombre?.trim() || !formLead.empresa?.trim() || !formLead.telefono?.trim()) {
      setFormError('Rellene Nombre, Empresa y Teléfono.');
      return;
    }
    const isEditing = !!formLead.id && !formLead.id.toString().startsWith('L-');
    setFormError('');
    try {
      if (isEditing) {
        await handleStatusChange(formLead.id, formLead.estatus, formLead);
      } else {
        const { id, ...leadData } = formLead;
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadData),
        });
        if (!res.ok) throw new Error('Error al registrar lead');
        showToast('Lead registrado con éxito.', 'success');
        await fetchLeads();
      }
      setIsFormOpen(false);
      setFormLead(null);
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar.');
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm('¿Eliminar este lead de la base de datos?')) return;
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error');
      setLeads(prev => prev.filter(l => l.id !== id));
      showToast('Lead eliminado.', 'success');
    } catch { alert('Error al eliminar.'); }
  };

  const handleTransferLead = (lead: any, newVendedor: string) => {
    handleStatusChange(lead.id, lead.estatus, { vendedor: newVendedor });
  };

  return (
    <div className="w-full space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold text-white
          ${toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Header + búsqueda */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs space-y-4">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900">SUPRI LEADS</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Tablero dinámico de prospección. Cambia de estatus, arrastra candidatos y cierra tus oportunidades.</p>
        </div>
        <div className="pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input type="text" placeholder="Buscar prospecto..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs border border-zinc-200 rounded-xl bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            {userRole === 'ADMIN' && (
              <select value={adminVendedorFilter} onChange={e => setAdminVendedorFilter(e.target.value)} className="p-2 border rounded-xl text-xs">
                <option value="todos">Todos</option>
                {uniqueSellersNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2">
            {userRole === 'ADMIN' && (
              <div className="flex bg-zinc-100 p-1 rounded-xl border">
                <button onClick={() => setBoardLayout('columns')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${boardLayout === 'columns' ? 'bg-white shadow-xs text-zinc-900' : 'text-zinc-500'}`}>
                  <LayoutGrid className="w-3.5 h-3.5" />Columnas
                </button>
                <button onClick={() => setBoardLayout('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${boardLayout === 'table' ? 'bg-white shadow-xs text-zinc-900' : 'text-zinc-500'}`}>
                  <Table className="w-3.5 h-3.5" />Tabla
                </button>
              </div>
            )}
            <button onClick={handleOpenAddForm}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Registrar Prospecto
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
          <div><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Oportunidades Activas</span><span className="text-xl font-bold mt-1 block">{activeLeadsCount}</span></div>
          <span className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><Users2 className="w-5 h-5" /></span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
          <div><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Pipeline Activo Estimado</span><span className="text-xl font-bold mt-1 block">${activePipelineValue.toLocaleString()}</span></div>
          <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp className="w-5 h-5" /></span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
          <div><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">% Efectividad de Cierre</span><span className="text-xl font-bold mt-1 block">{conversionPercentage}%</span></div>
          <span className="p-2.5 bg-purple-50 text-purple-600 rounded-lg"><CheckCircle2 className="w-5 h-5" /></span>
        </div>
      </div>

      {/* Tablero */}
      {userRole === 'ADMIN' && boardLayout === 'table' ? (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                <th className="py-3 px-4">Prospecto / Tienda</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4">Origen</th>
                <th className="py-3 px-4">Vendedor</th>
                <th className="py-3 px-4">Estatus</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y text-zinc-700">
              {activeLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-zinc-50/75">
                  <td className="py-3.5 px-4 font-bold text-zinc-900">
                    {lead.nombre} <span className="text-[10px] font-mono text-zinc-400">#{lead.id}</span>
                    <div className="text-[11px] text-zinc-500 font-normal">{lead.empresa}</div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold">{lead.telefono}</td>
                  <td className="py-3.5 px-4"><span className="bg-zinc-100 px-2 py-0.5 rounded text-[10px]">{lead.canalOrigen || 'Orgánico'}</span></td>
                  <td className="py-3.5 px-4 font-semibold">{lead.vendedor || 'Sin asignar'}</td>
                  <td className="py-3.5 px-4">
                    <select value={lead.estatus} onChange={e => handleStatusChange(lead.id, e.target.value)} className="px-2 py-1 text-xs border rounded-xl bg-white">
                      {columns.map(col => <option key={col.id} value={col.id}>{col.title}</option>)}
                    </select>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => { setFormLead(lead); setFormError(''); setIsFormOpen(true); }} className="p-1 px-2.5 bg-zinc-50 border rounded-lg text-[10px] font-bold hover:bg-zinc-100">Editar</button>
                      <button onClick={() => handleOpenClosureModal(lead)} className="p-1 px-2.5 bg-emerald-50 border rounded-lg text-emerald-800 text-[10px] font-bold hover:bg-emerald-100">Cerrar</button>
                      <button onClick={() => handleDeleteLead(lead.id)} className="p-1 text-zinc-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {columns.map(column => (
              <KanbanColumn
                key={column.id}
                column={column}
                leads={column.id === 'CERRADO' ? recentClosedLeads : activeLeads.filter(l => l.estatus === column.id)}
                updatingLeadIds={updatingLeadIds}
                onEditLead={lead => { setFormLead(lead); setFormError(''); setIsFormOpen(true); }}
                onDeleteLead={handleDeleteLead}
                onCloseLead={handleOpenClosureModal}
                userRole={userRole}
                onSecondPurchase={handleSecondPurchase}
                onChangeClosureType={handleOpenClosureModal}
                onTransfer={handleTransferLead}
                vendorList={vendorList}
              />
            ))}
          </div>
          <DragOverlay>
            {activeLead ? (
              <LeadCard lead={activeLead} isUpdating={false} onEdit={() => {}} onDelete={() => {}} isDragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modal de Cierre */}
      {isClosureModalOpen && closingLead && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border relative">
            <button onClick={() => setIsClosureModalOpen(false)} className="absolute top-4 right-4 text-zinc-400"><X className="w-5 h-5" /></button>
            <h3 className="font-bold text-sm text-zinc-900 mb-4">Configurar Cierre Comercial</h3>
            <form onSubmit={handleSaveClosure} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Motivo de Cierre *</label>
                <select value={motivoCierre} onChange={e => setMotivoCierre(e.target.value as any)} className="w-full px-3 py-2 text-xs border rounded-xl bg-zinc-50">
                  <option value="VENTA">🎉 Venta Realizada</option>
                  <option value="ABANDONADO">⚠️ Sin Respuesta / Abandonado</option>
                </select>
              </div>
              {motivoCierre === 'VENTA' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Monto Cerrado USD *</label>
                    <input type="number" value={montoCerrado} onChange={e => setMontoCerrado(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-xl" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Número de Factura</label>
                    <input type="text" value={nroFactura} onChange={e => setNroFactura(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-xl" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Fecha de Cierre</label>
                <input type="date" value={fechaCierre} onChange={e => setFechaCierre(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-xl" />
              </div>
              {closureError && <p className="text-xs text-red-500">{closureError}</p>}
              <div className="pt-4 border-t flex justify-end gap-2 text-xs">
                <button type="button" onClick={() => setIsClosureModalOpen(false)} className="px-4 py-2 border rounded-xl text-zinc-600">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl">Guardar Cierre</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Formulario */}
      {isFormOpen && formLead && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-zinc-400"><X className="w-5 h-5" /></button>
            <h3 className="text-base font-bold text-zinc-900 mb-4">Formulario de Oportunidad</h3>
            <form onSubmit={handleSaveLead} className="space-y-4">
              <div className="space-y-3 bg-zinc-50 p-4 rounded-xl border">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Nombre Contacto *</label>
                    <input type="text" value={formLead.nombre || ''} onChange={e => setFormLead({ ...formLead, nombre: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Empresa/Tienda *</label>
                    <input type="text" value={formLead.empresa || ''} onChange={e => setFormLead({ ...formLead, empresa: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Teléfono *</label>
                    <input type="text" value={formLead.telefono || ''} onChange={e => setFormLead({ ...formLead, telefono: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">RIF</label>
                    <input type="text" value={formLead.rif || ''} onChange={e => setFormLead({ ...formLead, rif: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Estado (Ubicación)</label>
                    <input type="text" value={formLead.ubicacionEstado || ''} onChange={e => setFormLead({ ...formLead, ubicacionEstado: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Monto Estimado</label>
                    <input type="number" value={formLead.valorEstimado || ''} onChange={e => setFormLead({ ...formLead, valorEstimado: Number(e.target.value) })} className="w-full px-3 py-2 text-xs border rounded-xl" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Vendedor</label>
                  <input type="text" value={formLead.vendedor || ''} onChange={e => setFormLead({ ...formLead, vendedor: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Fase del Embudo</label>
                  <select value={formLead.estatus || 'NUEVO'} onChange={e => setFormLead({ ...formLead, estatus: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl">
                    {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Observaciones</label>
                  <textarea value={formLead.notas || ''} onChange={e => setFormLead({ ...formLead, notas: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" rows={3} />
                </div>
              </div>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <div className="pt-4 border-t flex justify-end gap-2 text-xs">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 border rounded-xl text-zinc-600">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-zinc-950 text-white font-bold rounded-xl">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsBoard;
