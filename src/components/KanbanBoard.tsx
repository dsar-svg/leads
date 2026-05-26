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
import { KanbanColumn } from './KanbanColumn';
import { LeadCard } from './LeadCard';
import { INITIAL_LEADS } from '../mockData';
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
  const [leads, setLeads] = useState<Lead[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_leads_data');
      return saved ? JSON.parse(saved) : INITIAL_LEADS;
    }
    return INITIAL_LEADS;
  });

  useEffect(() => {
    if (onSellersUpdate) {
      const sellers = Array.from(
        new Set(leads.map(l => (l.vendedor || '').trim()).filter(Boolean))
      );
      onSellersUpdate(sellers);
    }
  }, [leads, onSellersUpdate]);

  // Custom Columns State (Defaulting to 'NUEVO', 'CONTACTADO' and 'CERRADO')
  const [columns, setColumns] = useState<Column[]>(() => {
    const defaultCols: Column[] = [
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
      },
      {
        id: 'CERRADO',
        title: 'CERRADO',
        color: 'bg-zinc-650',
        bgClass: 'bg-[#fafafa]',
        borderClass: 'border-zinc-200',
        accentClass: 'bg-zinc-100',
        textClass: 'text-zinc-700'
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
  const [closedReasonFilter, setClosedReasonFilter] = useState<'todos' | 'VENTA' | 'ABANDONADO'>('todos');
  const [webhookUrl, setWebhookUrl] = useState(getWebhookUrl());
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Drag Overlay & Optimistic UI Trackers
  const [updatingLeadIds, setUpdatingLeadIds] = useState<string[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
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
  const [formLead, setFormLead] = useState<Partial<Lead> | null>(null);
  const [formError, setFormError] = useState('');

  // New Column Dynamic Builder States
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

  // Lead Closure Form Modal States
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [isSecondPurchaseFlow, setIsSecondPurchaseFlow] = useState(false);
  const [closingLead, setClosingLead] = useState<Lead | null>(null);
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
      const result = await fetchLeadsFromSheet(accessToken, parsedId);
      setLeads(result.leads);
      setSheetTitle(result.sheetTitle);
      showToast(`Conectado y sincronizado: ${result.leads.length} leads cargados desde la hoja "${result.sheetTitle}".`, 'success');

      const newLog: WebhookLog = {
        id: Math.random().toString(),
        timestamp: new Date().toISOString(),
        leadId: 'SYSTEM',
        leadNombre: 'Google Sheets',
        newStatus: 'SYNC',
        url: `Spreadsheet ID: ${parsedId}`,
        status: 'SUCCESS',
        responseMessage: `Sincronizados ${result.leads.length} leads desde "${result.sheetTitle}" de Google Drive.`
      };
      setWebhookLogs(prev => [newLog, ...prev]);
    } catch (error: any) {
      console.error(error);
      setSheetsError(error.message || 'Error al conectar con Google Sheets. Verifica permisos o el ID.');
      console.log('Loading INITIAL_LEADS');
      setLeads(INITIAL_LEADS);
    } finally {
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
      setSheetsError(error.message || 'Error al autorizar Google Workspace.');
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
      setSheetsError('Por favor ingresa un ID o URL válida.');
      return;
    }
    setSheetsError('');
    const parsedId = parseSpreadsheetIdInput(spreadsheetInput);
    saveSpreadsheetId(parsedId);
    setSpreadsheetId(parsedId);

    if (token) {
      await loadLeads(token, parsedId);
    } else {
      setSheetsError('Primero inicia sesión de Google para autorizar.');
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
          alert('🔒 Acción bloqueada: Los vendedores solo pueden cerrar un lead una vez que haya pasado por la fase de "CONTACTADO" o posterior (por favor, arrastre el lead a la columna correspondiente e inténtelo de nuevo).');
          return;
        }
        handleOpenClosureModal(lead);
      } else {
        // Execute standard state transfer
        await handleStatusChange(leadId, targetStatus);
      }
    }
  };

  // Perform status updates
  const handleStatusChange = async (leadId: string, newStatus: string) => {
    const leadIdx = leads.findIndex(l => l.id === leadId);
    if (leadIdx === -1) return;

    const originalLead = leads[leadIdx];
    const prevStatus = originalLead.estatus;
    if (prevStatus === newStatus) return;

    const updatedLead: Lead = {
      ...originalLead,
      estatus: newStatus,
      hasPassedContactado: originalLead.hasPassedContactado || newStatus === 'CONTACTADO' || newStatus !== 'NUEVO'
    };

    setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
    setUpdatingLeadIds(prev => [...prev, leadId]);

    if (newStatus.toLowerCase().includes('cerrado')) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }

    const webhookPromise = sendWebhookStatusChange(updatedLead, prevStatus);

    let sheetsSuccess = true;
    let sheetsErrorMsg = '';

    if (token && spreadsheetId) {
      try {
        const parsedId = parseSpreadsheetIdInput(spreadsheetId);
        await updateLeadInSheet(token, parsedId, sheetTitle || 'Sheet1', updatedLead);
        showToast(`Sincronizado: "${originalLead.nombre}" pasó de "${prevStatus}" a "${newStatus}" en Google Sheets.`, 'success');
      } catch (error: any) {
        console.error(error);
        sheetsSuccess = false;
        sheetsErrorMsg = error.message || 'Error al actualizar celda en Sheets.';
        showToast(`Error al sincronizar con Google Sheets: ${sheetsErrorMsg}`, 'error');
      }
    } else {
      showToast(`Fase de "${originalLead.nombre}" cambiada a "${newStatus}" (Guardado en Memoria).`, 'info');
    }

    const val = await webhookPromise;
    setUpdatingLeadIds(prev => prev.filter(id => id !== leadId));

    const newLog: WebhookLog = {
      id: Math.random().toString(),
      timestamp: new Date().toISOString(),
      leadId,
      leadNombre: originalLead.nombre,
      prevStatus,
      newStatus,
      url: token && spreadsheetId ? 'Google Sheets & n8n' : 'n8n Webhook',
      status: (val.success && sheetsSuccess) ? 'SUCCESS' : 'ERROR',
      responseMessage: `n8n: ${val.message}` + (token && spreadsheetId ? ` | Sheets: ${sheetsSuccess ? 'OK' : sheetsErrorMsg}` : '')
    };
    setWebhookLogs(prev => [newLog, ...prev]);
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

    const newLog: WebhookLog = {
      id: Math.random().toString(),
      timestamp: new Date().toISOString(),
      leadId: 'SYSTEM',
      leadNombre: 'Configuración de Columnas',
      newStatus: 'NUEVA_COL',
      url: 'Local client settings',
      status: 'SUCCESS',
      responseMessage: `Añadida nueva fase: "${titleClean}"`
    };
    setWebhookLogs(prev => [newLog, ...prev]);
  };

  // Remove Dynamic Column
  const handleRemoveColumn = async (colId: string) => {
    if (colId === 'NUEVO' || colId === 'CONTACTADO') {
      alert('Las columnas por defecto (NUEVO, CONTACTADO) son requeridas para la operación general y no pueden eliminarse.');
      return;
    }

    const leadsInCol = leads.filter(l => l.estatus === colId);
    if (leadsInCol.length > 0) {
      if (!confirm(`La columna tiene ${leadsInCol.length} lead(s) activo(s). Si continúas se migrarán automáticamente a la columna "NUEVO" para salvaguardar tu información. ¿Deseas proceder?`)) {
        return;
      }

      // Migrate leads to NUEVO
      setIsLoadingFromSheets(true);
      try {
        const updatedLeadsList = [...leads];
        for (const lead of leadsInCol) {
          const updated: Lead = { ...lead, estatus: 'NUEVO' };
          
          if (token && spreadsheetId) {
            const parsedId = parseSpreadsheetIdInput(spreadsheetId);
            await updateLeadInSheet(token, parsedId, sheetTitle || 'Sheet1', updated);
          }

          const targetIdx = updatedLeadsList.findIndex(l => l.id === lead.id);
          if (targetIdx !== -1) {
            updatedLeadsList[targetIdx] = updated;
          }
        }
        setLeads(updatedLeadsList);
      } catch (error: any) {
        alert('Error al migrar prospectos en Google Sheets: ' + error.message);
      } finally {
        setIsLoadingFromSheets(false);
      }
    } else {
      if (!confirm(`¿Estás seguro de eliminar la columna "${colId}" del tablero?`)) {
        return;
      }
    }

    setColumns(prev => prev.filter(c => c.id !== colId));

    const newLog: WebhookLog = {
      id: Math.random().toString(),
      timestamp: new Date().toISOString(),
      leadId: 'SYSTEM',
      leadNombre: 'Configuración de Columnas',
      newStatus: 'COL_REMOVE',
      url: 'Client settings',
      status: 'SUCCESS',
      responseMessage: `Removida la fase "${colId}" del pipeline.`
    };
    setWebhookLogs(prev => [newLog, ...prev]);
  };

  // Lead Closure Form Handlers
  const handleOpenClosureModal = (lead: Lead) => {
    const isCloseAllowed = userRole === 'ADMIN' || lead.hasPassedContactado || (lead.estatus !== 'NUEVO');
    if (!isCloseAllowed) {
      alert('🔒 Acción bloqueada: Los vendedores solo pueden cerrar un lead una vez que haya pasado por la fase de "CONTACTADO" o posterior (por favor, arrastre el lead a la columna correspondiente e inténtelo de nuevo).');
      return;
    }
    setIsSecondPurchaseFlow(false);
    setClosingLead(lead);
    setMotivoCierre(lead.motivoCierre === 'ABANDONADO' ? 'ABANDONADO' : 'VENTA');
    setMontoCerrado(lead.valorEstimado > 0 ? lead.valorEstimado.toString() : '');
    setNroFactura(lead.numFactura || '');
    setFechaCierre(lead.fechaVenta || new Date().toISOString().split('T')[0]);
    setClosureError('');
    setIsClosureModalOpen(true);
  };

  const handleSecondPurchase = (lead: Lead) => {
    setIsSecondPurchaseFlow(true);
    setClosingLead(lead);
    setMotivoCierre('VENTA');
    setMontoCerrado('');
    setNroFactura('');
    setFechaCierre(new Date().toISOString().split('T')[0]);
    setClosureError('');
    setIsClosureModalOpen(true);
  };

  const handleChangeClosureType = (lead: Lead) => {
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

    if (isSale) {
      if (!montoCerrado || finalMonto <= 0) {
        setClosureError('Por favor introduce un monto de venta válido y mayor a 0 para el cierre.');
        return;
      }
    }

    if (!fechaCierre) {
      setClosureError('Debes especificar la fecha del cierre.');
      return;
    }

    setIsLoadingFromSheets(true);
    setClosureError('');

    try {
      if (isSecondPurchaseFlow) {
        // We need to mark original lead as having a second purchase so it gets excluded from CERRADO column
        const updatedOriginalLead: Lead = {
          ...closingLead,
          hasSecondPurchase: true
        };

        if (token && spreadsheetId) {
          const parsedId = parseSpreadsheetIdInput(spreadsheetId);
          // Update the original lead, marking it with hasSecondPurchase: true
          await updateLeadInSheet(token, parsedId, sheetTitle || 'Sheet1', updatedOriginalLead);
        }

        // Create duplicate lead with new ID and closed status
        const duplicateLead: Lead = {
          ...closingLead,
          id: `lead-${Date.now()}`,
          nombre: closingLead.nombre.includes('- 2da Compra') ? closingLead.nombre : `${closingLead.nombre} - 2da Compra`,
          estatus: 'CERRADO_VENTA',
          valorEstimado: finalMonto,
          numFactura: finalInvoice,
          fechaVenta: fechaCierre,
          motivoCierre: 'VENTA',
          fechaIngreso: closingLead.fechaIngreso, // Keep the exact same entry date as original
          hasSecondPurchase: true, // Filters out of `recentClosedLeads` so it is NOT duplicated in the board view!
        };

        if (token && spreadsheetId) {
          const parsedId = parseSpreadsheetIdInput(spreadsheetId);
          const activeSheetTitle = sheetTitle || 'Sheet1';
          const rowNum = await appendLeadToSheet(token, parsedId, activeSheetTitle, duplicateLead);
          duplicateLead.rowNumber = rowNum;
        }

        // Trigger Webhook for n8n status change
        await sendWebhookStatusChange(duplicateLead, 'NUEVO');

        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);

        setLeads(prev => {
          const updated = prev.map(l => l.id === closingLead.id ? updatedOriginalLead : l);
          return [duplicateLead, ...updated];
        });

        const newLog: WebhookLog = {
          id: Math.random().toString(),
          timestamp: new Date().toISOString(),
          leadId: duplicateLead.id,
          leadNombre: duplicateLead.nombre,
          prevStatus: 'NUEVO',
          newStatus: 'CERRADO_VENTA',
          url: token && spreadsheetId ? 'Google Sheets & n8n' : 'n8n Webhook',
          status: 'SUCCESS',
          responseMessage: `Segunda Compra registrada individualmente por $${finalMonto} en fecha ${fechaCierre}.`
        };
        setWebhookLogs(prev => [newLog, ...prev]);

        setIsClosureModalOpen(false);
        setClosingLead(null);
        setIsSecondPurchaseFlow(false);
        return;
      }

      const finalStatus = isSale ? 'CERRADO_VENTA' : 'CERRADO_ABANDONADO';
      
      const updatedLead: Lead = {
        ...closingLead,
        estatus: finalStatus,
        valorEstimado: finalMonto,
        numFactura: finalInvoice,
        fechaVenta: fechaCierre,
        motivoCierre: motivoCierre
      };

      if (token && spreadsheetId) {
        const parsedId = parseSpreadsheetIdInput(spreadsheetId);
        await updateLeadInSheet(token, parsedId, sheetTitle || 'Sheet1', updatedLead);
      }

      // Trigger Webhook for n8n status change
      await sendWebhookStatusChange(updatedLead, closingLead.estatus);

      setLeads(prev => prev.map(l => l.id === closingLead.id ? updatedLead : l));

      if (isSale) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }

      const newLog: WebhookLog = {
        id: Math.random().toString(),
        timestamp: new Date().toISOString(),
        leadId: closingLead.id,
        leadNombre: closingLead.nombre,
        prevStatus: closingLead.estatus,
        newStatus: finalStatus,
        url: token && spreadsheetId ? 'Google Sheets & n8n' : 'n8n Webhook',
        status: 'SUCCESS',
        responseMessage: `Lead concluso con éxito: ${isSale ? 'Venta por $' + finalMonto : 'Abandonado sin respuesta'} en fecha ${fechaCierre}.`
      };
      setWebhookLogs(prev => [newLog, ...prev]);

      setIsClosureModalOpen(false);
      setClosingLead(null);
    } catch (error: any) {
      setClosureError(error.message || 'Error al guardar cierre en Google Sheets.');
    } finally {
      setIsLoadingFromSheets(false);
    }
  };

  // Re-open/Active a closed lead helper
  const handleReactivateLead = async (lead: Lead) => {
    if (confirm(`¿Deseas reactivar el lead de "${lead.nombre}" y devolverlo a la columna "NUEVO" del tablero?`)) {
      setIsLoadingFromSheets(true);
      try {
        const reactivated: Lead = {
          ...lead,
          estatus: 'NUEVO',
          valorEstimado: 0,
          numFactura: '',
          fechaVenta: '',
          motivoCierre: undefined
        };

        if (token && spreadsheetId) {
          const parsedId = parseSpreadsheetIdInput(spreadsheetId);
          await updateLeadInSheet(token, parsedId, sheetTitle || 'Sheet1', reactivated);
        }

        await sendWebhookStatusChange(reactivated, lead.estatus);
        setLeads(prev => prev.map(l => l.id === lead.id ? reactivated : l));

        const newLog: WebhookLog = {
          id: Math.random().toString(),
          timestamp: new Date().toISOString(),
          leadId: lead.id,
          leadNombre: lead.nombre,
          prevStatus: lead.estatus,
          newStatus: 'NUEVO',
          url: 'Reactived Lead',
          status: 'SUCCESS',
          responseMessage: `Prospecto "${lead.nombre}" reactivado en el pipeline general.`
        };
        setWebhookLogs(prev => [newLog, ...prev]);
      } catch (err: any) {
        alert('Error al reactivar el lead: ' + err.message);
      } finally {
        setIsLoadingFromSheets(false);
      }
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

  const handleOpenEditForm = (lead: Lead) => {
    setFormLead(lead);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLead) return;

    if (!formLead.nombre?.trim() || !formLead.empresa?.trim() || !formLead.telefono?.trim()) {
      setFormError('Campos requeridos vacíos. Rellene Nombre de Contacto, Empresa y Teléfono móvil.');
      return;
    }

    const isEditing = !!formLead.rowNumber;
    setIsLoadingFromSheets(true);
    setFormError('');

    try {
      if (isEditing) {
        const updatedLead: Lead = {
          ...(formLead as Lead),
          hasPassedContactado: (formLead as Lead).hasPassedContactado || formLead.estatus === 'CONTACTADO' || formLead.estatus !== 'NUEVO'
        };
        
        if (token && spreadsheetId) {
          const parsedId = parseSpreadsheetIdInput(spreadsheetId);
          await updateLeadInSheet(token, parsedId, sheetTitle || 'Sheet1', updatedLead);
        }

        setLeads(prev => prev.map(l => l.id === formLead.id ? updatedLead : l));
        
        const newLog: WebhookLog = {
          id: Math.random().toString(),
          timestamp: new Date().toISOString(),
          leadId: formLead.id!,
          leadNombre: formLead.nombre!,
          newStatus: formLead.estatus!,
          url: token && spreadsheetId ? 'Google Sheets' : 'Local state',
          status: 'SUCCESS',
          responseMessage: `Actualizados datos del lead: "${formLead.nombre}"`
        };
        setWebhookLogs(prev => [newLog, ...prev]);
      } else {
        const newLead: Lead = {
          id: formLead.id || `lead-${Date.now()}`,
          fechaIngreso: formLead.fechaIngreso || new Date().toISOString().substring(0, 10),
          nombre: formLead.nombre!,
          empresa: formLead.empresa!,
          rif: formLead.rif || '',
          telefono: formLead.telefono!,
          ubicacionEstado: formLead.ubicacionEstado || '',
          ubicacionDetalle: formLead.ubicacionDetalle || '',
          canalOrigen: formLead.canalOrigen || '',
          campana: formLead.campana || '',
          vendedor: formLead.vendedor || 'Carlos Pérez',
          estatus: formLead.estatus || 'NUEVO',
          notas: formLead.notas || '',
          valorEstimado: Number(formLead.valorEstimado) || 0,
          numFactura: formLead.numFactura || '',
          fechaVenta: formLead.fechaVenta || '',
          categoriaInteres: formLead.categoriaInteres || '',
          hasPassedContactado: formLead.estatus === 'CONTACTADO' || formLead.estatus !== 'NUEVO'
        };

        if (token && spreadsheetId) {
          const parsedId = parseSpreadsheetIdInput(spreadsheetId);
          const activeSheetTitle = sheetTitle || 'Sheet1';
          const rowNum = await appendLeadToSheet(token, parsedId, activeSheetTitle, newLead);
          newLead.rowNumber = rowNum;
        }

        setLeads(prev => [newLead, ...prev]);
        
        const newLog: WebhookLog = {
          id: Math.random().toString(),
          timestamp: new Date().toISOString(),
          leadId: newLead.id,
          leadNombre: newLead.nombre,
          newStatus: newLead.estatus,
          url: token && spreadsheetId ? 'Google Sheets' : 'Local creation',
          status: 'SUCCESS',
          responseMessage: `Lead registrado para "${newLead.nombre}" por el vendedor "${newLead.vendedor}".`
        };
        setWebhookLogs(prev => [newLog, ...prev]);
      }

      setIsFormOpen(false);
      setFormLead(null);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Error al escribir registro en Google Drive Sheets.');
    } finally {
      setIsLoadingFromSheets(false);
    }
  };

  const handleDeleteLead = (id: string) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    
    if (confirm(`¿Deseas remover el lead "${lead.nombre}" de la interfaz del tablero?\n(Por seguridad se conservará intacto en la hoja de Google Sheets).`)) {
      setLeads(prev => prev.filter(l => l.id !== id));
      const newLog: WebhookLog = {
        id: Math.random().toString(),
        timestamp: new Date().toISOString(),
        leadId: id,
        leadNombre: lead.nombre,
        newStatus: 'DELETE',
        url: 'Local interface clear',
        status: 'SUCCESS',
        responseMessage: `Quitado lead de "${lead.nombre}" de la memoria visual.`
      };
      setWebhookLogs(prev => [newLog, ...prev]);
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
      lead.nombre.toLowerCase().includes(query) ||
      lead.empresa.toLowerCase().includes(query) ||
      lead.ubicacionEstado.toLowerCase().includes(query) ||
      (lead.vendedor && lead.vendedor.toLowerCase().includes(query)) ||
      (lead.canalOrigen && lead.canalOrigen.toLowerCase().includes(query)) ||
      (lead.rif && lead.rif.toLowerCase().includes(query)) ||
      lead.telefono.includes(query)
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

  // KPI calculations for currently scoped lists
  const totalLeadsCount = filteredLeads.length;
  const activeLeadsCount = activeLeads.length;
  
  // Pipeline value
  const activePipelineValue = activeLeads.reduce((sum, l) => sum + (l.valorEstimado || 0), 0);
  
  // Sales closed total volume
  const totalClosedSalesValue = closedLeads
    .filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO')
    .reduce((sum, l) => sum + (l.valorEstimado || 0), 0);

  // Count resolved
  const closedSalesCount = closedLeads.filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO').length;
  const closedAbandonedCount = closedLeads.filter(l => l.estatus === 'CERRADO_ABANDONADO').length;
  const totalClosedCount = closedLeads.length;

  const conversionPercentage = totalClosedCount > 0 
    ? Math.round((closedSalesCount / totalClosedCount) * 100) 
    : 0;

  // Calculate average closure time globally in days
  const closedLeadsWithBothDates = closedLeads.filter(l => {
    if (!l.fechaIngreso || !l.fechaVenta) return false;
    const d1 = new Date(l.fechaIngreso).getTime();
    const d2 = new Date(l.fechaVenta).getTime();
    return !isNaN(d1) && !isNaN(d2);
  });
  const totalClosureDays = closedLeadsWithBothDates.reduce((sum, l) => {
    const d1 = new Date(l.fechaIngreso).getTime();
    const d2 = new Date(l.fechaVenta || '').getTime();
    const diff = d2 - d1;
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    return sum + (days >= 0 ? days : 0);
  }, 0);
  const averageClosureTimeGlobal = closedLeadsWithBothDates.length > 0
    ? Math.round(totalClosureDays / closedLeadsWithBothDates.length)
    : 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
      

      
      {(activeTab === 'board' || activeTab === 'closed') && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-zinc-900 mt-1">SUPRI LEADS</h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Tablero dinámico de prospección. Cambia de estatus, arrastra candidatos y cierra tus oportunidades.
              </p>
            </div>
          </div>

          {/* Global Toolbar Panel depending on active state */}
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

              {/* Seller filter for Admin only in main board or closed tab */}
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

              {/* Closure reason filter for Admin only in closed tab */}
              {userRole === 'ADMIN' && activeTab === 'closed' && (
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase whitespace-nowrap hidden sm:inline">Motivo:</span>
                  <select
                    value={closedReasonFilter}
                    onChange={(e) => setClosedReasonFilter(e.target.value as any)}
                    className="px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer h-[34px] shadow-xs"
                  >
                    <option value="todos">Todos</option>
                    <option value="VENTA">Venta Exitosa (Won)</option>
                    <option value="ABANDONADO">Abandonado (Lost)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {userRole === 'ADMIN' && activeTab === 'board' && (
                <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200/60 mr-1 shadow-xs">
                  <button
                    onClick={() => setBoardLayout('columns')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      boardLayout === 'columns'
                        ? 'bg-white text-zinc-905 shadow-xs font-extrabold border border-zinc-200/50'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Columnas</span>
                  </button>
                  <button
                    onClick={() => setBoardLayout('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      boardLayout === 'table'
                        ? 'bg-white text-zinc-905 shadow-xs font-extrabold border border-zinc-200/50'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tabla</span>
                  </button>
                </div>
              )}

              {activeTab === 'board' && (
                <button
                  onClick={handleOpenAddForm}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-colors animate-fade-in"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Prospecto</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 1: ACTIVE PIPELINE BOARD VIEW */}
      {activeTab === 'board' && (
        <div className="space-y-6">
          {/* Active Quick KPIs Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Oportunidades Activas</span>
                <span className="text-xl font-black text-zinc-850 mt-1 block">{activeLeadsCount}</span>
              </div>
              <span className="p-2.5 bg-blue-50 text-blue-650 rounded-lg">
                <Users2 className="w-5 h-5" />
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Pipeline Activo Estimado</span>
                <span className="text-xl font-bold text-zinc-800 mt-1 block">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(activePipelineValue)}
                </span>
              </div>
              <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">% de Efectividad de Cierre</span>
                <span className="text-xl font-bold text-zinc-800 mt-1 block">
                  {conversionPercentage}% <span className="text-xs font-normal text-zinc-400">corte</span>
                </span>
              </div>
              <span className="p-2.5 bg-purple-50 text-purple-650 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </span>
            </div>
          </div>

          {/* DRAG AND DROP CONTAINER OR TABLE VIEW */}
          {userRole === 'ADMIN' && boardLayout === 'table' ? (
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Prospecto / Organización</th>
                      <th className="py-3 px-4">Contacto & Ubicación</th>
                      <th className="py-3 px-4">Canal / Campaña</th>
                      <th className="py-3 px-4">Vendedor</th>
                      <th className="py-3 px-4">Fase / Estatus</th>
                      <th className="py-3 px-4">Notas / Observaciones</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
                    {activeLeads.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-400 italic">
                          No se encontraron prospectos activos que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      activeLeads.map((lead) => {
                        return (
                          <tr key={lead.id} className="hover:bg-zinc-50/75 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                <div className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                                  {lead.nombre}
                                  <span className="text-[10px] font-mono text-zinc-400 font-normal">#{lead.id}</span>
                                </div>
                                <div className="text-zinc-500 flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>{lead.empresa || 'Empresa no registrada'}</span>
                                  {lead.rif && <span className="text-[10px] bg-zinc-100 text-zinc-650 px-1 rounded ml-1 font-mono">RIF: {lead.rif}</span>}
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 font-semibold text-zinc-800">
                                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>{lead.telefono || 'Sin número'}</span>
                                </div>
                                <div className="flex items-center gap-1 text-zinc-500 text-[10px]">
                                  <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                  <span className="truncate max-w-[150px]">{lead.ubicacionEstado} {lead.ubicacionDetalle ? `(${lead.ubicacionDetalle})` : ''}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                <span className="font-medium text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded-md text-[10px]">{lead.canalOrigen || 'Orgánico'}</span>
                                {lead.campana && (
                                  <div className="text-[9px] text-blue-600 bg-blue-50/80 px-1.5 py-0.5 rounded-md inline-block font-semibold ml-1.5">
                                    📢 {lead.campana}
                                  </div>
                                )}
                                <div className="text-[9px] text-zinc-400 mt-1">Ingreso: {new Date(lead.fechaIngreso).toLocaleDateString()}</div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-[9px] uppercase border border-blue-100">
                                  {(lead.vendedor || 'S').slice(0, 2)}
                                </div>
                                <span className="font-semibold text-zinc-850">{lead.vendedor || 'Sin asignar'}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="space-y-1">
                                <select
                                  value={lead.estatus}
                                  disabled={updatingLeadIds.includes(lead.id)}
                                  onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                  className="px-2.5 py-1 text-xs font-bold border border-zinc-200 rounded-xl bg-white text-zinc-850 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-xs min-w-[120px] transition-all"
                                >
                                  {columns.map(col => (
                                    <option key={col.id} value={col.id}>{col.title}</option>
                                  ))}
                                </select>
                                {updatingLeadIds.includes(lead.id) && (
                                  <span className="text-[9px] font-semibold text-blue-600 animate-pulse block">Sincronizando...</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 max-w-[200px]">
                              <p className="text-[11px] text-zinc-500 truncate" title={lead.notes || lead.notas}>
                                {lead.notas || <span className="text-zinc-300 italic">Sin observaciones</span>}
                              </p>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5-wrap">
                                <button
                                  onClick={() => handleOpenEditForm(lead)}
                                  className="p-1 px-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300 rounded-lg text-zinc-700 font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3 text-zinc-500" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  onClick={() => handleOpenClosureModal(lead)}
                                  className="p-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 rounded-lg text-emerald-800 font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Cerrar</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteLead(lead.id)}
                                  className="p-1 px-1.5 bg-zinc-50 hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 text-zinc-500 hover:text-red-650 rounded-lg transition-colors cursor-pointer"
                                  title="Quitar lead"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {columns.map((column) => {
                  const columnLeads = column.id === 'CERRADO'
                    ? recentClosedLeads
                    : activeLeads.filter((lead) => lead.estatus === column.id);

                  return (
                    <div key={column.id} className="relative group/col">
                      {/* Admin delete column control */}
                      {userRole === 'ADMIN' && column.id !== 'NUEVO' && column.id !== 'CONTACTADO' && column.id !== 'CERRADO' && (
                        <button
                          onClick={() => handleRemoveColumn(column.id)}
                          className="absolute top-3.5 right-4 z-20 text-zinc-400 hover:text-red-600 cursor-pointer p-1 rounded-md hover:bg-zinc-100 opacity-0 group-hover/col:opacity-100 transition-opacity"
                          title={`Eliminar fase "${column.title}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                      />
                    </div>
                  );
                })}

                {/* Quick column insertion placeholder helper for ADMIN */}
                {userRole === 'ADMIN' && (
                  <div 
                    onClick={() => setIsAddingCol(true)}
                    className="border-2 border-dashed border-zinc-300 hover:border-blue-400 p-8 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50/20 transition-all h-[150px]"
                  >
                    <PlusCircle className="w-8 h-8 text-zinc-400 hover:text-blue-500 mb-2" />
                    <span className="text-xs font-bold text-zinc-650 block">+ Añadir Nueva Fase</span>
                    <span className="text-[10px] text-zinc-400">Personaliza tu pipeline comercial</span>
                  </div>
                )}
              </div>

              <DragOverlay>
                {activeLead ? (
                  <div className="rotate-[3deg]">
                    <LeadCard
                      lead={activeLead}
                      isUpdating={false}
                      onEdit={() => {}}
                      onDelete={() => {}}
                    />
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
              <h2 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
                <Archive className="w-5 h-5 text-zinc-500" />
                Historial de Leads Cerrados
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Archivos con motivo de salida. Filtra cierres exitosos (Ventas) y abandonos.
              </p>
            </div>

            {/* Micro Statistics */}
            <div className="flex items-center gap-4 text-xs font-bold font-mono">
              <span className="text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1.5">
                Won/Ventas: {closedSalesCount} (${totalClosedSalesValue.toLocaleString()})
              </span>
              <span className="text-zinc-650 bg-zinc-150 px-3 py-1.5 rounded-xl border flex items-center gap-1.5">
                Perdidos: {closedAbandonedCount}
              </span>
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
                  <th className="p-3">Fecha Ingreso</th>
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
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${
                            closingReason === 'VENTA' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-zinc-100 text-zinc-550 border border-zinc-200'
                          }`}>
                            {closingReason === 'VENTA' ? 'VENTA EXITOSA' : 'ABANDONADO'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-zinc-500">
                          {lead.fechaIngreso ? new Date(lead.fechaIngreso).toLocaleDateString() : 'S/F'}
                        </td>
                        <td className="p-3 font-mono text-zinc-500">{lead.fechaVenta || 'S/F'}</td>
                        <td className="p-3 text-right font-bold text-zinc-800">
                          {isWon ? `$${(lead.valorEstimado || 0).toLocaleString()}` : '$0'}
                        </td>
                        <td className="p-3 font-mono text-zinc-500">{lead.numFactura || '—'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-450 font-medium">
                      No hay registros archivados que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TAB 3: ESTADISTICAS Y KPIS GENERALS */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
            <h2 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
              <BarChart4 className="w-5 h-5 text-blue-600" />
              Estadísticas de Rendimiento y Conversión
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Métricas consolidadas de {userRole === 'ADMIN' ? 'todos los vendedores' : `sesión de "${selectedVendedor}"`}.
            </p>
          </div>

          {/* Stats Quick KPIs Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Cierres con Venta (Won)</span>
                <span className="text-xl font-black text-emerald-700 mt-1 block">{closedSalesCount} leads</span>
              </div>
              <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block font-sans">Recaudado USD (Ventas)</span>
                <span className="text-xl font-bold text-zinc-850 mt-1 block">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalClosedSalesValue)}
                </span>
              </div>
              <span className="p-2.5 bg-blue-50 text-blue-650 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Promedio Tiempo de Cierre</span>
                <span className="text-xl font-bold text-zinc-850 mt-1 block">
                  {averageClosureTimeGlobal} <span className="text-xs font-normal text-zinc-500">días</span>
                </span>
              </div>
              <span className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                <Calendar className="w-5 h-5" />
              </span>
            </div>
          </div>

          {/* Graphical charts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Conversion Donut Representation */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col items-center justify-center">
              <h3 className="text-xs font-bold text-zinc-650 uppercase tracking-widest pb-4 self-start">Tasa de Efectividad</h3>
              
              <div className="relative w-40 h-40 flex items-center justify-center">
                {/* SVG Radial percentage indicator */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="65"
                    className="stroke-zinc-100"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="65"
                    className="stroke-emerald-500 transition-all duration-1000"
                    strokeWidth="12"
                    strokeDasharray={408.4}
                    strokeDashoffset={408.4 - (408.4 * conversionPercentage) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-zinc-900">{conversionPercentage}%</span>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">Cerrados Exitosos</span>
                </div>
              </div>

              <div className="flex gap-4 mt-4 text-[10px] font-bold text-zinc-500 w-full justify-around border-t pt-3">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
                  <span>Cierres Venta: {closedSalesCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 block" />
                  <span>Sin respuesta: {closedAbandonedCount}</span>
                </div>
              </div>
            </div>

            {/* Closed Volume Bar chart summary */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs lg:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-650 uppercase tracking-widest pb-2">Distribución de Leads por Etapa</h3>
                <p className="text-[11px] text-zinc-400 pb-4">Densidad de volumen del pipeline activo.</p>
              </div>

              {/* Bar List */}
              <div className="space-y-3 flex-1 flex flex-col justify-center">
                {columns.map((column) => {
                  const amtInCol = activeLeads.filter(l => l.estatus === column.id).length;
                  const ratio = activeLeadsCount > 0 ? (amtInCol / activeLeadsCount) * 100 : 0;
                  const totalEstVal = activeLeads.filter(l => l.estatus === column.id).reduce((s, l) => s + (l.valorEstimado || 0), 0);

                  return (
                    <div key={column.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-zinc-800 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${column.color}`} />
                          {column.title}
                        </span>
                        <span className="text-zinc-500 font-mono">
                          {amtInCol} leads
                        </span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${column.color}`}
                          style={{ width: `${Math.max(ratio, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Vendedor Performance leaderboard (Admin only) */}
          {userRole === 'ADMIN' && (
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-650 uppercase tracking-widest">Rendimiento por Vendedores</h3>
                <p className="text-[11px] text-zinc-400">Comparativa oficial de cartera y tasa de efectividad.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 text-zinc-400 font-bold bg-zinc-50">
                      <th className="p-3">Vendedor</th>
                      <th className="p-3">Total Asignados</th>
                      <th className="p-3">Activos</th>
                      <th className="p-3">Cierres con Venta</th>
                      <th className="p-3">Cierres Abandonado</th>
                      <th className="p-3 text-right">Recaudado USD</th>
                      <th className="p-3 text-center">Tasa Conversión</th>
                      <th className="p-3 text-center">Tiempo Cierre Promedio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {(() => {
                      const sellersWithData = uniqueSellers.map(vName => {
                        const vLeads = leads.filter(l => (l.vendedor || '').trim().toLowerCase() === vName.toLowerCase());
                        const vActive = vLeads.filter(l => l.estatus !== 'CERRADO_VENTA' && l.estatus !== 'CERRADO_ABANDONADO' && l.estatus !== 'CERRADO').length;
                        const vWon = vLeads.filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO').length;
                        const vLost = vLeads.filter(l => l.estatus === 'CERRADO_ABANDONADO').length;
                        
                        const totalClosed = vWon + vLost;
                        const vRate = totalClosed > 0 ? Math.round((vWon / totalClosed) * 100) : 0;
                        const vRev = vLeads
                          .filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO')
                          .reduce((sum, l) => sum + (l.valorEstimado || 0), 0);

                        // Calculate average closure time for this seller
                        const vClosedWithDates = vLeads.filter(l => {
                          if (l.estatus !== 'CERRADO_VENTA' && l.estatus !== 'CERRADO' && l.estatus !== 'CERRADO_ABANDONADO') return false;
                          if (!l.fechaIngreso || !l.fechaVenta) return false;
                          const d1 = new Date(l.fechaIngreso).getTime();
                          const d2 = new Date(l.fechaVenta).getTime();
                          return !isNaN(d1) && !isNaN(d2);
                        });
                        const vTotalClosureDays = vClosedWithDates.reduce((sum, l) => {
                          const d1 = new Date(l.fechaIngreso).getTime();
                          const d2 = new Date(l.fechaVenta || '').getTime();
                          const diff = d2 - d1;
                          const days = Math.round(diff / (1000 * 60 * 60 * 24));
                          return sum + (days >= 0 ? days : 0);
                        }, 0);
                        const vAverageClosureTime = vClosedWithDates.length > 0
                          ? Math.round(vTotalClosureDays / vClosedWithDates.length)
                          : 0;

                        return {
                          vName,
                          vLeads,
                          vActive,
                          vWon,
                          vLost,
                          vRate,
                          vRev,
                          vAverageClosureTime
                        };
                      });

                      // Sort descending by revenue (vRev)
                      const sortedSellers = [...sellersWithData].sort((a, b) => b.vRev - a.vRev);

                      return sortedSellers.length > 0 ? (
                        sortedSellers.map(seller => (
                          <tr key={seller.vName} className="hover:bg-zinc-50/45">
                            <td className="p-3 font-bold text-zinc-800 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-zinc-400" />
                              {seller.vName}
                            </td>
                            <td className="p-3 text-zinc-550">{seller.vLeads.length}</td>
                            <td className="p-3 text-zinc-550">{seller.vActive}</td>
                            <td className="p-3 font-semibold text-emerald-700">{seller.vWon}</td>
                            <td className="p-3 text-zinc-450">{seller.vLost}</td>
                            <td className="p-3 text-right font-mono font-bold text-zinc-800">${seller.vRev.toLocaleString()}</td>
                            <td className="p-3">
                              <div className="flex items-center justify-center">
                                <span className="px-2 py-0.5 bg-zinc-100 rounded text-zinc-700 font-bold font-mono">
                                  {seller.vRate}%
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-zinc-700">
                              {seller.vAverageClosureTime > 0 ? `${seller.vAverageClosureTime} días` : '—'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-zinc-400">Ningún vendedor asignado con datos.</td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7.5 TAB 4: CONFIGURACIONES (ONLY FOR ADMINS) */}
      {activeTab === 'settings' && userRole === 'ADMIN' && (
        <div className="space-y-6 animate-fade-in">
          {/* Settings Section Title Banner */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="p-3 bg-zinc-900 text-white rounded-xl">
                <Settings2 className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Panel de Control & Ajustes del Administrador</h2>
                <p className="text-xs text-zinc-500">
                  Configura la conexión segura con Google Sheets, personaliza las fases comerciales del embudo y gestiona automatizaciones de Webhook.
                </p>
              </div>
            </div>
          </div>

          {/* 1. Google Sheets Connection Panel */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Database className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-zinc-800">Origen de los Datos: Google Sheets</h3>
                  <p className="text-[11px] text-zinc-500">
                    {token && spreadsheetId 
                      ? `Sincronizado con tab de hoja: "${sheetTitle || 'Cargando pestaña...'}"` 
                      : 'Modo demo offline. Activa Google Workspace para persistencia mutua real.'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    localStorage.setItem('crm_leads_data', JSON.stringify(INITIAL_LEADS));
                    setLeads(INITIAL_LEADS);
                  }}
                  className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 px-3.5 py-1.5 text-xs font-semibold rounded-xl cursor-pointer transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Cargar Datos Demo
                </button>
                {token ? (
                  <div className="flex items-center gap-2 bg-emerald-50/50 border border-emerald-200/50 rounded-xl px-3 py-1.5 text-xs text-emerald-850">
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold truncate max-w-[150px]">{user?.email}</span>
                    <span className="text-zinc-300">|</span>
                    <button 
                      onClick={handleGoogleLogout} 
                      className="text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer"
                    >
                      Desconectar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGoogleLogin}
                    className="inline-flex items-center gap-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 px-3.5 py-1.5 text-xs font-semibold rounded-xl cursor-pointer shadow-sm transition-all"
                  >
                    {/* SVG Google icon */}
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span>Conectar Google Drive / Sheets</span>
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleConnectSpreadsheet} className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">ID del Archivo o URL de Google Sheets</label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Pega la URL de tu hoja ej: 1A_xG6L86X-7P6H..."
                    value={spreadsheetInput}
                    onChange={(e) => setSpreadsheetInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-xl text-xs bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={isLoadingFromSheets || !token}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl text-white transition-colors flex items-center gap-1.5 shadow-sm ${token ? 'bg-zinc-900 hover:bg-zinc-800 cursor-pointer' : 'bg-zinc-300 cursor-not-allowed text-zinc-500'}`}
                >
                  {isLoadingFromSheets && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Vincular Tabla</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (token && spreadsheetId) {
                      loadLeads(token, spreadsheetId);
                    } else {
                      alert('Inicia sesión con Google para sincronizar.');
                    }
                  }}
                  disabled={isLoadingFromSheets || !token || !spreadsheetId}
                  className="p-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-zinc-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed h-[34px]"
                  title="Sincronizar ahora"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingFromSheets ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </form>

            {sheetsError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span>{sheetsError}</span>
              </div>
            )}
          </div>

          {/* 2. Pipeline Stage Editor (Add/Remove Phases) */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-zinc-800 flex items-center gap-2 border-b border-zinc-100 pb-2">
              <Layers className="w-4.5 h-4.5 text-blue-600" />
              Gestión de Fases y Columnas del Embudo (Pipeline)
            </h3>
            <p className="text-xs text-zinc-500">
              Personaliza el flujo comercial de tus vendedores. Añade nuevas fases o elimina las existentes. Las fases por defecto (<strong>NUEVO</strong> y <strong>CONTACTADO</strong>) son requeridas de forma obligatoria y no pueden removerse.
            </p>

            {/* Stage Editor List & Add form side-by-side or stacked */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Register New Phase */}
              <div className="space-y-3 bg-zinc-50/50 p-4 rounded-xl border border-zinc-200/60 max-h-[280px]">
                <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1">
                  <PlusCircle className="w-4 h-4 text-blue-500" />
                  Agregar Nueva Fase
                </h4>
                <form onSubmit={handleAddColumn} className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Nombre de la Fase (Ej: PROPUESTA, DEMO)</label>
                    <input
                      type="text"
                      placeholder="Escriba fase (Ej: PROPUESTA)"
                      value={newColTitle}
                      onChange={(e) => setNewColTitle(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white text-xs uppercase focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-zinc-800"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-colors shadow-sm"
                  >
                    Crear y Registrar Fase
                  </button>
                </form>
              </div>

              {/* Right Column: List of Phases */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1 pb-1">
                  🌐 Fases Activas Registradas ({columns.length})
                </h4>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {columns.map((column, index) => {
                      const count = leads.filter(l => l.estatus === column.id).length;
                      const isProtected = column.id === 'NUEVO' || column.id === 'CONTACTADO';
                      return (
                        <div key={column.id} className="flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${isProtected ? 'bg-zinc-400' : 'bg-blue-500 animate-pulse'}`} />
                            <div className="text-xs">
                              <span className="font-bold text-zinc-850">{column.title}</span>
                              <span className="text-[10px] text-zinc-400 ml-1.5 uppercase font-mono bg-zinc-100 px-1 py-0.5 rounded">ID: {column.id}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => handleReorderColumn(column.id, 'up')}
                                disabled={index === 0}
                                className="text-zinc-400 hover:text-zinc-600 cursor-pointer disabled:opacity-30"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                              </button>
                              <button
                                onClick={() => handleReorderColumn(column.id, 'down')}
                                disabled={index === columns.length - 1}
                                className="text-zinc-400 hover:text-zinc-600 cursor-pointer disabled:opacity-30"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                              </button>
                            </div>
                            <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100/80 px-2 py-0.5 rounded-full">
                              {count} prospectos
                            </span>
                            {isProtected ? (
                              <span className="text-[9px] text-zinc-400 font-medium bg-zinc-100 border border-zinc-200/50 rounded px-1.5 py-0.5">Fase Base</span>
                            ) : (
                              <button
                                onClick={() => handleRemoveColumn(column.id)}
                                className="text-red-600 hover:text-red-700 p-1 rounded-md hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer flex items-center gap-0.5"
                                title="Eliminar fase"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold">Quitar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>

          {/* 3. n8n automation webhook configurations */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-zinc-800 flex items-center gap-2 border-b border-zinc-100 pb-2">
              <Settings2 className="w-4.5 h-4.5 text-blue-600" />
              Dirección de Enlace Webhook n8n
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Cada cambio de estatus de prospecto o cierre de ventas en este CRM genera una petición HTTP POST segura hacia tu Webhook de n8n para propagar flujos de trabajo en tiempo real.
            </p>
            <form onSubmit={handleSaveWebhook} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://n8n.tu-servidor.com/webhook/crm-leads"
                className="flex-1 px-3 py-2 text-xs border rounded-xl bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors shadow-xs">
                  Guardar Url
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setWebhookUrl(DEFAULT_WEBHOOK_URL);
                    saveWebhookUrl(DEFAULT_WEBHOOK_URL);
                    showToast('Webhook de demostración restaurado.', 'info');
                  }} 
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-700"
                >
                  Restaurar Demo
                </button>
              </div>
            </form>
          </div>

          {/* 4. Logs Console */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="font-bold text-sm text-zinc-855 flex items-center gap-2">
                <Terminal className="w-4.5 h-4.5 text-amber-500" />
                Sincronizaciones & Registro de Eventos ({webhookLogs.length})
              </h3>
              {webhookLogs.length > 0 && (
                <button onClick={() => setWebhookLogs([])} className="text-[10px] text-zinc-400 hover:text-red-600 font-bold uppercase transition-colors cursor-pointer">
                  Limpiar historial
                </button>
              )}
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {webhookLogs.length > 0 ? (
                webhookLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1 font-mono text-[10px] text-zinc-750">
                    <div className="flex justify-between items-start gap-1 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-zinc-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <strong className="text-blue-700 font-sans text-xs">{log.leadNombre}</strong>
                        {log.prevStatus && <span className="text-zinc-400 font-bold">{log.prevStatus} →</span>}
                        <span className="text-zinc-905 font-extrabold bg-amber-50 text-amber-800 rounded px-1.5 py-0.5">{log.newStatus}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-sans ${
                        log.status === 'SUCCESS' ? 'bg-emerald-55 text-emerald-800 border border-emerald-250' : 'bg-red-55 text-red-800 border border-red-250'
                      }`}>
                        {log.status === 'SUCCESS' ? 'SINC_OK' : 'ERROR'}
                      </span>
                    </div>
                    <div className="text-zinc-500 break-all mt-1 text-[9px]">Origen: {log.url}</div>
                    {log.responseMessage && <div className="text-zinc-650 font-semibold bg-white p-2 rounded-lg mt-1 border border-zinc-200/60 leading-relaxed">Info: {log.responseMessage}</div>}
                  </div>
                ))
              ) : (
                <p className="text-zinc-400 text-center py-8 text-xs italic">La consola está desocupada. Realiza cambios o arrastra prospectos para generar registros de webhook.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 9. LEAD CLOSURE MODAL (Venta / Abandono Form) */}
      {isClosureModalOpen && closingLead && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200 relative animate-scale-up">
            <button 
              type="button" 
              onClick={() => {
                setIsClosureModalOpen(false);
                setClosingLead(null);
              }} 
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 pb-3 border-b mb-4">
              <CheckCircle2 className="w-5 h-5 text-blue-600 animate-bounce" />
              <div>
                <h3 className="font-bold text-sm text-zinc-900">
                  {isSecondPurchaseFlow ? "🛍️ Registrar Segunda Compra" : "Configurar Cierre Comercial"}
                </h3>
                <p className="text-xs text-zinc-400">Lead: {closingLead.nombre}</p>
              </div>
            </div>

            {closureError && (
              <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-1 font-medium">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{closureError}</span>
              </div>
            )}

            <form onSubmit={handleSaveClosure} className="space-y-4">
              {!isSecondPurchaseFlow ? (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Motivo de Cierre *</label>
                  <select
                    value={motivoCierre}
                    onChange={(e) => setMotivoCierre(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-zinc-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="VENTA">🎉 Venta Realizada (Ingreso Confirmado)</option>
                    <option value="ABANDONADO">⚠️ Sin Respuesta / Abandonado (Descarte)</option>
                  </select>
                </div>
              ) : (
                <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-[11px] font-semibold flex items-center gap-1.5">
                  <span>🛍️ Flujo de Segunda Compra: El motivo está predefinido como VENTA. Introduce el nuevo monto de cierre e ID de factura individual.</span>
                </div>
              )}

              {(motivoCierre === 'VENTA' || isSecondPurchaseFlow) && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Monto Cerrado USD *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">$</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="Monto total cobrado"
                        value={montoCerrado}
                        onChange={(e) => setMontoCerrado(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Número de Factura</label>
                    <input
                      type="text"
                      placeholder="Ej. FAC-2026-105"
                      value={nroFactura}
                      onChange={(e) => setNroFactura(e.target.value)}
                      className="w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Fecha de Cierre {userRole === 'VENDEDOR' && <span className="text-[10px] text-zinc-400 font-normal">(Auto-cerrada)</span>}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="date"
                    value={fechaCierre}
                    onChange={(e) => setFechaCierre(e.target.value)}
                    disabled={userRole === 'VENDEDOR'}
                    className={`w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      userRole === 'VENDEDOR' ? 'bg-zinc-100 text-zinc-550 cursor-not-allowed' : 'bg-white'
                    }`}
                  />
                </div>
                {userRole === 'VENDEDOR' && (
                  <p className="text-[10px] text-zinc-400 mt-1 italic">
                    Solo los administradores están habilitados para mutar la fecha de cierre.
                  </p>
                )}
              </div>

              <div className="pt-4 border-t flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsClosureModalOpen(false);
                    setClosingLead(null);
                  }}
                  className="px-4 py-2 border rounded-xl text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl cursor-pointer hover:bg-blue-700 flex items-center gap-1.5"
                >
                  {isLoadingFromSheets && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>{isSecondPurchaseFlow ? "Registrar Segunda Compra" : "Guardar y Aplicar Cierre"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. NEW / EDIT LEAD GENERAL MODAL */}
      {isFormOpen && formLead && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl relative animate-scale-up my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-650 cursor-pointer"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              {formLead.rowNumber ? `Editar Lead (Fila ${formLead.rowNumber})` : 'Añadir Nuevo Lead al Pipeline'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-1.5 font-medium animate-pulse">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveLead} className="space-y-4">
              <div className="bg-zinc-50/50 p-3 rounded-xl border border-zinc-100 space-y-3">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b pb-1">Datos Principales</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Nombre Contacto *</label>
                    <input
                      type="text"
                      value={formLead.nombre || ''}
                      onChange={(e) => setFormLead({ ...formLead, nombre: e.target.value })}
                      placeholder="Ej. Juan Pérez"
                      className="w-full px-3 py-2 text-xs border rounded-xl focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Empresa/Tienda *</label>
                    <input
                      type="text"
                      value={formLead.empresa || ''}
                      onChange={(e) => setFormLead({ ...formLead, empresa: e.target.value })}
                      placeholder="Ej. Comercializadora ABC"
                      className="w-full px-3 py-2 text-xs border rounded-xl focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Fecha Ingreso</label>
                    <input
                      type="date"
                      value={(() => {
                        const d = formLead.fechaIngreso || '';
                        if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.substring(0, 10);
                        const parts = d.split('/');
                        if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                        return d;
                      })()}
                      onChange={(e) => setFormLead({ ...formLead, fechaIngreso: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-xl text-[11px] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Telefono *</label>
                    <input
                      type="text"
                      value={formLead.telefono || ''}
                      onChange={(e) => setFormLead({ ...formLead, telefono: e.target.value })}
                      placeholder="+58 412..."
                      className="w-full px-3 py-2 text-xs border rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">RIF / Cedula</label>
                    <input
                      type="text"
                      value={formLead.rif || ''}
                      onChange={(e) => setFormLead({ ...formLead, rif: e.target.value })}
                      placeholder="J-12345678-0"
                      className="w-full px-3 py-2 text-xs border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Categoría Interés</label>
                    <input
                      type="text"
                      value={formLead.categoriaInteres || ''}
                      onChange={(e) => setFormLead({ ...formLead, categoriaInteres: e.target.value })}
                      placeholder="Ej. Software"
                      className="w-full px-3 py-2 text-xs border rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Marketing & Locations */}
              <div className="bg-zinc-50/50 p-3 rounded-xl border border-zinc-100 space-y-3">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b pb-1">Ubicación y Captación</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Ubicación Estado</label>
                    <input
                      type="text"
                      value={formLead.ubicacionEstado || ''}
                      onChange={(e) => setFormLead({ ...formLead, ubicacionEstado: e.target.value })}
                      placeholder="Ej. Miranda, Zulia"
                      className="w-full px-3 py-2 text-xs border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Detalle Dirección</label>
                    <input
                      type="text"
                      value={formLead.ubicacionDetalle || ''}
                      onChange={(e) => setFormLead({ ...formLead, ubicacionDetalle: e.target.value })}
                      className="w-full px-3 py-2 text-xs border rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Canal Origen</label>
                    <input
                      type="text"
                      value={formLead.canalOrigen || ''}
                      onChange={(e) => setFormLead({ ...formLead, canalOrigen: e.target.value })}
                      placeholder="Facebook, Web, Recomendado"
                      className="w-full px-3 py-2 text-xs border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Campaña</label>
                    <input
                      type="text"
                      value={formLead.campana || ''}
                      onChange={(e) => setFormLead({ ...formLead, campana: e.target.value })}
                      className="w-full px-3 py-2 text-xs border rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Sales assignment */}
              <div className="bg-zinc-50/50 p-3 rounded-xl border border-zinc-100 space-y-3">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b pb-1">Información Comercial</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Vendedor Responsable</label>
                    <input
                      type="text"
                      value={formLead.vendedor || ''}
                      onChange={(e) => setFormLead({ ...formLead, vendedor: e.target.value })}
                      disabled={userRole === 'VENDEDOR'}
                      className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none ${userRole === 'VENDEDOR' ? 'bg-zinc-100 text-zinc-500 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Monto Oportunidad Estimado</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                      <input
                        type="number"
                        value={formLead.valorEstimado || ''}
                        onChange={(e) => setFormLead({ ...formLead, valorEstimado: Number(e.target.value) })}
                        placeholder="Valor inicial estimado"
                        className="w-full pl-7 pr-3 py-2 text-xs border rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Fase del Embudo (Estatus)</label>
                  <select
                    value={formLead.estatus || 'NUEVO'}
                    onChange={(e) => setFormLead({ ...formLead, estatus: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-xl bg-white"
                  >
                    {columns.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Observaciones</label>
                  <textarea
                    rows={2}
                    value={formLead.notas || ''}
                    onChange={(e) => setFormLead({ ...formLead, notas: e.target.value })}
                    placeholder="Escribe comentarios, compromisos, fechas clave o anotaciones..."
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setFormLead(null);
                  }}
                  className="px-4 py-2 border rounded-xl text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-zinc-950 hover:bg-zinc-850 text-white font-bold rounded-xl cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. HELP/EXCEL SPEC MODAL */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl relative animate-scale-up">
            <button onClick={() => setIsHelpOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 border-b pb-4 mb-4">
              <Compass className="w-6 h-6 text-emerald-600" />
              <h2 className="text-lg font-bold text-zinc-900">Estructura de Google Sheets</h2>
            </div>

            <div className="space-y-4 text-xs text-zinc-650 leading-relaxed">
              <p>
                La integración bidireccional requiere estas cabeceras exactas en la primera fila de tu archivo Excel/Sheets:
              </p>

              <div className="bg-zinc-50 border p-3.5 rounded-xl">
                <h4 className="font-bold text-zinc-500 mb-2 uppercase text-[9px] tracking-wide">Fila 1 (Cabeceras):</h4>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[10.5px] text-zinc-700">
                  <div>1. ID_Lead</div>
                  <div>2. Fecha Ingreso</div>
                  <div>3. Nombre Contacto</div>
                  <div>4. Empresa/Tienda</div>
                  <div>5. RIF</div>
                  <div>6. Telefono</div>
                  <div>7. Ubicacion Estado</div>
                  <div>8. Ubicacion Detalle</div>
                  <div>9. Canal Origen</div>
                  <div>10. Campana</div>
                  <div>11. Vendedor</div>
                  <div>12. Fase Oportunidad</div>
                  <div>13. Observaciones Vendedor</div>
                  <div>14. Monto Cerrado USD</div>
                  <div>15. Num Factura</div>
                  <div>16. Fecha Venta</div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 text-blue-800 rounded-xl border border-blue-105">
                <h4 className="font-bold">✨ Auto-Inicialización:</h4>
                <p className="mt-0.5">
                  Si conectas una hoja totalmente en blanco en el panel superior, la aplicación creará automáticamente todas las columnas por ti.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t flex justify-end">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="px-4 py-2 bg-zinc-950 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Cerrar Ayuda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification HUD */}
      {toast && (
        <div 
          className={`fixed bottom-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-emerald-100/40' 
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900 shadow-rose-100/40'
              : 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-indigo-100/40'
          }`}
          style={{ minWidth: '320px', maxWidth: '440px' }}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 animate-pulse" />}
          {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 animate-pulse" />}
          {toast.type === 'info' && <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 animate-pulse" />}
          
          <div className="flex-1 text-[11px] font-bold leading-snug">
            <div className="uppercase tracking-wider text-[9px] opacity-75 mb-0.5 font-extrabold text-zinc-500">
              {toast.type === 'success' ? 'Google Sheets Sincronizado' : toast.type === 'error' ? 'Error de Sincronización' : 'Estado CRM Local'}
            </div>
            {toast.message}
          </div>
          
          <button 
            onClick={() => setToast(null)}
            className="p-1 rounded-md hover:bg-black/5 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-white p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-6 border-4 border-yellow-400">
              <Sparkles className="w-24 h-24 text-yellow-500 animate-spin" />
              <div className="text-center">
                <h2 className="text-4xl font-extrabold text-blue-600 font-sans tracking-tight">¡Genial!</h2>
                <p className="text-zinc-500 font-bold mt-2">Lead cerrado exitosamente.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
