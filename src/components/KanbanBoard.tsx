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

// Preset color templates for new columns
const COLOR_PRESETS = [
  {
    color: 'bg-indigo-500',
    bgClass: 'bg-[#faf5ff]',
    borderClass: 'border-indigo-200',
    accentClass: 'bg-indigo-100',
    textClass: 'text-indigo-700'
  },
  {
    color: 'bg-purple-500',
    bgClass: 'bg-[#faf5ff]',
    borderClass: 'border-purple-200',
    accentClass: 'bg-purple-100',
    textClass: 'text-purple-700'
  },
  {
    color: 'bg-orange-500',
    bgClass: 'bg-[#fff7ed]',
    borderClass: 'border-orange-200',
    accentClass: 'bg-orange-100',
    textClass: 'text-orange-700'
  },
  {
    color: 'bg-pink-500',
    bgClass: 'bg-[#fff1f2]',
    borderClass: 'border-pink-200',
    accentClass: 'bg-pink-100',
    textClass: 'text-pink-700'
  },
  {
    color: 'bg-cyan-500',
    bgClass: 'bg-[#ecfeff]',
    borderClass: 'border-cyan-200',
    accentClass: 'bg-cyan-105',
    textClass: 'text-cyan-705'
  },
  {
    color: 'bg-teal-500',
    bgClass: 'bg-[#f0fdf4]',
    borderClass: 'border-teal-200',
    accentClass: 'bg-teal-100',
    textClass: 'text-teal-700'
  }
];

