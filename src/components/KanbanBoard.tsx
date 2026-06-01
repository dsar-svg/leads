/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from '@dnd-kit/core';
import {
  Plus,
  Settings2,
  HelpCircle,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Compass,
  TrendingUp,
  Users2,
  Trophy,
  X,
  Sparkles,
  Search,
  Check,
  Building2,
  Phone,
  MapPin,
  DollarSign,
  Database,
  UserCheck,
  Link2,
  Trash2,
  PlusCircle,
  FileText,
  User,
  ShieldCheck,
  UserCircle2,
  Calendar,
  Clock,
  Lock,
  Archive,
  BarChart4,
  Briefcase,
  Layers,
  ArrowRight,
  LayoutGrid,
  Table
} from 'lucide-react';

import { Lead, LeadStatus, Column, WebhookLog } from '../types';
import { INITIAL_LEADS } from '../mockData';
import { KanbanColumn } from './KanbanColumn';
import { LeadCard } from './LeadCard';
import { SellerRanking } from './SellerRanking';
import {
  getWebhookUrl,
  saveWebhookUrl,
  sendWebhookStatusChange,
  DEFAULT_WEBHOOK_URL,
  getSavedSpreadsheetId,
  saveSpreadsheetId,
  parseSpreadsheetIdInput,
  fetchLeadsFromSheet,
  updateLeadInSheet,
  appendLeadToSheet
} from '../api';
import { BoardTab } from './tabs/BoardTab';
import { ClosuresTab } from './tabs/ClosuresTab';
import { StatsTab } from './tabs/StatsTab';
import { SettingsTab } from './tabs/SettingsTab';

const COLOR_PRESETS = [
  { color: 'bg-indigo-500', bgClass: 'bg-[#faf5ff]', borderClass: 'border-indigo-200', accentClass: 'bg-indigo-100', textClass: 'text-indigo-700' },
  { color: 'bg-purple-500', bgClass: 'bg-[#faf5ff]', borderClass: 'border-purple-200', accentClass: 'bg-purple-100', textClass: 'text-purple-700' },
  { color: 'bg-orange-500', bgClass: 'bg-[#fff7ed]', borderClass: 'border-orange-200', accentClass: 'bg-orange-100', textClass: 'text-orange-700' },
  { color: 'bg-pink-500', bgClass: 'bg-[#fff1f2]', borderClass: 'border-pink-200', accentClass: 'bg-pink-100', textClass: 'text-pink-700' },
  { color: 'bg-cyan-500', bgClass: 'bg-[#ecfeff]', borderClass: 'border-cyan-200', accentClass: 'bg-cyan-105', textClass: 'text-cyan-705' },
  { color: 'bg-teal-500', bgClass: 'bg-[#f0fdf4]', borderClass: 'border-teal-200', accentClass: 'bg-teal-100', textClass: 'text-teal-700' }
];

