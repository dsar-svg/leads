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

  useEffect(() => {
    if (onSellersUpdate) {
      const sellers = Array.from(new Set(leads.map(l => (l.vendedor || '').trim()).filter(Boolean)));
      onSellersUpdate(sellers as string[]);
    }
  }, [leads, onSellersUpdate]);

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

  useEffect(() => {
    if (showCelebration) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  }, [showCelebration]);

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

  // Sincronización real e infalible con Express y MySQL con tipado flexible
  const handleStatusChange = async (leadId: string, newStatus: string, closureData?: any) => {
    const leadIdx = leads.findIndex((l: any) => l.id.toString() === leadId.toString());
    if (leadIdx === -1) return;

    const originalLead = leads[leadIdx];
    const