interface KanbanBoardProps {
  userRole?: 'ADMIN' | 'VENDEDOR';
  setUserRole?: (role: 'ADMIN' | 'VENDEDOR') => void;
  selectedVendedor?: string;
  setSelectedVendedor?: (vendedor: string) => void;
  activeTab?: 'board' | 'closed' | 'stats' | 'settings';
  setActiveTab?: (tab: 'board' | 'closed' | 'stats' | 'settings') => void;
  onSellersUpdate?: (sellers: string[]) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  userRole: propUserRole,
  setUserRole: propSetUserRole,
  selectedVendedor: propSelectedVendedor,
  setSelectedVendedor: propSetSelectedVendedor,
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  onSellersUpdate,
}) => {
  // 1. Roles & Profile Configuration
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

  // App Main Tabs
  const [internalActiveTab, setInternalActiveTab] = useState<'board' | 'closed' | 'stats' | 'settings'>('board');
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalActiveTab;
  const setActiveTab = (tab: 'board' | 'closed' | 'stats' | 'settings') => {
    if (propSetActiveTab) propSetActiveTab(tab);
    setInternalActiveTab(tab);
  };

  // Leads State unificado
  const [leads, setLeads] = useState<any[]>([]);

  // Fetch from Database
  const fetchLeadsFromDB = async () => {
    try {
      console.log('Fetching leads from /api/leads...');
      const response = await fetch('/api/leads');
      if (!response.ok) {
        console.error('Response status:', response.status);
        throw new Error(`Failed to fetch leads: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Database Leads fetched:', data);
      
      if (data) {
        setLeads(data);
      }
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

  useEffect(() => {
    if (onSellersUpdate) {
      const sellers = Array.from(
        new Set(leads.map(l => (l.vendedor || '').trim()).filter(Boolean))
      );
      onSellersUpdate(sellers as string[]);
    }
  }, [leads, onSellersUpdate]);

  // Custom Columns State
  const [columns, setColumns] = useState<Column[]>(() => {
    const defaultCols: Column[] = [
      {
        id: 'CERRADO',
        title: 'CERRADO',
        color: 'bg-zinc-650',
        bgClass: 'bg-[#fafafa]',
        borderClass: 'border-zinc-200',
        accentClass: 'bg-zinc-100',
        textClass: 'text-zinc-700'
      },
      {
        id: 'NUEVO',
        title: 'NUEVO',
        color: 'bg-blue-500',
        bgClass: 'bg-[#f8fafc]',
        borderClass: 'border-slate-200',
        accentClass: 'bg-blue-100',
        textClass: 'text-blue-700'
      },
      {
        id: 'CONTACTADO',
        title: 'CONTACTADO',
        color: 'bg-amber-500',
        bgClass: 'bg-[#fffbeb]',
        borderClass: 'border-amber-200',
        accentClass: 'bg-amber-100',
        textClass: 'text-amber-700'
      }
    ];

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_kanban_columns');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Column[];
          if (!parsed.some(c => c.id === 'CERRADO')) {
            parsed.push({
              id: 'CERRADO',
              title: 'CERRADO',
              color: 'bg-zinc-650',
              bgClass: 'bg-[#fafafa]',
              borderClass: 'border-zinc-200',
              accentClass: 'bg-zinc-100',
              textClass: 'text-zinc-700'
            });
            localStorage.setItem('crm_kanban_columns', JSON.stringify(parsed));
          }
          return parsed;
        } catch (e) {
          return defaultCols;
        }
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
    const updatedLeads = leads.map(l => l.id === lead.id ? { ...l, vendedor: newVendedor } : l);
    setLeads(updatedLeads);
    localStorage.setItem('crm_leads_data', JSON.stringify(updatedLeads));
    showToast(`Lead "${lead.nombre}" transferido a ${newVendedor}`, 'success');
  };

  const vendorList = Array.from(
    new Set(leads.map(l => (l.vendedor || 'Sin Asignar').trim()).filter(Boolean))
  ) as string[];

  // Google Sheets Connection States (Mantenidos por compatibilidad estructural)
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState(getSavedSpreadsheetId() || '');
  const [spreadsheetInput, setSpreadsheetInput] = useState(getSavedSpreadsheetId() || '');
  const [sheetTitle, setSheetTitle] = useState('');
  const [isLoadingFromSheets, setIsLoadingFromSheets] = useState(false);
  const [sheetsError, setSheetsError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(current => current?.message === message ? null : current);
    }, 4500);
  };

  // Global Controls
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

  // Drag Overlay & Trackers
  const [updatingLeadIds, setUpdatingLeadIds] = useState<string[]>([]);
  const [activeLead, setActiveLead] = useState<any>(null);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  useEffect(() => {
    if (showCelebration) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [showCelebration]);

  // Modals Core states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formLead, setFormLead] = useState<any>(null);
  const [formError, setFormError] = useState('');

  // New Column States
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

  // Lead Closure Form Modal States
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [isSecondPurchaseFlow, setIsSecondPurchaseFlow] = useState(false);
  const [closingLead, setClosingLead] = useState<any>(null);
  const [motivoCierre, setMotivoCierre] = useState<'VENTA' | 'ABANDONADO'>('VENTA');
  const [montoCerrado, setMontoCerrado] = useState<string>('');
  const [nroFactura, setNroFactura] = useState<string>('');
  const [fechaCierre, setFechaCierre] = useState<string>('');
  const [closureError, setClosureError] = useState('');

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('crm_user_role', userRole);
  }, [userRole]);

  useEffect(() => {
    localStorage.setItem('crm_selected_vendedor', selectedVendedor);
  }, [selectedVendedor]);

  useEffect(() => {
    localStorage.setItem('crm_kanban_columns', JSON.stringify(columns));
  }, [columns]);

  // Google Sheets Initial Auth fallback tracker
  useEffect(() => {
    const unsubscribe = initAuth(
      async (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        const activeId = getSavedSpreadsheetId();
        if (activeId && accessToken) {
          loadLeads(accessToken, activeId);
        }
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadLeads = async (accessToken: string, sid: string) => {
    if (!accessToken || !sid) return;
    setIsLoadingFromSheets(true);
    setSheetsError('');
    try {
      const parsedId = parseSpreadsheetIdInput(sid);
      const result = await fetchLeadsFromSheet(accessToken, parsedId);
      setLeads(result.leads);
      setSheetTitle(result.sheetTitle);
      showToast(`Sincronizado correctamente.`, 'success');
    } catch (error: any) {
      console.error(error);
      setSheetsError(error.message || 'Error al conectar.');
      setLeads(INITIAL_LEADS);
    } finally {
      setIsLoadingFromSheets(false);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lead = leads.find(l => l.id === active.id);
    if (lead) {
      setActiveLead(lead);
    }
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
        const isCloseAllowed = userRole === 'ADMIN' || lead.hasPassedContactado || (lead.estatus !== 'NUEVO');
        if (!isCloseAllowed) {
          alert('🔒 Acción bloqueada: Los vendedores solo pueden cerrar un lead una vez que haya pasado por la fase de "CONTACTADO" o posterior.');
          return;
        }
        handleOpenClosureModal(lead);
      } else {
        await handleStatusChange(leadId, targetStatus);
      }
    }
  };

  // Perform status updates real hacia MySQL con tipado flexible para evitar fallos de esbuild
  const handleStatusChange = async (leadId: string, newStatus: string, closureData?: any) => {
    const leadIdx = leads.findIndex((l: any) => l.id === leadId);
    if (leadIdx === -1) return;

    const originalLead = leads[leadIdx];
    const prevStatus = originalLead.estatus;
    if (prevStatus === newStatus && !closureData) return;

    const updatedLead: any = {
      ...originalLead,
      estatus: newStatus,
      hasPassedContactado: originalLead.hasPassedContactado || newStatus === 'CONTACTADO' || newStatus !== 'NUEVO',
      ...(closureData || {})
    };

    setLeads((prev: any[]) => prev.map((l: any) => l.id === leadId ? updatedLead : l));
    setUpdatingLeadIds((prev: string[]) => [...prev, leadId]);

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
      showToast(`¡Excelente! "${originalLead.nombre}" actualizado en MySQL con éxito.`, 'success');

      sendWebhookStatusChange(updatedLead, prevStatus).then((val: any) => {
        const newLog: any = {
          id: Math.random().toString(),
          timestamp: new Date().toISOString(),
          leadId,
          leadNombre: originalLead.nombre,
          prevStatus,
          newStatus,
          url: 'MySQL & n8n Webhook',
          status: val.success ? 'SUCCESS' : 'ERROR',
          responseMessage: `Sincronizado MySQL | n8n: ${val.message}`
        };
        setWebhookLogs((prev: any[]) => [newLog, ...prev]);
      });

    } catch (error: any) {
      console.error(error);
      showToast('Error de comunicación: No se pudo guardar en la base de datos.', 'error');
    } finally {
      setUpdatingLeadIds((prev: string[]) => prev.filter((id: string) => id !== leadId));
    }
  };

  // Add Dynamic Column
  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    const titleClean = newColTitle.trim().toUpperCase();
    if (!titleClean) return;

    if (columns.some(c => c.id === titleClean || c.title === titleClean)) {
      alert('Esta fase ya existe en el tablero.');
      return;
    }

    const presetIdx = columns.length % COLOR_PRESETS.length;
    const colorProfile = COLOR_PRESETS[presetIdx];

    const newCol: Column = {
      id: titleClean,
      title: titleClean,
      ...colorProfile
    };

    setColumns(prev => [...prev, newCol]);
    setNewColTitle('');
    setIsAddingCol(false);
  };

  // Remove Dynamic Column
  const handleRemoveColumn = async (colId: string) => {
    if (colId === 'NUEVO' || colId === 'CONTACTADO') {
      alert('Las columnas por defecto no pueden eliminarse.');
      return;
    }
    const leadsInCol = leads.filter(l => l.estatus === colId);
    if (leadsInCol.length > 0) {
      if (!confirm(`La columna tiene leads activos. Se migrarán a "NUEVO". ¿Proceder?`)) return;
      setLeads(prev => prev.map(l => l.estatus === colId ? { ...l, estatus: 'NUEVO' } : l));
    }
    setColumns(prev => prev.filter(c => c.id !== colId));
  };

  // Lead Closure Modals
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
    setIsSecondPurchaseFlow(false);
    setClosingLead(lead);
    setMotivoCierre(lead.motivoCierre === 'ABANDONADO' ? 'ABANDONADO' : 'VENTA');
    setMontoCerrado(lead.valorEstimado > 0 ? lead.valorEstimado.toString() : '');
    setNroFactura(lead.numFactura || '');
    setFechaCierre(lead.fechaVenta || new Date().toISOString().split('T')[0]);
    setClosureError('');
    setIsClosureModalOpen(true);
  };

  const handleSaveClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingLead) return;

    const isSale = motivoCierre === 'VENTA';
    const finalMonto = isSale ? Number(montoCerrado || 0) : 0;
    const finalInvoice = isSale ? nroFactura.trim() : '';

    if (isSale && (!montoCerrado || finalMonto <= 0)) {
      setClosureError('Por favor introduce un monto de venta válido.');
      return;
    }

    if (!fechaCierre) {
      setClosureError('Debes especificar la fecha del cierre.');
      return;
    }

    setClosureError('');
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
    if (confirm(`¿Deseas reactivar el lead de "${lead.nombre}"?`)) {
      await handleStatusChange(lead.id, 'NUEVO', {
        valorEstimado: 0,
        numFactura: '',
        fechaVenta: '',
        motivoCierre: null
      });
    }
  };

  // Standard Forms
  const handleOpenAddForm = () => {
    setFormLead({
      id: `L-${Date.now()}`,
      fechaIngreso: new Date().toISOString().substring(0, 10),
      nombre: '',
      empresa: '',
      rif: '',
      telefono: '',
      ubicacionEstado: '',
      ubicacionDetalle: '',
      canalOrigen: '',
      campana: '',
      vendedor: userRole === 'VENDEDOR' ? selectedVendedor : 'Carlos Pérez',
      estatus: 'NUEVO',
      notas: '',
      valorEstimado: 0,
      numFactura: '',
      fechaVenta: '',
      categoriaInteres: ''
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
      setFormError('Campos requeridos vacíos.');
      return;
    }

    const isEditing = !!formLead.id && leads.some(l => l.id === formLead.id);
    setFormError('');

    try {
      if (isEditing) {
        await handleStatusChange(formLead.id, formLead.estatus, formLead);
      } else {
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formLead)
        });
        if (!response.ok) throw new Error('Error al registrar lead');
        await fetchLeadsFromDB();
      }
      setIsFormOpen(false);
      setFormLead(null);
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar.');
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm(`¿Deseas remover permanentemente este lead de la base de datos MySQL?`)) {
      try {
        const response = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('No se pudo borrar');
        setLeads(prev => prev.filter(l => l.id !== id));
        showToast('Lead eliminado correctamente.', 'success');
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Mapeos de filtros consolidados desde MySQL
  const uniqueSellers: string[] = Array.from(
    new Set(leads.map(l => (l.vendedor || '').trim()).filter(Boolean))
  );

  const roleFilteredLeads = leads.filter(lead => {
    if (userRole === 'ADMIN') {
      if (adminVendedorFilter === 'todos') return true;
      return (lead.vendedor || '').trim().toLowerCase() === adminVendedorFilter.toLowerCase();
    }
    return (lead.vendedor || '').trim().toLowerCase() === selectedVendedor.trim().toLowerCase();
  });

  const filteredLeads = roleFilteredLeads.filter(lead => {
    const query = searchQuery.toLowerCase();
    return (
      (lead.nombre || '').toLowerCase().includes(query) ||
      (lead.empresa || '').toLowerCase().includes(query) ||
      (lead.ubicacionEstado || '').toLowerCase().includes(query) ||
      (lead.vendedor || '').toLowerCase().includes(query)
    );
  });

  // Segmentación comercial de leads
  const activeLeads = filteredLeads.filter(l => 
    l.estatus !== 'CERRADO' && 
    l.estatus !== 'CERRADO_VENTA' && 
    l.estatus !== 'CERRADO_ABANDONADO'
  );

  const unfilteredClosedLeads = filteredLeads.filter(l => 
    l.estatus === 'CERRADO' || 
    l.estatus === 'CERRADO_VENTA' || 
    l.estatus === 'CERRADO_ABANDONADO'
  );

  const recentClosedLeads = unfilteredClosedLeads.filter(l => {
    if (l.hasSecondPurchase) return false;
    if (!l.fechaVenta) return false;
    const saleDate = new Date(l.fechaVenta).getTime();
    if (isNaN(saleDate)) return false;
    const diffTime = new Date().getTime() - saleDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 30;
  });

  const closedLeads = unfilteredClosedLeads.filter(l => {
    if (userRole !== 'ADMIN' || closedReasonFilter === 'todos') return true;
    const isWon = l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO';
    const closingReason = l.motivoCierre || (isWon ? 'VENTA' : 'ABANDONADO');
    return closingReason === closedReasonFilter;
  });

  // Métricas reales calculadas desde la base de datos
  const totalLeadsCount = filteredLeads.length;
  const activeLeadsCount = activeLeads.length;
  const activePipelineValue = activeLeads.reduce((sum, l) => sum + (l.valorEstimado || 0), 0);
  
  const statsLeads = selectedVendorStatsFilter === 'Todos' 
    ? leads 
    : leads.filter(l => l.vendedor === selectedVendorStatsFilter);

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

  const conversionPercentage = totalClosedCount > 0 
    ? Math.round((closedSalesCount / totalClosedCount) * 100) 
    : 0;

  const closedLeadsWithBothDates = statsClosedLeads.filter(l => {
    if (!l.fechaIngreso || !l.fechaVenta) return false;
    const d1 = new Date(l.fechaIngreso).getTime();
    const d2 = new Date(l.fechaVenta).getTime();
    return !isNaN(d1) && !isNaN(d2);
  });
  const totalClosureDays = closedLeadsWithBothDates.reduce((sum, l) => {
    const d1 = new Date(l.fechaIngreso).getTime();
    const d2 = new Date(l.fechaVenta || '').getTime();
    const diff = d2 - d1;
    return sum + Math.round(diff / (1000 * 60 * 60 * 24));
  }, 0);
  const averageClosureTimeGlobal = closedLeadsWithBothDates.length > 0
    ? Math.round(totalClosureDays / closedLeadsWithBothDates.length)
    : 0;

  const averageResponseTimeHours = 2; // KPI base

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
      {(activeTab === 'board' || activeTab === 'closed') && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-zinc-900 mt-1">SUPRI LEADS</h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Tablero dinámico de prospección. Cambia de estatus, arrastra candidatos y cierra tus oportunidades.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder={activeTab === 'closed' ? "Buscar lead cerrado..." : "Buscar prospecto..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 text-xs border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                />
              </div>

              {userRole === 'ADMIN' && (activeTab === 'board' || activeTab === 'closed') && (
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase whitespace-nowrap hidden sm:inline">Vendedor:</span>
                  <select
                    value={adminVendedorFilter}
                    onChange={(e) => setAdminVendedorFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer h-[34px] shadow-xs"
                  >
                    <option value="todos">Todos</option>
                    {uniqueSellers.map((seller) => (
                      <option key={seller} value={seller}>{seller}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {userRole === 'ADMIN' && activeTab === 'board' && (
                <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200/60 mr-1 shadow-xs">
                  <button onClick={() => setBoardLayout('columns')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${boardLayout === 'columns' ? 'bg-white text-zinc-905 shadow-xs font-extrabold border border-zinc-200/50' : 'text-zinc-500'}`}>
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Columnas</span>
                  </button>
                  <button onClick={() => setBoardLayout('table')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${boardLayout === 'table' ? 'bg-white text-zinc-905 shadow-xs font-extrabold border border-zinc-200/50' : 'text-zinc-500'}`}>
                    <Table className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tabla</span>
                  </button>
                </div>
              )}

              {activeTab === 'board' && (
                <button onClick={handleOpenAddForm} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-colors">
                  <Plus className="w-4 h-4" />
                  <span>Registrar Prospecto</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'board' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Oportunidades Activas</span>
                <span className="text-xl font-black text-zinc-850 mt-1 block">{activeLeadsCount}</span>
              </div>
              <span className="p-2.5 bg-blue-50 text-blue-650 rounded-lg"><Users2 className="w-5 h-5" /></span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Pipeline Activo Estimado</span>
                <span className="text-xl font-bold text-zinc-800 mt-1 block">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(activePipelineValue)}
                </span>
              </div>
              <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp className="w-5 h-5" /></span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">% de Efectividad de Cierre</span>
                <span className="text-xl font-bold text-zinc-800 mt-1 block">{conversionPercentage}%</span>
              </div>
              <span className="p-2.5 bg-purple-50 text-purple-650 rounded-lg"><CheckCircle2 className="w-5 h-5" /></span>
            </div>
          </div>

          {userRole === 'ADMIN' && boardLayout === 'table' ? (
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Prospecto / Organización</th>
                      <th className="py-3 px-4">Contacto</th>
                      <th className="py-3 px-4">Origen</th>
                      <th className="py-3 px-4">Vendedor</th>
                      <th className="py-3 px-4">Estatus</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
                    {activeLeads.length === 0 ? (
                      <tr><td colSpan={6} className="py-12 text-center text-zinc-400 italic">No se encontraron registros.</td></tr>
                    ) : (
                      activeLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-zinc-50/75 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-zinc-900">{lead.nombre} <span className="text-[10px] font-mono text-zinc-400 font-normal">#{lead.id}</span></td>
                          <td className="py-3.5 px-4 font-semibold text-zinc-800">{lead.telefono}</td>
                          <td className="py-3.5 px-4"><span className="bg-zinc-100 px-2 py-0.5 rounded-md text-[10px]">{lead.canalOrigen || 'Orgánico'}</span></td>
                          <td className="py-3.5 px-4 font-semibold text-zinc-850">{lead.vendedor || 'Sin asignar'}</td>
                          <td className="py-3.5 px-4">
                            <select value={lead.estatus} onChange={(e) => handleStatusChange(lead.id, e.target.value)} className="px-2.5 py-1 text-xs font-bold border rounded-xl bg-white text-zinc-850">
                              {columns.map(col => <option key={col.id} value={col.id}>{col.title}</option>)}
                            </select>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => handleOpenEditForm(lead)} className="p-1 px-2.5 bg-zinc-50 border rounded-lg text-zinc-700 font-bold text-[10px] flex items-center gap-1"><FileText className="w-3 h-3" />Editar</button>
                              <button onClick={() => handleOpenClosureModal(lead)} className="p-1 px-2.5 bg-emerald-50 border border-emerald-250 rounded-lg text-emerald-800 font-bold text-[10px] flex items-center gap-1"><Check className="w-3 h-3" />Cerrar</button>
                              <button onClick={() => handleDeleteLead(lead.id)} className="p-1 text-zinc-500 hover:text-red-650"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {columns.map((column) => {
                  const columnLeads = column.id === 'CERRADO' ? recentClosedLeads : activeLeads.filter((lead) => lead.estatus === column.id);
                  return (
                    <div key={column.id} className="relative group/col">
                      {userRole === 'ADMIN' && column.id !== 'NUEVO' && column.id !== 'CONTACTADO' && column.id !== 'CERRADO' && (
                        <button onClick={() => handleRemoveColumn(column.id)} className="absolute top-3.5 right-4 z-20 text-zinc-400 hover:text-red-600 p-1 rounded-md hover:bg-zinc-100 opacity-0 group-hover/col:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                      <KanbanColumn
                        column={column}
                        leads={columnLeads}
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
                    </div>
                  );
                })}
              </div>
              <DragOverlay>
                {activeLead ? (
                  <div className="rotate-[3deg]">
                    <LeadCard lead={activeLead} isUpdating={false} onEdit={() => {}} onDelete={() => {}} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      )}

      {/* 6. TAB 2: HISTORIAL DE LEADS CERRADOS VIEW */}
      {activeTab === 'closed' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-950 flex items-center gap-2"><Archive className="w-5 h-5 text-zinc-500" /> Historial de Leads Cerrados</h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold font-mono">
              <span className="text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border">Won/Ventas: {closedSalesCount} (${totalClosedSalesValue.toLocaleString()})</span>
              <span className="text-zinc-650 bg-zinc-150 px-3 py-1.5 rounded-xl border">Perdidos: {closedAbandonedCount}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-450 uppercase font-bold tracking-wider text-[10px] bg-zinc-50">
                  <th className="p-3">Nombre Contacto</th>
                  <th className="p-3">Empresa</th>
                  <th className="p-3">Vendedor</th>
                  <th className="p-3">Motivo de Cierre</th>
                  <th className="p-3">Fecha Cierre</th>
                  <th className="p-3 text-right">Monto Cerrado</th>
                  <th className="p-3">No Factura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {closedLeads.length > 0 ? (
                  closedLeads.map((lead) => {
                    const isWon = lead.estatus === 'CERRADO_VENTA' || lead.estatus === 'CERRADO';
                    const closingReason = lead.motivoCierre || (isWon ? 'VENTA' : 'ABANDONADO');
                    return (
                      <tr key={lead.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="p-3 font-semibold text-zinc-900">{lead.nombre}</td>
                        <td className="p-3 text-zinc-650">{lead.empresa}</td>
                        <td className="p-3 text-zinc-500">{lead.vendedor || 'Unassigned'}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${closingReason === 'VENTA' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-zinc-100 text-zinc-550 border border-zinc-200'}`}>{closingReason === 'VENTA' ? 'VENTA EXITOSA' : 'ABANDONADO'}</span>
                        </td>
                        <td className="p-3 font-mono text-zinc-500">{lead.fechaVenta || 'S/F'}</td>
                        <td className="p-3 text-right font-bold text-zinc-800">{isWon ? `$${(lead.valorEstimado || 0).toLocaleString()}` : '$0'}</td>
                        <td className="p-3 font-mono text-zinc-500">{lead.numFactura || '—'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={7} className="p-8 text-center text-zinc-450 font-medium">No hay registros archivados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TAB 3: RESTITUCIÓN DE LAS ESTADÍSTICAS Y TARJETAS ORIGINALES (CONECTADAS A BACKEND) */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
            <h2 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
              <BarChart4 className="w-5 h-5 text-blue-600" />
              Estadísticas de Rendimiento y Conversión
            </h2>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs font-bold text-zinc-500 uppercase">Filtrar por vendedor:</span>
              <select
                value={selectedVendorStatsFilter}
                onChange={(e) => setSelectedVendorStatsFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg text-zinc-700 font-semibold focus:outline-none"
              >
                <option value="Todos">Todos</option>
                {uniqueSellers.map((seller) => (
                  <option key={seller} value={seller}>{seller}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Métricas consolidadas del vendedor seleccionado en tiempo real.
            </p>
          </div>

          {/* Restitución de las 4 Tarjetas de KPIs Históricos */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Cierres con Venta (Won)</span>
                <span className="text-xl font-black text-emerald-700 mt-1 block">{closedSalesCount} leads</span>
              </div>
              <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 className="w-5 h-5" /></span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block font-sans">Recaudado USD (Ventas)</span>
                <span className="text-xl font-bold text-zinc-850 mt-1 block">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalClosedSalesValue)}
                </span>
              </div>
              <span className="p-2.5 bg-blue-50 text-blue-650 rounded-lg"><DollarSign className="w-5 h-5" /></span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Promedio Respuesta</span>
                <span className="text-xl font-bold text-zinc-850 mt-1 block">{averageResponseTimeHours} <span className="text-xs font-normal text-zinc-500">horas</span></span>
              </div>
              <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg"><Clock className="w-5 h-5" /></span>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Tiempo Promedio Cierre</span>
                <span className="text-xl font-bold text-zinc-850 mt-1 block">{averageClosureTimeGlobal} <span className="text-xs font-normal text-zinc-500">días</span></span>
              </div>
              <span className="p-2.5 bg-amber-50 text-amber-600 rounded-lg"><Calendar className="w-5 h-5" /></span>
            </div>
          </div>

          {/* Ranking oficial de efectividad (Solo visible para ADMIN) */}
          {userRole === 'ADMIN' && <SellerRanking leads={leads} currentUser={selectedVendedor} />}

          {/* Gráficos de Conversión y Distribución en Barra */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col items-center justify-center">
              <h3 className="text-xs font-bold text-zinc-650 uppercase tracking-widest pb-4 self-start">Tasa de Efectividad</h3>
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="65" className="stroke-zinc-100" strokeWidth="10" fill="transparent" />
                  <circle cx="80" cy="80" r="65" className="stroke-emerald-500 transition-all duration-1000" strokeWidth="12" strokeDasharray={408.4} strokeDashoffset={408.4 - (408.4 * conversionPercentage) / 100} strokeLinecap="round" fill="transparent" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-zinc-900">{conversionPercentage}%</span>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">Eficiencia</span>
                </div>
              </div>
              <div className="flex gap-4 mt-4 text-[10px] font-bold text-zinc-500 w-full justify-around border-t pt-3">
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" /><span>Ventas: {closedSalesCount}</span></div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-zinc-300 block" /><span>Descartes: {closedAbandonedCount}</span></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs lg:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-650 uppercase tracking-widest pb-2">Distribución de Leads por Etapa</h3>
                <p className="text-[11px] text-zinc-400 pb-4">Densidad de volumen de la cartera activa en MySQL.</p>
              </div>
              <div className="space-y-3 flex-1 flex flex-col justify-center">
                {columns.map((column) => {
                  const statsActiveLeads = statsLeads.filter(l => l.estatus !== 'CERRADO_VENTA' && l.estatus !== 'CERRADO_ABANDONADO' && l.estatus !== 'CERRADO');
                  const amtInCol = statsActiveLeads.filter(l => l.estatus === column.id).length;
                  const ratio = statsActiveLeads.length > 0 ? (amtInCol / statsActiveLeads.length) * 100 : 0;
                  return (
                    <div key={column.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-zinc-800 flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${column.color}`} />{column.title}</span>
                        <span className="text-zinc-500 font-mono">{amtInCol} leads</span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden">
                        <div className={`h-full rounded-full ${column.color}`} style={{ width: `${Math.max(ratio, 2)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7.5 TAB 4: CONFIGURACIONES */}
      {activeTab === 'settings' && userRole === 'ADMIN' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="p-3 bg-zinc-900 text-white rounded-xl"><Settings2 className="w-6 h-6" /></span>
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Panel de Control & Ajustes del Administrador</h2>
                <p className="text-xs text-zinc-500">Configura y personaliza las fases comerciales del embudo.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-zinc-800 flex items-center gap-2 border-b border-zinc-100 pb-2"><Layers className="w-4.5 h-4.5 text-blue-600" /> Gestión de Fases y Columnas del Embudo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 bg-zinc-50/50 p-4 rounded-xl border max-h-[280px]">
                <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1"><PlusCircle className="w-4 h-4 text-blue-500" /> Agregar Nueva Fase</h4>
                <form onSubmit={handleAddColumn} className="space-y-3">
                  <input type="text" placeholder="Escriba fase (Ej: PROPUESTA)" value={newColTitle} onChange={(e) => setNewColTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs uppercase font-bold text-zinc-800" required />
                  <button type="submit" className="w-full bg-blue-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl">Crear y Registrar Fase</button>
                </form>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1">🌐 Fases Activas Registradas ({columns.length})</h4>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {columns.map((column, index) => {
                    const count = leads.filter(l => l.estatus === column.id).length;
                    const isProtected = column.id === 'NUEVO' || column.id === 'CONTACTADO';
                    return (
                      <div key={column.id} className="flex items-center justify-between p-3 bg-white border rounded-xl">
                        <span className="text-xs font-bold text-zinc-850">{column.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">{count} leads</span>
                          {!isProtected && <button onClick={() => handleRemoveColumn(column.id)} className="text-red-600 text-[10px] font-bold hover:underline">Quitar</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. NEW / EDIT LEAD GENERAL MODAL */}
      {isFormOpen && formLead && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl relative my-8 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-650" type="button"><X className="w-5 h-5" /></button>
            <h3 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> Formulario de Oportunidad</h3>
            <form onSubmit={handleSaveLead} className="space-y-4">
              <div className="bg-zinc-50/50 p-4 rounded-xl border space-y-3">
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
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Estado</label>
                    <input type="text" value={formLead.ubicacionEstado || ''} onChange={(e) => setFormLead({ ...formLead, ubicacionEstado: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Monto Inicial Estimado</label>
                    <input type="number" value={formLead.valorEstimado || ''} onChange={(e) => setFormLead({ ...formLead, valorEstimado: Number(e.target.value) })} className="w-full px-3 py-2 text-xs border rounded-xl" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Vendedor Responsable</label>
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
                  <textarea rows={2} value={formLead.notas || ''} onChange={(e) => setFormLead({ ...formLead, notas: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" />
                </div>
              </div>
              <div className="pt-4 border-t flex justify-end gap-2 text-xs">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 border rounded-xl text-zinc-650">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-zinc-950 text-white font-bold rounded-xl">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