interface KanbanBoardProps {
  userRole?: 'ADMIN' | 'VENDEDOR';
  setUserRole?: (role: 'ADMIN' | 'VENDEDOR') => void;
  selectedVendedor?: string;
  setSelectedVendedor?: (vendedor: string) => void;
  activeTab?: 'board' | 'closed' | 'stats' | 'settings';
  setActiveTab?: (tab: 'board' | 'closed' | 'stats' | 'settings') => void;
  onSellersUpdate?: (sellers: any[]) => void;
  sellers: any[];
  onVendorRankUpdate?: (data: {rank: number, rate: number, tier: string | null} | null) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  userRole: propUserRole,
  setUserRole: propSetUserRole,
  selectedVendedor: propSelectedVendedor,
  setSelectedVendedor: propSetSelectedVendedor,
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  onSellersUpdate,
  sellers,
  onVendorRankUpdate,
}) => {
  const [internalUserRole, setInternalUserRole] = useState<'ADMIN' | 'VENDEDOR'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_user_role');
      return (saved as 'ADMIN' | 'VENDEDOR') || 'ADMIN';
    }
    return 'ADMIN';
  });
  const userRole = propUserRole !== undefined ? propUserRole : internalUserRole;
  const setUserRole = (role: 'ADMIN' | 'VENDEDOR') => {
    if (propSetUserRole) propSetUserRole(role);
    setInternalUserRole(role);
    localStorage.setItem('crm_user_role', role);
  };

  const [internalSelectedVendedor, setInternalSelectedVendedor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('crm_selected_vendedor') || 'Carlos Pérez';
    }
    return 'Carlos Pérez';
  });
  const selectedVendedor = propSelectedVendedor !== undefined ? propSelectedVendedor : internalSelectedVendedor;
  const setSelectedVendedor = (vendedor: string) => {
    if (propSetSelectedVendedor) propSetSelectedVendedor(vendedor);
    setInternalSelectedVendedor(vendedor);
    localStorage.setItem('crm_selected_vendedor', vendedor);
  };

  const [internalActiveTab, setInternalActiveTab] = useState<'board' | 'closed' | 'stats' | 'settings'>('board');
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalActiveTab;
  const setActiveTab = (tab: 'board' | 'closed' | 'stats' | 'settings') => {
    if (propSetActiveTab) propSetActiveTab(tab);
    setInternalActiveTab(tab);
  };

  const [leads, setLeads] = useState<any[]>([]);
  const [updatingLeadIds, setUpdatingLeadIds] = useState<string[]>([]);
  const [activeLead, setActiveLead] = useState<any>(null);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  const sellersPerformance = React.useMemo(() => {
    return sellers.map((seller) => {
      const vName = seller.name || "Sin Asignar";
      const vLeads = leads.filter((l) => (l.seller_name || '').trim().toLowerCase() === vName.toLowerCase());
      const vActive = vLeads.filter((l) => l.estatus !== 'CERRADO_VENTA' && l.estatus !== 'CERRADO_ABANDONADO' && l.estatus !== 'CERRADO').length;
      const vWon = vLeads.filter((l) => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO').length;
      const vLost = vLeads.filter((l) => l.estatus === 'CERRADO_ABANDONADO').length;
      const totalClosed = vWon + vLost;
      const vRate = totalClosed > 0 ? Math.round((vWon / totalClosed) * 100) : 0;
      const vRev = vLeads.filter((l) => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO').reduce((sum, l) => sum + (l.valorEstimado || 0), 0);
      const vClosedWithDates = vLeads.filter((l) => (l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO' || l.estatus === 'CERRADO_ABANDONADO') && l.fechaIngreso && l.fechaVenta);
      const vTotalClosureDays = vClosedWithDates.reduce((sum, l) => sum + Math.round((new Date(l.fechaVenta).getTime() - new Date(l.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24)), 0);
      const vAverageClosureTime = vClosedWithDates.length > 0 ? Math.round(vTotalClosureDays / vClosedWithDates.length) : 0;
      return { vName, total: vLeads.length, vActive, vWon, vLost, vRate, vRev, vAverageClosureTime };
    }).sort((a, b) => b.vRev - a.vRev);
  }, [sellers, leads]);

  useEffect(() => {
    if (userRole !== 'VENDEDOR' || !onVendorRankUpdate) return;
    const sorted = [...sellersPerformance].sort((a, b) => b.vRate - a.vRate);
    const rank = sorted.findIndex(s => s.vName.trim().toLowerCase() === (selectedVendedor || '').trim().toLowerCase());
    if (rank < 0) { onVendorRankUpdate(null); return; }
    const tiers = [
      { label: 'Oro', minRate: 100 },
      { label: 'Plata', minRate: 80 },
      { label: 'Bronce', minRate: 60 },
    ];
    const tier = rank < 3 && sorted[rank].vRate >= tiers[rank].minRate ? tiers[rank].label : null;
    onVendorRankUpdate({ rank, rate: sorted[rank].vRate, tier });
  }, [sellersPerformance, selectedVendedor, userRole, onVendorRankUpdate]);

  useEffect(() => {
    fetch('/api/sellers')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) onSellersUpdate(data); })
      .catch(err => console.error("Error:", err));
  }, []);

  const sellersMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    sellers.forEach(s => { if (s?.id != null) map[s.id.toString()] = s.name || s.nombre || ''; });
    return map;
  }, [sellers]);

  const fetchLeadsFromDB = async () => {
    try {
      const response = await fetch('/api/leads');
      if (!response.ok) throw new Error(`Failed to fetch leads: ${response.statusText}`);
      const data = await response.json();
      if (data) setLeads(data);
    } catch (error) {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('crm_leads_data');
        setLeads(saved ? JSON.parse(saved) : INITIAL_LEADS);
      } else {
        setLeads(INITIAL_LEADS);
      }
    }
  };

  useEffect(() => { fetchLeadsFromDB(); }, []);

  const [columns, setColumns] = useState<Column[]>(() => {
    const defaultCols: Column[] = [
      { id: 'CERRADO', title: 'CERRADO', color: 'bg-zinc-650', bgClass: 'bg-[#fafafa]', borderClass: 'border-zinc-200', accentClass: 'bg-zinc-100', textClass: 'text-zinc-600' },
      { id: 'NUEVO', title: 'NUEVO', color: 'bg-blue-500', bgClass: 'bg-[#f8fafc]', borderClass: 'border-slate-200', accentClass: 'bg-blue-100', textClass: 'text-blue-700' },
      { id: 'CONTACTADO', title: 'CONTACTADO', color: 'bg-amber-500', bgClass: 'bg-[#fffbeb]', borderClass: 'border-amber-200', accentClass: 'bg-amber-100', textClass: 'text-amber-700' },
      { id: 'NEGOCIANDO', title: 'NEGOCIANDO', color: 'bg-pink-500', bgClass: 'bg-[#fff1f2]', borderClass: 'border-pink-200', accentClass: 'bg-pink-100', textClass: 'text-pink-700' },
    ];
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_kanban_columns');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Column[];
          if (!parsed.some(c => c.id === 'CERRADO')) parsed.push(defaultCols[0]);
          return parsed;
        } catch (e) { return defaultCols; }
      }
    }
    return defaultCols;
  });

  const handleReorderColumn = (id: string, direction: 'up' | 'down') => {
    const index = columns.findIndex(c => c.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === columns.length - 1) return;
    const newColumns = [...columns];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
    setColumns(newColumns);
    localStorage.setItem('crm_kanban_columns', JSON.stringify(newColumns));
  };

  const handleTransferLead = (lead: any, newVendedor: string) => {
    handleStatusChange(lead.id, lead.estatus, { vendedor: newVendedor });
  };

  const vendorList = Array.from(new Set(leads.map(l => (l.vendedor || 'Sin Asignar').trim()).filter(Boolean))) as string[];

  const [spreadsheetId, setSpreadsheetId] = useState(getSavedSpreadsheetId() || '');
  const [spreadsheetInput, setSpreadsheetInput] = useState(getSavedSpreadsheetId() || '');
  const [sheetTitle, setSheetTitle] = useState('');
  const [isLoadingFromSheets, setIsLoadingFromSheets] = useState(false);
  const [sheetsError, setSheetsError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => { setToast(current => current?.message === message ? null : current); }, 4500);
  };

  const [boardLayout, setBoardLayout] = useState<'columns' | 'table'>('columns');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminVendedorFilter, setAdminVendedorFilter] = useState<string>('todos');
  const [selectedVendorStatsFilter, setSelectedVendorStatsFilter] = useState<string>('Todos');
  const [closedReasonFilter, setClosedReasonFilter] = useState<'todos' | 'VENTA' | 'ABANDONADO'>('todos');
  const [webhookUrl, setWebhookUrl] = useState(getWebhookUrl());
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formLead, setFormLead] = useState<any>(null);
  const [formError, setFormError] = useState('');
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [isSecondPurchaseFlow, setIsSecondPurchaseFlow] = useState(false);
  const [closingLead, setClosingLead] = useState<any>(null);
  const [motivoCierre, setMotivoCierre] = useState<'VENTA' | 'ABANDONADO'>('VENTA');
  const [montoCerrado, setMontoCerrado] = useState<string>('');
  const [nroFactura, setNroFactura] = useState<string>('');
  const [fechaCierre, setFechaCierre] = useState<string>('');
  const [closureError, setClosureError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find(l => l.id === event.active.id);
    if (lead) setActiveLead(lead);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);
    if (!over) return;
    const leadId = active.id as string;
    const targetStatus = over.id as string;
    const lead = leads.find(l => l.id === leadId);
    if (lead && lead.estatus !== targetStatus) {
      if (targetStatus === 'CERRADO') {
        if (userRole !== 'ADMIN' && lead.estatus === 'NUEVO' && !lead.hasPassedContactado) {
          alert('🔒 Acción bloqueada: Los vendedores solo pueden cerrar un lead una vez que haya pasado por la fase de "CONTACTADO" o posterior.');
          return;
        }
        handleOpenClosureModal(lead);
      } else {
        await handleStatusChange(leadId, targetStatus);
      }
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string, closureData?: any) => {
    const leadIdx = leads.findIndex((l: any) => l.id.toString() === leadId.toString());
    if (leadIdx === -1) return;
    const originalLead = leads[leadIdx];
    const updatedLead: any = {
      ...originalLead,
      estatus: newStatus,
      hasPassedContactado: originalLead.hasPassedContactado || newStatus === 'CONTACTADO' || newStatus !== 'NUEVO',
      ...(closureData || {})
    };
    setLeads((prev: any[]) => prev.map((l: any) => l.id.toString() === leadId.toString() ? updatedLead : l));
    setUpdatingLeadIds((prev: string[]) => [...prev, leadId.toString()]);
    if (newStatus === 'CERRADO_VENTA' || newStatus.toLowerCase().includes('cerrado')) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLead)
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      showToast(`¡Excelente! "${originalLead.nombre}" guardado con éxito en MySQL.`, 'success');
      fetchLeadsFromDB();
    } catch (error: any) {
      console.error('Error al actualizar el lead en backend:', error);
      showToast('Error de comunicación: No se pudo guardar en la base de datos.', 'error');
    } finally {
      setUpdatingLeadIds((prev: string[]) => prev.filter((id: string) => id.toString() !== leadId.toString()));
    }
  };

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    const titleClean = newColTitle.trim().toUpperCase();
    if (!titleClean) return;
    if (columns.some(c => c.id === titleClean || c.title === titleClean)) { alert('Esta fase ya existe.'); return; }
    const colorProfile = COLOR_PRESETS[columns.length % COLOR_PRESETS.length];
    setColumns(prev => [...prev, { id: titleClean, title: titleClean, ...colorProfile }]);
    setNewColTitle('');
    setIsAddingCol(false);
  };

  const handleRemoveColumn = async (colId: string) => {
    if (colId === 'NUEVO' || colId === 'CONTACTADO') return;
    setColumns(prev => prev.filter(c => c.id !== colId));
  };

  const handleOpenClosureModal = (lead: any) => {
    setIsSecondPurchaseFlow(false);
    setClosingLead(lead);
    setMotivoCierre(lead.motivoCierre === 'ABANDONADO' ? 'ABANDONADO' : 'VENTA');
    setMontoCerrado(lead.valorEstimado > 0 ? lead.valorEstimado.toString() : '');
    setNroFactura(lead.numFactura || '');
    setFechaCierre(lead.fechaVenta || new Date().toISOString().split('T')[0]);
    setClosureError('');
    setIsClosureModalOpen(true);
  };

  const handleSecondPurchase = (lead: any) => {
    setIsSecondPurchaseFlow(true);
    setClosingLead(lead);
    setMotivoCierre('VENTA');
    setMontoCerrado('');
    setNroFactura('');
    setFechaCierre(new Date().toISOString().split('T')[0]);
    setClosureError('');
    setIsClosureModalOpen(true);
  };

  const handleChangeClosureType = (lead: any) => { handleOpenClosureModal(lead); };

  const handleSaveClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingLead) return;
    const isSale = motivoCierre === 'VENTA';
    const finalMonto = isSale ? Number(montoCerrado || 0) : 0;
    const finalInvoice = isSale ? nroFactura.trim() : '';
    if (isSale && (!montoCerrado || finalMonto <= 0)) { setClosureError('Monto inválido.'); return; }
    if (!fechaCierre) { setClosureError('Especifica la fecha.'); return; }
    setIsClosureModalOpen(false);
    await handleStatusChange(closingLead.id, isSale ? 'CERRADO_VENTA' : 'CERRADO_ABANDONADO', {
      valorEstimado: finalMonto, numFactura: finalInvoice, fechaVenta: fechaCierre, motivoCierre: motivoCierre
    });
    setClosingLead(null);
  };

  const handleOpenAddForm = () => {
    setFormLead({
      nombre: '', empresa: '', rif: '', telefono: '', ubicacionEstado: '', ubicacionDetalle: '',
      canalOrigen: '', campana: '', vendedor: userRole === 'VENDEDOR' ? selectedVendedor : 'Carlos Pérez',
      estatus: 'NUEVO', notas: '', valorEstimado: 0, numFactura: '', fechaVenta: '', categoriaInteres: ''
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (lead: any) => { setFormLead(lead); setFormError(''); setIsFormOpen(true); };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLead) return;
    if (!formLead.nombre?.trim() || !formLead.empresa?.trim() || !formLead.telefono?.trim()) {
      setFormError('Campos requeridos vacíos. Rellene Nombre, Empresa y Teléfono.');
      return;
    }
    const isEditing = !!formLead.id && !formLead.id.toString().startsWith('L-');
    setFormError('');
    try {
      if (isEditing) {
        await handleStatusChange(formLead.id, formLead.estatus, formLead);
      } else {
        const { id, ...leadDataToSend } = formLead;
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadDataToSend)
        });
        if (!response.ok) throw new Error('Error al registrar lead nuevo');
        showToast('Lead registrado con éxito en la base de datos.', 'success');
        await fetchLeadsFromDB();
      }
      setIsFormOpen(false);
      setFormLead(null);
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar el registro.');
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm('¿Remover de la base de datos MySQL?')) {
      try {
        const response = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error');
        setLeads(prev => prev.filter(l => l.id !== id));
        showToast('Lead eliminado.', 'success');
      } catch (err: any) { alert('Error'); }
    }
  };

  const uniqueSellersNames: string[] = Array.from(
    new Set(leads.map(l => {
      const name = l.seller_name || l.vendedor || '';
      return typeof name === 'string' ? name.trim() : '';
    }).filter(Boolean))
  );

  const roleFilteredLeads = leads.filter(lead => {
    const filterValue = adminVendedorFilter.toLowerCase().trim();
    const leadSellerName = (lead.seller_name || lead.vendedor || '').toLowerCase().trim();
    if (userRole === 'ADMIN') {
      if (filterValue === 'todos') return true;
      return leadSellerName === filterValue;
    }
    const vendorFilter = (selectedVendedor || '').toLowerCase().trim();
    return leadSellerName === vendorFilter;
  });

  const filteredLeads = roleFilteredLeads.filter(lead => {
    const query = searchQuery.toLowerCase();
    return ((lead.nombre || '').toLowerCase().includes(query) ||
      (lead.empresa || '').toLowerCase().includes(query) ||
      (lead.ubicacionEstado || '').toLowerCase().includes(query));
  });

  const activeLeads = filteredLeads.filter(l => l.estatus !== 'CERRADO' && l.estatus !== 'CERRADO_VENTA' && l.estatus !== 'CERRADO_ABANDONADO');
  const unfilteredClosedLeads = filteredLeads.filter(l => l.estatus === 'CERRADO' || l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO_ABANDONADO');

  const recentClosedLeads = unfilteredClosedLeads.filter(l => {
    if (!l.fechaVenta) return false;
    const diffDays = (new Date().getTime() - new Date(l.fechaVenta).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 30;
  });

  const closedLeads = unfilteredClosedLeads.filter(l => {
    if (userRole !== 'ADMIN' || closedReasonFilter === 'todos') return true;
    const isWon = l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO';
    return (l.motivoCierre || (isWon ? 'VENTA' : 'ABANDONADO')) === closedReasonFilter;
  });

  const activeLeadsCount = activeLeads.length;
  const activePipelineValue = activeLeads.reduce((sum, l) => sum + (l.valorEstimado || 0), 0);

  const statsClosedLeads = leads.filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO' || l.estatus === 'CERRADO_ABANDONADO');
  const closedSalesCount = statsClosedLeads.filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO').length;
  const totalClosedCount = statsClosedLeads.length;
  const conversionPercentage = totalClosedCount > 0 ? Math.round((closedSalesCount / totalClosedCount) * 100) : 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">

      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold text-white transition-all ${
          toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`}>
          {toast.message}
        </div>
      )}

      {(activeTab === 'board' || activeTab === 'closed') && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-zinc-900 mt-1">SUPRI LEADS</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Tablero dinámico de prospección. Cambia de estatus, arrastra candidatos y cierra tus oportunidades.</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input type="text" placeholder="Buscar prospecto..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 text-xs border border-zinc-200 rounded-xl bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              {userRole === 'ADMIN' && (
                <select value={adminVendedorFilter || 'todos'} onChange={(e) => setAdminVendedorFilter(e.target.value)} className="p-2 border rounded-xl text-xs">
                  <option value="todos">Todos</option>
                  {Array.isArray(uniqueSellersNames) && uniqueSellersNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center gap-2">
              {userRole === 'ADMIN' && activeTab === 'board' && (
                <div className="flex bg-zinc-100 p-1 rounded-xl border">
                  <button onClick={() => setBoardLayout('columns')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${boardLayout === 'columns' ? 'bg-white shadow-xs text-zinc-900' : 'text-zinc-500'}`}><LayoutGrid className="w-3.5 h-3.5" />Columnas</button>
                  <button onClick={() => setBoardLayout('table')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${boardLayout === 'table' ? 'bg-white shadow-xs text-zinc-900' : 'text-zinc-500'}`}><Table className="w-3.5 h-3.5" />Tabla</button>
                </div>
              )}
              {activeTab === 'board' && <button onClick={handleOpenAddForm} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors"><Plus className="w-4 h-4" /> Registrar Prospecto</button>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'board' && (
        <BoardTab
          userRole={userRole}
          boardLayout={boardLayout}
          setBoardLayout={setBoardLayout}
          activeLeads={activeLeads}
          recentClosedLeads={recentClosedLeads}
          columns={columns}
          activeLeadsCount={activeLeadsCount}
          activePipelineValue={activePipelineValue}
          conversionPercentage={conversionPercentage}
          updatingLeadIds={updatingLeadIds}
          activeLead={activeLead}
          sensors={sensors}
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
          handleStatusChange={handleStatusChange}
          handleOpenEditForm={handleOpenEditForm}
          handleDeleteLead={handleDeleteLead}
          handleOpenClosureModal={handleOpenClosureModal}
          handleSecondPurchase={handleSecondPurchase}
          handleChangeClosureType={handleChangeClosureType}
          handleTransferLead={handleTransferLead}
          vendorList={vendorList}
        />
      )}

      {activeTab === 'closed' && (
        <ClosuresTab closedLeads={closedLeads} userRole={userRole} />
      )}

      {activeTab === 'stats' && (
        <StatsTab
          userRole={userRole}
          selectedVendedor={selectedVendedor}
          selectedVendorStatsFilter={selectedVendorStatsFilter}
          setSelectedVendorStatsFilter={setSelectedVendorStatsFilter}
          sellers={sellers}
          leads={leads}
          sellersMap={sellersMap}
          sellersPerformance={sellersPerformance}
          columns={columns}
        />
      )}

      {activeTab === 'settings' && userRole === 'ADMIN' && (
        <SettingsTab
          columns={columns}
          handleReorderColumn={handleReorderColumn}
          handleRemoveColumn={handleRemoveColumn}
          handleAddColumn={handleAddColumn}
          isAddingCol={isAddingCol}
          setIsAddingCol={setIsAddingCol}
          newColTitle={newColTitle}
          setNewColTitle={setNewColTitle}
        />
      )}

      {/* Closure Modal */}
      {isClosureModalOpen && closingLead && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border relative">
            <button type="button" onClick={() => setIsClosureModalOpen(false)} className="absolute top-4 right-4 text-zinc-400"><X className="w-5 h-5" /></button>
            <h3 className="font-bold text-sm text-zinc-900 mb-4">Configurar Cierre Comercial</h3>
            <form onSubmit={handleSaveClosure} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Motivo de Cierre *</label>
                <select value={motivoCierre} onChange={(e) => setMotivoCierre(e.target.value as any)} className="w-full px-3 py-2 text-xs border rounded-xl bg-zinc-50">
                  <option value="VENTA">🎉 Venta Realizada (Ingreso Confirmado)</option>
                  <option value="ABANDONADO">⚠️ Sin Respuesta / Abandonado</option>
                </select>
              </div>
              {motivoCierre === 'VENTA' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Monto Cerrado USD *</label>
                    <input type="number" value={montoCerrado} onChange={(e) => setMontoCerrado(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-xl" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Número de Factura</label>
                    <input type="text" value={nroFactura} onChange={(e) => setNroFactura(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-xl" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Fecha de Cierre</label>
                <input type="date" value={fechaCierre} onChange={(e) => setFechaCierre(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-xl" />
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

      {/* Lead Form Modal */}
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
                    <input type="text" value={formLead.nombre || ''} onChange={(e) => setFormLead({ ...formLead, nombre: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Empresa/Tienda *</label>
                    <input type="text" value={formLead.empresa || ''} onChange={(e) => setFormLead({ ...formLead, empresa: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Teléfono *</label>
                    <input type="text" value={formLead.telefono || ''} onChange={(e) => setFormLead({ ...formLead, telefono: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">RIF</label>
                    <input type="text" value={formLead.rif || ''} onChange={(e) => setFormLead({ ...formLead, rif: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Estado (Ubicación)</label>
                    <input type="text" value={formLead.ubicacionEstado || ''} onChange={(e) => setFormLead({ ...formLead, ubicacionEstado: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Monto Oportunidad Estimado</label>
                    <input type="number" value={formLead.valorEstimado || ''} onChange={(e) => setFormLead({ ...formLead, valorEstimado: Number(e.target.value) })} className="w-full px-3 py-2 text-xs border rounded-xl" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Vendedor</label>
                  <input type="text" value={formLead.vendedor || ''} onChange={(e) => setFormLead({ ...formLead, vendedor: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Fase del Embudo</label>
                  <select value={formLead.estatus || 'NUEVO'} onChange={(e) => setFormLead({ ...formLead, estatus: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl">
                    {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Observaciones</label>
                  <textarea value={formLead.notas || ''} onChange={(e) => setFormLead({ ...formLead, notas: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" rows={3} />
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

export default KanbanBoard;
