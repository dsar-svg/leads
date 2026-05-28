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

  // Leads State
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

  // Fetch from Database al inicializar el componente
  useEffect(() => {
    fetchLeadsFromDB();
  }, []);

  useEffect(() => {
    if (onSellersUpdate) {
      const sellers = Array.from(
        new Set(leads.map(l => (l.vendedor || '').trim()).filter(Boolean))
      );
      onSellersUpdate(sellers);
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

  // Google Sheets Connection States
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

  // Drag Overlay & Optimistic UI Trackers
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

  // New Column Dynamic Builder States
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

  useEffect(() => {
    if (!token || !spreadsheetId) {
      localStorage.setItem('crm_leads_data', JSON.stringify(leads));
    }
  }, [leads, token, spreadsheetId]);

  // Google Sheets Initial Auth
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

  // Fetch from GSheets Handler
  const loadLeads = async (accessToken: string, sid: string) => {
    if (!accessToken || !sid) return;
    setIsLoadingFromSheets(true);
    setSheetsError('');
    try {
      const parsedId = parseSpreadsheetIdInput(sid);
      const result = await fetchLeadsFromSheet();
      setLeads(result.leads);
      setSheetTitle(result.sheetTitle);
      showToast(`Conectado y sincronizado: ${result.leads.length} leads cargados.`, 'success');
    } catch (error: any) {
      console.error(error);
      setSheetsError(error.message || 'Error al conectar.');
      setLeads(INITIAL_LEADS);
    } filter {
      setIsLoadingFromSheets(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setSheetsError('');
      setIsLoadingFromSheets(true);
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        const activeId = getSavedSpreadsheetId();
        if (activeId) {
          await loadLeads(result.accessToken, activeId);
        }
      }
    } catch (error: any) {
      console.error(error);
      setSheetsError(error.message || 'Error de autorización.');
    } finally {
      setIsLoadingFromSheets(false);
    }
  };

  const handleGoogleLogout = async () => {
    if (confirm('¿Desconectar Google Sheets y volver al modo local?')) {
      await logout();
      setUser(null);
      setToken(null);
      setSheetTitle('');
      setLeads(INITIAL_LEADS);
    }
  };

  const handleConnectSpreadsheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spreadsheetInput.trim()) {
      setSheetsError('Por favor ingresa un ID válido.');
      return;
    }
    setSheetsError('');
    const parsedId = parseSpreadsheetIdInput(spreadsheetInput);
    saveSpreadsheetId(parsedId);
    setSpreadsheetId(parsedId);

    if (token) {
      await loadLeads(token, parsedId);
    } else {
      setSheetsError('Primero inicia sesión de Google.');
    }
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    saveWebhookUrl(webhookUrl);
    setIsSettingsOpen(false);
    
    const newLog: WebhookLog = {
      id: Math.random().toString(),
      timestamp: new Date().toISOString(),
      leadId: 'SYSTEM',
      leadNombre: 'Webhook Config',
      newStatus: 'STATUS',
      url: webhookUrl,
      status: 'SUCCESS',
      responseMessage: `Webhook de n8n registrado: ${webhookUrl}`
    };
    setWebhookLogs(prev => [newLog, ...prev]);
  };

  // Drag & Drop Handler
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

  // Perform status updates hacia tu Servidor Express Real con tipado flexible
  const handleStatusChange = async (leadId: string, newStatus: string, closureData?: any) => {
    const leadIdx = leads.findIndex((l: any) => l.id === leadId);
    if (leadIdx === -1) return;

    const originalLead = leads[leadIdx];
    const prevStatus = originalLead.estatus;
    if (prevStatus === newStatus && !closureData) return;

    // 1. Construimos el objeto unificado uniendo los datos previos con el cierre
    const updatedLead: any = {
      ...originalLead,
      estatus: newStatus,
      hasPassedContactado: originalLead.hasPassedContactado || newStatus === 'CONTACTADO' || newStatus !== 'NUEVO',
      ...(closureData || {})
    };

    // 2. Actualización optimista de la interfaz
    setLeads((prev: any[]) => prev.map((l: any) => l.id === leadId ? updatedLead : l));
    setUpdatingLeadIds((prev: string[]) => [...prev, leadId]);

    if (newStatus === 'CERRADO_VENTA' || newStatus.toLowerCase().includes('cerrado')) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }

    // 3. Disparamos la petición HTTP PUT real a tu backend en Express
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLead)
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      showToast(`¡Excelente! "${originalLead.nombre}" actualizado con éxito en MySQL.`, 'success');

      // 4. Integración con n8n de fondo
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
      console.error('Error al actualizar el lead en backend:', error);
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

  // Lead Closure Form Handlers
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
      setClosureError('Por favor introduce un monto de venta válido y mayor a 0 para el cierre.');
      return;
    }

    if (!fechaCierre) {
      setClosureError('Debes especificar la fecha del cierre.');
      return;
    }

    setClosureError('');
    setIsClosureModalOpen(false);

    // Mandamos los datos de cierre estructurados directo a la ruta unificada de leads
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

  // Standard Lead Creation / Edition Handler
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
      setFormError('Campos requeridos vacíos. Rellene Nombre, Empresa y Teléfono.');
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

  // Get active lists of sellers
  const uniqueSellers: string[] = Array.from(
    new Set(leads.map(l => (l.vendedor || '').trim()).filter(Boolean))
  );

  // Filter based on selected user & role
  const roleFilteredLeads = leads.filter(lead => {
    if (userRole === 'ADMIN') {
      if (adminVendedorFilter === 'todos') return true;
      return (lead.vendedor || '').trim().toLowerCase() === adminVendedorFilter.toLowerCase();
    }
    return (lead.vendedor || '').trim().toLowerCase() === selectedVendedor.trim().toLowerCase();
  });

  // Apply search filtering on top of role scope
  const filteredLeads = roleFilteredLeads.filter(lead => {
    const query = searchQuery.toLowerCase();
    return (
      (lead.nombre || '').toLowerCase().includes(query) ||
      (lead.empresa || '').toLowerCase().includes(query) ||
      (lead.ubicacionEstado || '').toLowerCase().includes(query) ||
      (lead.vendedor || '').toLowerCase().includes(query)
    );
  });

  // Calculate distinct lists
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

  const averageResponseTimeHours = 2; // Default mock stats value for display metrics

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
      {(activeTab === 'board' || activeTab === 'closed') && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-zinc-900 mt-1">SUPRI LEADS</h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Tablero dinámico de prospección comercial mayorista. Cambia de estatus, arrastra candidatos y cierra oportunidades.
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
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {userRole === 'ADMIN' && (activeTab === 'board' || activeTab === 'closed') && (
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase whitespace-nowrap hidden sm:inline">Vendedor:</span>
                  <select
                    value={adminVendedorFilter}
                    onChange={(e) => setAdminVendedorFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 h-[34px]"
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
                  <button onClick={() => setBoardLayout('columns')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${boardLayout === 'columns' ? 'bg-white text-zinc-900 border shadow-xs' : 'text-zinc-500'}`}>
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Columnas</span>
                  </button>
                  <button onClick={() => setBoardLayout('table')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${boardLayout === 'table' ? 'bg-white text-zinc-900 border shadow-xs' : 'text-zinc-500'}`}>
                    <Table className="w-3.5 h-3.5" />
                    <span>Tabla</span>
                  </button>
                </div>
              )}

              {activeTab === 'board' && (
                <button onClick={handleOpenAddForm} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors">
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
                <span className="text-[11px] font-bold text-zinc-400 uppercase block">Oportunidades Activas</span>
                <span className="text-xl font-black text-zinc-850 block mt-1">{activeLeadsCount}</span>
              </div>
              <span className="p-2.5 bg-blue-50 text-blue-650 rounded-lg"><Users2 className="w-5 h-5" /></span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase block">Pipeline Estimado</span>
                <span className="text-xl font-bold text-zinc-800 mt-1 block">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(activePipelineValue)}
                </span>
              </div>
              <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp className="w-5 h-5" /></span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase block">% de Efectividad</span>
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
                      <th className="py-3 px-4">Prospecto / Empresa</th>
                      <th className="py-3 px-4">Contacto</th>
                      <th className="py-3 px-4">Origen</th>
                      <th className="py-3 px-4">Vendedor</th>
                      <th className="py-3 px-4">Estatus</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
                    {activeLeads.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-zinc-400 italic">No hay registros activos.</td>
                      </tr>
                    ) : (
                      activeLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-zinc-50/75">
                          <td className="py-3.5 px-4 font-bold text-zinc-900">{lead.nombre} <span className="text-[10px] font-normal text-zinc-400">({lead.empresa})</span></td>
                          <td className="py-3.5 px-4 text-zinc-600">{lead.telefono}</td>
                          <td className="py-3.5 px-4 text-zinc-500">{lead.canalOrigen || 'Directo'}</td>
                          <td className="py-3.5 px-4 font-semibold">{lead.vendedor}</td>
                          <td className="py-3.5 px-4">
                            <select value={lead.estatus} onChange={(e) => handleStatusChange(lead.id, e.target.value)} className="border rounded-xl p-1 bg-white text-xs">
                              {columns.map(col => <option key={col.id} value={col.id}>{col.title}</option>)}
                            </select>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => handleOpenEditForm(lead)} className="p-1 px-2.5 bg-zinc-100 rounded-lg text-[10px] font-bold flex items-center gap-1"><FileText className="w-3 h-3" />Editar</button>
                              <button onClick={() => handleOpenClosureModal(lead)} className="p-1 px-2.5 bg-emerald-50 text-emerald-800 rounded-lg text-[10px] font-bold flex items-center gap-1"><Check className="w-3 h-3" />Cerrar</button>
                              <button onClick={() => handleDeleteLead(lead.id)} className="p-1 text-zinc-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {columns.map((column) => {
                  const columnLeads = column.id === 'CERRADO' ? recentClosedLeads : activeLeads.filter((l) => l.estatus === column.id);
                  return (
                    <div key={column.id} className="relative group/col">
                      {userRole === 'ADMIN' && column.id !== 'NUEVO' && column.id !== 'CONTACTADO' && column.id !== 'CERRADO' && (
                        <button onClick={() => handleRemoveColumn(column.id)} className="absolute top-3.5 right-4 z-20 text-zinc-400 hover:text-red-600 opacity-0 group-hover/col:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
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

      {activeTab === 'closed' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 space-y-4 shadow-xs">
          <h2 className="text-lg font-bold text-zinc-950 flex items-center gap-2"><Archive className="w-5 h-5 text-zinc-500" /> Historial de Leads Cerrados</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-500 uppercase font-bold text-[10px] bg-zinc-50">
                  <th className="p-3">Nombre Contacto</th>
                  <th className="p-3">Empresa</th>
                  <th className="p-3">Vendedor</th>
                  <th className="p-3">Motivo de Cierre</th>
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
                      <tr key={lead.id} className="hover:bg-zinc-50/50">
                        <td className="p-3 font-semibold text-zinc-900">{lead.nombre}</td>
                        <td className="p-3 text-zinc-650">{lead.empresa}</td>
                        <td className="p-3 text-zinc-500">{lead.vendedor}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${closingReason === 'VENTA' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                            {closingReason === 'VENTA' ? 'VENTA EXITOSA' : 'ABANDONADO'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold">${(lead.valorEstimado || 0).toLocaleString()}</td>
                        <td className="p-3 text-zinc-500">{lead.numFactura || '—'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={6} className="p-8 text-center text-zinc-400">No hay registros archivados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
            <h2 className="text-lg font-bold text-zinc-950 flex items-center gap-2"><BarChart4 className="w-5 h-5 text-blue-600" /> Estadísticas de Rendimiento</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col items-center">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest self-start pb-4">Tasa de Conversión</h3>
              <div className="text-4xl font-black text-emerald-600">{conversionPercentage}%</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pb-4">Volumen Total Recaudado</h3>
              <div className="text-3xl font-bold text-zinc-800">${totalClosedSalesValue.toLocaleString()} USD</div>
            </div>
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
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl">Aplicar Cierre</button>
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
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Estado</label>
                    <input type="text" value={formLead.ubicacionEstado || ''} onChange={(e) => setFormLead({ ...formLead, ubicacionEstado: e.target.value })} className="w-full px-3 py-2 text-xs border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Monto Estimado</label>
                    <input type="number" value={formLead.valorEstimado || ''} onChange={(e) => setFormLead({ ...formLead, valorEstimado: Number(e.target.value) })} className="w-full px-3 py-2 text-xs border rounded-xl" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Vendedor</label>
                  <input type="text" value={formLead.vendedor || ''} onChange={(e) => setFormLead({ ...formLead, vendedor: e.target.value })} disabled={userRole === 'VENDEDOR'} className="w-full px-3 py-2 text-xs border rounded-xl bg-zinc-100" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Fase Inicial</label>
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
