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
import { 
  googleSignIn, 
  logout, 
  initAuth 
} from '../firebaseAuth';

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
 




  const [localSellers, setLocalSellers] = useState<any[]>(sellers);

  useEffect(() => {
  fetch('/api/sellers')
    .then(res => res.json())
    .then(data => {
       if (Array.isArray(data)) {
         onSellersUpdate(data);
       }
    })
    .catch(err => console.error("Error:", err));
}, []); // Dependencias vacías para evitar bucles

    // AGREGA ESTO AQUÍ:
  const sellersMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    sellers.forEach(s => {
      if (s?.id != null) map[s.id.toString()] = s.name || s.nombre || ''; 
    });
    return map;
  }, [sellers]);

  // Fetch fresco desde la Base de Datos unificada MySQL
  const fetchLeadsFromDB = async () => {
    try {
      console.log('Fetching leads from /api/leads...');
      const response = await fetch('/api/leads');
      if (!response.ok) throw new Error(`Failed to fetch leads: ${response.statusText}`);
      const data = await response.json();
      if (data) setLeads(data);
    } catch (error) {
      console.error('Error fetching leads from DB:', error);
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('crm_leads_data');
        setLeads(saved ? JSON.parse(saved) : INITIAL_LEADS);
      } else {
        setLeads(INITIAL_LEADS);
      }
    }
  };

  useEffect(() => {
    fetchLeadsFromDB();
  }, []);

  

  const [columns, setColumns] = useState<Column[]>(() => {
    const defaultCols: Column[] = [
      { id: 'CERRADO', title: 'CERRADO', color: 'bg-zinc-650', bgClass: 'bg-[#fafafa]', borderClass: 'border-zinc-200', accentClass: 'bg-zinc-100', textClass: 'text-zinc-700' },
      { id: 'NUEVO', title: 'NUEVO', color: 'bg-blue-500', bgClass: 'bg-[#f8fafc]', borderClass: 'border-slate-200', accentClass: 'bg-blue-100', textClass: 'text-blue-700' },
      { id: 'CONTACTADO', title: 'CONTACTADO', color: 'bg-amber-500', bgClass: 'bg-[#fffbeb]', borderClass: 'border-amber-200', accentClass: 'bg-amber-100', textClass: 'text-amber-700' }
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
    const { active } = event;
    const lead = leads.find(l => l.id === active.id);
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
    const prevStatus = originalLead.estatus;

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
    if (columns.some(c => c.id === titleClean || c.title === titleClean)) {
      alert('Esta fase ya existe.');
      return;
    }
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

  const handleChangeClosureType = (lead: any) => {
    handleOpenClosureModal(lead);
  };

  const handleSaveClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingLead) return;
    const isSale = motivoCierre === 'VENTA';
    const finalMonto = isSale ? Number(montoCerrado || 0) : 0;
    const finalInvoice = isSale ? nroFactura.trim() : '';

    if (isSale && (!montoCerrado || finalMonto <= 0)) {
      setClosureError('Monto inválido.');
      return;
    }
    if (!fechaCierre) {
      setClosureError('Especifica la fecha.');
      return;
    }
    setIsClosureModalOpen(false);
    await handleStatusChange(closingLead.id, isSale ? 'CERRADO_VENTA' : 'CERRADO_ABANDONADO', {
      valorEstimado: finalMonto,
      numFactura: finalInvoice,
      fechaVenta: fechaCierre,
      motivoCierre: motivoCierre
    });
    setClosingLead(null);
  };

  const handleReactivateLead = async (lead: any) => {
    if (confirm(`¿Reactivar lead?`)) {
      await handleStatusChange(lead.id, 'NUEVO', { valorEstimado: 0, numFactura: '', fechaVenta: '', motivoCierre: null });
    }
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

  const handleOpenEditForm = (lead: any) => {
    setFormLead(lead);
    setFormError('');
    setIsFormOpen(true);
  };

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
      console.error(err);
      setFormError(err.message || 'Error al guardar el registro.');
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm(`¿Remover de la base de datos MySQL?`)) {
      try {
        const response = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error');
        setLeads(prev => prev.filter(l => l.id !== id));
        showToast('Lead eliminado.', 'success');
      } catch (err: any) { alert('Error'); }
    }
  };

  const uniqueSellersNames: string[] = Array.from(
      new Set(
        leads
          .map(l => {
            // Forzamos a que el valor siempre sea un string
            const name = l.seller_name || l.vendedor || '';
            return typeof name === 'string' ? name.trim() : '';
          })
          .filter(Boolean) // Esto elimina strings vacíos o nulls
      )
    );

 const roleFilteredLeads = leads.filter(lead => {
  const filterValue = adminVendedorFilter.toLowerCase().trim();
  const leadSellerName = (lead.seller_name || lead.vendedor || '').toLowerCase().trim();
  
  // 1. Lógica para el ADMIN
  if (userRole === 'ADMIN') {
    // Si el filtro es 'todos' (en minúsculas), devolvemos todo
    if (filterValue === 'todos') return true;
    
    // Si no es 'todos', comparamos el nombre del vendedor del lead con el filtro
    return leadSellerName === filterValue;
  }
  
  // 2. Lógica para el VENDEDOR (usuario normal)
  // Aquí usamos 'selectedVendedor' que viene por props para filtrar solo lo suyo
  const vendorFilter = (selectedVendedor || '').toLowerCase().trim();
  return leadSellerName === vendorFilter;
});

  const filteredLeads = roleFilteredLeads.filter(lead => {
    const query = searchQuery.toLowerCase();
    return ((lead.nombre || '').toLowerCase().includes(query) || (lead.empresa || '').toLowerCase().includes(query) || (lead.ubicacionEstado || '').toLowerCase().includes(query));
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

  const statsLeads = selectedVendorStatsFilter === 'Todos' ? leads : leads.filter(l => l.vendedor === selectedVendorStatsFilter);
  const statsClosedLeads = statsLeads.filter(l => 
  l.estatus === 'CERRADO_VENTA' || 
  l.estatus === 'CERRADO' || 
  l.estatus === 'CERRADO_ABANDONADO'
);
  const totalClosedSalesValue = statsClosedLeads
  .filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO')
  .reduce((sum, l) => sum + (l.valorEstimado || 0), 0);

  const closedSalesCount = statsClosedLeads.filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO').length;
  const closedAbandonedCount = statsClosedLeads.filter(l => l.estatus === 'CERRADO_ABANDONADO').length;
  const totalClosedCount = statsClosedLeads.length;
  const conversionPercentage = totalClosedCount > 0 ? Math.round((closedSalesCount / totalClosedCount) * 100) : 0;

  const closedLeadsWithBothDates = statsClosedLeads.filter(l => 
  l.fechaIngreso && l.fechaVenta && 
  new Date(l.fechaIngreso).getTime() > 0 && 
  new Date(l.fechaVenta).getTime() > 0
);

  const totalClosureDays = closedLeadsWithBothDates.reduce((sum, l) => {
  const diff = new Date(l.fechaVenta).getTime() - new Date(l.fechaIngreso).getTime();
  return sum + Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, 0);

  const averageClosureTimeGlobal = closedLeadsWithBothDates.length > 0 
    ? Math.round(totalClosureDays / closedLeadsWithBothDates.length) 
    : 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
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
                <input type="text" placeholder="Buscar prospecto..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full" />
              </div>
              {userRole === 'ADMIN' && (
                <select 
                value={adminVendedorFilter || 'todos'} 
                onChange={(e) => setAdminVendedorFilter(e.target.value)}
                className="p-2 border rounded-xl"
              >
                <option value="todos">Todos</option>
                {Array.isArray(uniqueSellersNames) && uniqueSellersNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              )}
            </div>
            <div className="flex items-center gap-2">
              {userRole === 'ADMIN' && activeTab === 'board' && (
                <div className="flex bg-zinc-100 p-1 rounded-xl border">
                  <button onClick={() => setBoardLayout('columns')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${boardLayout === 'columns' ? 'bg-white border text-zinc-900 shadow-xs' : 'text-zinc-500'}`}><LayoutGrid className="w-3.5 h-3.5" />Columnas</button>
                  <button onClick={() => setBoardLayout('table')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${boardLayout === 'table' ? 'bg-white border text-zinc-900 shadow-xs' : 'text-zinc-500'}`}><Table className="w-3.5 h-3.5" />Tabla</button>
                </div>
              )}
              {activeTab === 'board' && <button onClick={handleOpenAddForm} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"><Plus className="w-4 h-4" />Registrar Prospecto</button>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'board' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Oportunidades Activas</span><span className="text-xl font-black text-zinc-850 block mt-1">{activeLeadsCount}</span></div>
              <span className="p-2.5 bg-blue-50 text-blue-650 rounded-lg"><Users2 className="w-5 h-5" /></span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Pipeline Activo Estimado</span><span className="text-xl font-bold text-zinc-800 mt-1 block">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(activePipelineValue)}</span></div>
              <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp className="w-5 h-5" /></span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">% de Efectividad de Cierre</span><span className="text-xl font-bold text-zinc-800 mt-1 block">{conversionPercentage}%</span></div>
              <span className="p-2.5 bg-purple-50 text-purple-650 rounded-lg"><CheckCircle2 className="w-5 h-5" /></span>
            </div>
          </div>

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
                      <td className="py-3.5 px-4 font-bold text-zinc-900">{lead.nombre} <span className="text-[10px] font-mono text-zinc-400">#{lead.id}</span><div className="text-[11px] text-zinc-500 font-normal">{lead.empresa}</div></td>
                      <td className="py-3.5 px-4 font-semibold">{lead.telefono}</td>
                      <td className="py-3.5 px-4"><span className="bg-zinc-100 px-2 py-0.5 rounded text-[10px]">{lead.canalOrigen || 'Orgánico'}</span></td>
                      <td className="py-3.5 px-4 font-semibold text-zinc-850">{lead.vendedor || 'Sin asignar'}</td>
                      <td className="py-3.5 px-4">
                        <select value={lead.estatus} onChange={(e) => handleStatusChange(lead.id, e.target.value)} className="px-2 py-1 text-xs border rounded-xl bg-white">
                          {columns.map(col => <option key={col.id} value={col.id}>{col.title}</option>)}
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => handleOpenEditForm(lead)} className="p-1 px-2.5 bg-zinc-50 border rounded-lg text-[10px] font-bold flex items-center gap-1"><FileText className="w-3 h-3" />Editar</button>
                          <button onClick={() => handleOpenClosureModal(lead)} className="p-1 px-2.5 bg-emerald-50 border rounded-lg text-emerald-800 font-bold text-[10px] flex items-center gap-1"><Check className="w-3 h-3" />Cerrar</button>
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
                {columns.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    leads={column.id === 'CERRADO' ? recentClosedLeads : activeLeads.filter(l => l.estatus === column.id)}
                    updatingLeadIds={updatingLeadIds}
                    onEditLead={handleOpenEditForm}
                    onDeleteLead={handleDeleteLead}
                    onCloseLead={handleOpenClosureModal}
                    userRole={userRole}
                    onSecondPurchase={handleSecondPurchase}
                    onChangeClosureType={handleChangeClosureType}
                    onTransfer={handleTransferLead}
                    vendorList={vendorList}
                  />
                ))}
              </div>
            </DndContext>
          )}
        </div>
      )}

            {activeTab === 'closed' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 space-y-4 shadow-xs">
          <h2 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
            <Archive className="w-5 h-5 text-zinc-500" /> Historial de Cierres
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b text-zinc-450 uppercase font-bold tracking-wider text-[10px] bg-zinc-50">
                  <th className="p-3">Empresa</th>
                  <th className="p-3">Contacto</th>
                  <th className="p-3">Teléfono</th>
                  {userRole === 'ADMIN' && <th className="p-3">Vendedor</th>}
                  <th className="p-3">Motivo</th>
                  <th className="p-3 text-right">Monto USD</th>
                  <th className="p-3">Fecha Cierre</th>
                  <th className="p-3">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {closedLeads.length === 0 ? (
                  <tr><td colSpan={userRole === 'ADMIN' ? 8 : 7} className="p-6 text-center text-zinc-400">Sin cierres registrados.</td></tr>
                ) : closedLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-zinc-50/45 transition-colors text-zinc-700">
                    <td className="p-3 font-bold text-zinc-900">
                      {lead.empresa}
                      <div className="text-[10px] font-mono text-zinc-400">#{lead.id}</div>
                    </td>
                    <td className="p-3">{lead.nombre}</td>
                    <td className="p-3 font-mono text-xs">{lead.telefono}</td>
                    {userRole === 'ADMIN' && <td className="p-3 font-semibold">{lead.vendedor || 'Sin asignar'}</td>}
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        lead.estatus === 'CERRADO_VENTA' || lead.estatus === 'CERRADO'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {lead.estatus === 'CERRADO_VENTA' || lead.estatus === 'CERRADO' ? '✓ Venta' : '✗ Abandonado'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-zinc-800">
                      {lead.valorEstimado > 0 ? `$${lead.valorEstimado.toLocaleString()}` : '—'}
                    </td>
                    <td className="p-3 text-zinc-500">{lead.fechaVenta || '—'}</td>
                    <td className="p-3 text-zinc-500 max-w-[180px] truncate">{lead.notas || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TAB 3: ESTADISTICAS Y KPIS GENERALES (PROTEGIDO POR ROL DE ACCESO) */}
      {activeTab === 'stats' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
            <h2 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
              <BarChart4 className="w-5 h-5 text-blue-600" />
              Estadísticas de Rendimiento y Conversión
            </h2>

            {/* Si es ADMIN: Muestra el selector global para auditar a todo el equipo */}
            {userRole === 'ADMIN' ? (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs font-bold text-zinc-500 uppercase">Filtrar por vendedor:</span>
                <select 
                value={selectedVendorStatsFilter} // Asegúrate de que este estado exista
                onChange={(e) => setSelectedVendorStatsFilter(e.target.value)} 
                className="p-1 border rounded text-xs"
              >
                <option value="Todos">Todos</option>
                
                {/* Aquí usamos la prop 'sellers' que acabas de recibir */}
                {Array.isArray(sellers) && sellers.length > 0 ? (
                  sellers.map((s: any) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))
                ) : (
                  <option disabled>Sin vendedores</option>
                )}
              </select>
              </div>
            ) : (
              /* Si es VENDEDOR: Oculta el selector y fuerza que el filtro sea exclusivamente SU NOMBRE */
              <div className="mt-3">
                <span className="text-xs font-bold text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-lg inline-block">
                  👤 Vista Comercial: <span className="text-blue-700 font-extrabold">{selectedVendedor}</span>
                </span>
              </div>
            )}

            <p className="text-xs text-zinc-500 mt-2">
              Métricas consolidadas del vendedor seleccionado en tiempo real directamente desde MySQL.
            </p>
          </div>

          {/* Bloque lógico de sincronización de datos forzada para el vendedor */}
          {(() => {
            const currentFilter = userRole === 'ADMIN' ? selectedVendorStatsFilter : selectedVendedor;

           const localStatsLeads = currentFilter === 'Todos' 
            ? leads 
            : leads.filter(l => {
                const sellerName = sellersMap[l.seller_id?.toString()] || l.vendedor || "Sin Asignar";
                return sellerName.trim().toLowerCase() === currentFilter.trim().toLowerCase();
              });

            const localStatsClosedLeads = localStatsLeads.filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO' || l.estatus === 'CERRADO_ABANDONADO');
            const localTotalClosedSalesValue = localStatsClosedLeads.filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO').reduce((sum, l) => sum + (l.valorEstimado || 0), 0);
            const localClosedSalesCount = localStatsClosedLeads.filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO').length;
            const localClosedAbandonedCount = localStatsClosedLeads.filter(l => l.estatus === 'CERRADO_ABANDONADO').length;
            const localTotalClosedCount = localStatsClosedLeads.length;
            const localConversionPercentage = localTotalClosedCount > 0 ? Math.round((localClosedSalesCount / localTotalClosedCount) * 100) : 0;
            const leadsReactivados = localStatsLeads.filter(l => (l.reactivaciones || 0) > 0).length;
            const tasaReactivacion = localStatsLeads.length > 0 ? Math.round((leadsReactivados / localStatsLeads.length) * 100) : 0;
            

            // --- CÁLCULO UNIFICADO Y SIN DUPLICADOS ---
            const localClosedLeadsWithBothDates = localStatsClosedLeads.filter(l => l.fechaIngreso && l.fechaVenta && !isNaN(new Date(l.fechaIngreso).getTime()) && !isNaN(new Date(l.fechaVenta).getTime()));
            const localTotalClosureDays = localClosedLeadsWithBothDates.reduce((sum, l) => sum + Math.round((new Date(l.fechaVenta).getTime() - new Date(l.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24)), 0);
            const localAverageClosureTimeGlobal = localClosedLeadsWithBothDates.length > 0 ? Math.round(localTotalClosureDays / localClosedLeadsWithBothDates.length) : 0;

            // --- LÓGICA DE TIEMPO DE PRIMER CONTACTO ---
            const leadsConTiempoContacto = localStatsLeads.filter(l => l.tiempoPrimerContacto !== null && l.tiempoPrimerContacto !== undefined);
            const totalMinutosContacto = leadsConTiempoContacto.reduce((sum, l) => sum + Number(l.tiempoPrimerContacto), 0);
            const promedioMinutosTotales = leadsConTiempoContacto.length > 0 ? Math.round(totalMinutosContacto / leadsConTiempoContacto.length) : 0;

            const formatMinutosADiasHorasMin = (minutosTotales: number): string => {
              if (minutosTotales <= 0) return '—';
              const dias = Math.floor(minutosTotales / (24 * 60));
              const restoDias = minutosTotales % (24 * 60);
              const horas = Math.floor(restoDias / 60);
              const minutos = restoDias % 60;
              const partes = [];
              if (dias > 0) partes.push(`${dias}d`);
              if (horas > 0) partes.push(`${horas}h`);
              if (minutos > 0 || partes.length === 0) partes.push(`${minutos}m`);
              return partes.join(' ');
            };

            const textoTiempoContactoFormat = formatMinutosADiasHorasMin(promedioMinutosTotales);

            return (
              <>
                {/* Tarjetas de KPIs adaptadas dinámicamente al filtro seguro */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                  <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
                    <div><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Cierres con Venta (Won)</span><span className="text-xl font-black text-emerald-700 mt-1 block">{localClosedSalesCount} leads</span></div>
                    <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 className="w-5 h-5" /></span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
                    <div><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Recaudado USD</span><span className="text-xl font-bold text-zinc-850 mt-1 block">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(localTotalClosedSalesValue)}</span></div>
                    <span className="p-2.5 bg-blue-50 text-blue-650 rounded-lg"><DollarSign className="w-5 h-5" /></span>
                  </div>

                  {/* TARJETA OPTIMIZADA: TIEMPO DE PRIMER CONTACTO EXACTO EN DÍAS/HORAS/MINUTOS */}
                  <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Tiempo Primer Contacto</span>
                      <span className="text-xl font-black text-indigo-700 mt-1 block font-mono">
                        {textoTiempoContactoFormat}
                      </span>
                    </div>
                    <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg"><Clock className="w-5 h-5" /></span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
                    <div><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Tiempo Promedio Cierre</span><span className="text-xl font-bold text-zinc-850 mt-1 block">{localAverageClosureTimeGlobal > 0 ? localAverageClosureTimeGlobal : '—'} <span className="text-xs font-normal text-zinc-500">días</span></span></div>
                    <span className="p-2.5 bg-amber-50 text-amber-600 rounded-lg"><Calendar className="w-5 h-5" /></span>
                  </div>
                </div>

                <
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Leads Reactivados</span>
                    <span className="text-xl font-black text-violet-700 mt-1 block">{leadsReactivados} <span className="text-xs font-normal text-zinc-500">({tasaReactivacion}%)</span></span>
                  </div>
                  <span className="p-2.5 bg-violet-50 text-violet-600 rounded-lg"><RefreshCw className="w-5 h-5" /></span>
                </div>

                  
                                  <div className="flex flex-col md:flex-row gap-6 justify-center">
                  <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col items-center justify-center flex-1 max-w-xs mx-auto md:mx-0">
                    <h3 className="text-xs font-bold text-zinc-650 uppercase tracking-widest pb-4 self-start">Tasa de Efectividad</h3>
                    <div className="relative w-40 h-40 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="80" cy="80" r="65" className="stroke-zinc-100" strokeWidth="10" fill="transparent" />
                        <circle cx="80" cy="80" r="65" className="stroke-emerald-500 transition-all duration-1000" strokeWidth="12" strokeDasharray={408.4} strokeDashoffset={408.4 - (408.4 * localConversionPercentage) / 100} strokeLinecap="round" fill="transparent" />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center"><span className="text-3xl font-extrabold text-zinc-900">{localConversionPercentage}%</span><span className="text-[10px] text-zinc-400 font-bold uppercase">Eficiencia</span></div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col items-center justify-center flex-1 max-w-xs mx-auto md:mx-0">
                    <h3 className="text-xs font-bold text-zinc-650 uppercase tracking-widest pb-4 self-start">Tasa de Reactivación</h3>
                    <div className="relative w-40 h-40 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="80" cy="80" r="65" className="stroke-zinc-100" strokeWidth="10" fill="transparent" />
                        <circle cx="80" cy="80" r="65" className="stroke-blue-500 transition-all duration-1000" strokeWidth="12" strokeDasharray={408.4} strokeDashoffset={408.4 - (408.4 * Math.min((() => { const cerrados = localStatsLeads.filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO_ABANDONADO' || l.estatus === 'CERRADO').length; const reactivados = localStatsLeads.filter(l => (l as any).reactivaciones > 0).length; return cerrados > 0 ? Math.round((reactivados / cerrados) * 100) : 0; })(), 100)) / 100} strokeLinecap="round" fill="transparent" />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center"><span className="text-3xl font-extrabold text-zinc-900">{Math.min((() => { const cerrados = localStatsLeads.filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO_ABANDONADO' || l.estatus === 'CERRADO').length; const reactivados = localStatsLeads.filter(l => (l as any).reactivaciones > 0).length; return cerrados > 0 ? Math.round((reactivados / cerrados) * 100) : 0; })(), 100)}%</span><span className="text-[10px] text-zinc-400 font-bold uppercase">Reactivados</span></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col justify-between">
                  <h3 className="text-xs font-bold text-zinc-650 uppercase tracking-widest pb-2">Distribución de Leads por Etapa</h3>
                  <div className="space-y-3 flex-1 flex flex-col justify-center">
                    {columns.map((column) => {
                      const statsActiveLeads = localStatsLeads.filter(l => l.estatus !== 'CERRADO_VENTA' && l.estatus !== 'CERRADO_ABANDONADO' && l.estatus !== 'CERRADO');
                      const amtInCol = statsActiveLeads.filter(l => l.estatus === column.id).length;
                      const ratio = statsActiveLeads.length > 0 ? (amtInCol / statsActiveLeads.length) * 100 : 0;
                      return (
                        <div key={column.id} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold"><span className="text-zinc-800 flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${column.color}`} />{column.title}</span><span className="text-zinc-500 font-mono">{amtInCol} leads</span></div>
                          <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden"><div className={`h-full rounded-full ${column.color}`} style={{ width: `${Math.max(ratio, 2)}%` }} /></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
          {/* Tabla General de Rendimiento Oficial por Vendedores (ESTRICTAMENTE EXCLUSIVA PARA ADMIN) */}
        {/* Tabla de Rendimiento Oficial */}
{userRole === 'ADMIN' && activeTab === 'stats' && (
  <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
    <h3 className="text-xs font-bold text-zinc-650 uppercase tracking-widest">RENDIMIENTO POR VENDEDORES</h3>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-zinc-100 text-zinc-400 font-bold bg-zinc-50/50">
            <th className="p-3">Vendedor</th>
            <th className="p-3">Total Asignados</th>
            <th className="p-3">Activos</th>
            <th className="p-3">Ganados</th>
            <th className="p-3">Perdidos</th>
            <th className="p-3 text-right">Recaudado</th>
            <th className="p-3 text-center">Tasa Conversión</th>
            <th className="p-3 text-center">Tiempo Promedio</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {sellersPerformance.map((seller) => (
            <tr key={seller.vName} className="hover:bg-zinc-50/45 transition-colors text-zinc-700">
              <td className="p-3 font-bold text-zinc-900">{seller.vName}</td>
              <td className="p-3 font-semibold">{seller.total}</td>
              <td className="p-3 font-medium text-zinc-500">{seller.vActive}</td>
              <td className="p-3 font-bold text-emerald-700">{seller.vWon}</td>
              <td className="p-3 text-zinc-400">{seller.vLost}</td>
              <td className="p-3 text-right font-bold text-zinc-800">${seller.vRev.toLocaleString()}</td>
              <td className="p-3 text-center"><span className="px-2 py-0.5 bg-zinc-100 rounded text-zinc-800 font-bold font-mono">{seller.vRate}%</span></td>
              <td className="p-3 text-center font-semibold text-zinc-600">{seller.vAverageClosureTime > 0 ? `${seller.vAverageClosureTime} días` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

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
              <div className="pt-4 border-t flex justify-end gap-2 text-xs">
                <button type="button" onClick={() => setIsClosureModalOpen(false)} className="px-4 py-2 border rounded-xl text-zinc-600">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl">Guardar Cierre</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <input type="text" value={formLead.vendedor || ''} onChange={(e) => setFormLead({ ...formLead, vendedor: e.target.value })} disabled={userRole === 'VENDEDOR'} className="w-full px-3 py-2 text-xs border rounded-xl bg-zinc-100" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Fase del Embudo</label>
                  <select value={formLead.estatus || 'NUEVO'} onChange={(e) => setFormLead({ ...formLead, estatus: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl bg-white">
                    {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Observaciones</label>
                  <textarea value={formLead.notas || ''} onChange={(e) => setFormLead({ ...formLead, notas: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" rows={2} />
                </div>
              </div>
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
