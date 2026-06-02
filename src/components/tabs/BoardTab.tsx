import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { CheckCircle2, TrendingUp, Users2, Trash2, LayoutGrid, Table } from 'lucide-react';
import { Column } from '../../types';
import { KanbanColumn } from '../KanbanColumn';
import { LeadCard } from '../LeadCard';

interface BoardTabProps {
  userRole: 'ADMIN' | 'VENDEDOR';
  boardLayout: 'columns' | 'table';
  setBoardLayout: (layout: 'columns' | 'table') => void;
  activeLeads: any[];
  recentClosedLeads: any[];
  columns: Column[];
  activeLeadsCount: number;
  activePipelineValue: number;
  conversionPercentage: number;
  updatingLeadIds: string[];
  activeLead: any;
  sensors: any;
  handleDragStart: (event: any) => void;
  handleDragEnd: (event: any) => void;
  handleStatusChange: (id: string, status: string, data?: any) => void;
  handleOpenEditForm: (lead: any) => void;
  handleDeleteLead: (id: string) => void;
  handleOpenClosureModal: (lead: any) => void;
  handleSecondPurchase: (lead: any) => void;
  handleChangeClosureType: (lead: any) => void;
  handleTransferLead: (lead: any, vendedor: string) => void;
  vendorList: string[];
}

export const BoardTab: React.FC<BoardTabProps> = ({
  userRole,
  boardLayout,
  setBoardLayout,
  activeLeads,
  recentClosedLeads,
  columns,
  activeLeadsCount,
  activePipelineValue,
  conversionPercentage,
  updatingLeadIds,
  activeLead,
  sensors,
  handleDragStart,
  handleDragEnd,
  handleStatusChange,
  handleOpenEditForm,
  handleDeleteLead,
  handleOpenClosureModal,
  handleSecondPurchase,
  handleChangeClosureType,
  handleTransferLead,
  vendorList,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
          <div><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Oportunidades Activas</span><span className="text-xl font-bold text-zinc-850 mt-1 block">{activeLeadsCount}</span></div>
          <span className="p-2.5 bg-blue-50 text-blue-650 rounded-lg"><Users2 className="w-5 h-5" /></span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
          <div><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Pipeline Activo Estimado</span><span className="text-xl font-bold text-zinc-850 mt-1 block">${activePipelineValue.toLocaleString()}</span></div>
          <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp className="w-5 h-5" /></span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-xs flex items-center justify-between">
          <div><span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">% de Efectividad de Cierre</span><span className="text-xl font-bold text-zinc-850 mt-1 block">{conversionPercentage}%</span></div>
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
                      <button onClick={() => handleOpenEditForm(lead)} className="p-1 px-2.5 bg-zinc-50 border rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-zinc-100">Editar</button>
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
          <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} isUpdating={false} onEdit={() => {}} onDelete={() => {}} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
};
