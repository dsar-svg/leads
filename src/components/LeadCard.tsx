/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  Building2, 
  Phone, 
  MapPin, 
  GripVertical, 
  DollarSign, 
  Mail, 
  Clock, 
  Loader2, 
  Trash2, 
  Edit3,
  FileText,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Lead } from '../types';

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
}

export const LeadCard: React.FC<LeadCardProps> = ({ 
  lead, 
  isUpdating, 
  onEdit, 
  onDelete,
  onCloseLead,
  userRole = 'ADMIN',
  onSecondPurchase,
  onChangeClosureType,
  onTransfer,
  vendorList = []
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    disabled: isUpdating, // Prevent dragging while updating status
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
    ? new Date(lead.fechaIngreso).toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short',
        year: '2-digit'
      })
    : 'S/F';

  return (
    <div
      id={`lead-card-${lead.id}`}
      ref={setNodeRef}
      style={style}
      className={`
        relative group bg-white border rounded-xl shadow-xs transition-shadow duration-200 hover:shadow-md
        ${isUpdating ? 'border-amber-300 ring-1 ring-amber-300 bg-amber-50/20' : 'border-zinc-200/80 hover:border-zinc-300'}
        ${isDragging ? 'scale-[1.02] cursor-grabbing border-blue-400 ring-2 ring-blue-500/10 shadow-lg' : ''}
      `}
    >
      {/* Loading overlay when status is updating to webhook */}
      {isUpdating && (
        <div className="absolute inset-x-0 top-0 h-1 bg-amber-500 rounded-t-xl overflow-hidden">
          <div className="w-full h-full bg-amber-400 animate-pulse" />
        </div>
      )}

      <div className="p-4">
        {/* Top Header Row of Card */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-zinc-800 tracking-tight leading-tight truncate group-hover:text-blue-600 transition-colors">
              {lead.nombre}
            </h4>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500 font-medium">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
              <span className="truncate">{lead.empresa}</span>
            </div>
          </div>

          {/* Drag Handle & Context Menu Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              {...attributes}
              {...listeners}
              className={`p-1 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors cursor-grab ${isUpdating ? 'opacity-30 cursor-not-allowed' : ''}`}
              title="Arrastrar lead"
              aria-label="Arrastrar lead"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lead Specific details */}
        <div className="space-y-1.5 my-3 text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            <a href={`tel:${lead.telefono}`} className="hover:text-blue-650 hover:underline truncate">
              {lead.telefono || 'Sin teléfono'}
            </a>
          </div>
          {lead.rif && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-450 text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded leading-none">RIF</span>
              <span className="truncate text-zinc-500">{lead.rif}</span>
            </div>
          )}
          {(lead.ubicacionEstado || lead.ubicacionDetalle) && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              <span className="truncate">
                {lead.ubicacionEstado}
                {lead.ubicacionDetalle ? ` (${lead.ubicacionDetalle})` : ''}
              </span>
            </div>
          )}
          {lead.canalOrigen && (
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium border border-slate-200">
                {lead.canalOrigen}
              </span>
              {lead.campana && (
                <span className="truncate italic text-zinc-400">
                  {lead.campana}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Notes Preview if available */}
        {lead.notas && (
          <div className="mt-2.5 p-2 bg-zinc-50 rounded-lg text-xs text-zinc-500 line-clamp-2 border border-zinc-100">
            <div className="flex items-start gap-1">
              <FileText className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
              <p className="leading-relaxed italic">"{lead.notas}"</p>
            </div>
          </div>
        )}

        {/* Closed Leads Prominent Actions */}
        {(lead.estatus === 'CERRADO_VENTA' || lead.estatus === 'CERRADO' || lead.estatus === 'CERRADO_ABANDONADO') && (() => {
          let closedDaysPercentage = 0;
          let daysLeftStr = '';
          if (lead.fechaVenta) {
            const saleDate = new Date(lead.fechaVenta).getTime();
            if (!isNaN(saleDate)) {
              const elapsedMs = new Date().getTime() - saleDate;
              const elapsedDays = Math.max(0, elapsedMs / (1000 * 60 * 60 * 24));
              closedDaysPercentage = Math.min(100, Math.max(0, (elapsedDays / 30) * 100));
              const remainingDays = Math.max(0, 30 - elapsedDays);
              daysLeftStr = remainingDays > 0 
                ? `${Math.ceil(remainingDays)}d restantes` 
                : 'Expiró (30 días)';
            }
          }
          return (
            <div className="mt-2.5 flex flex-col gap-1.5 p-2 bg-zinc-50 border border-zinc-200/60 rounded-lg">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-zinc-500">Estado Cierre:</span>
                <span className={lead.estatus === 'CERRADO_VENTA' || lead.estatus === 'CERRADO' 
                  ? "text-emerald-700 font-extrabold uppercase bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-150 text-[9px]" 
                  : "text-zinc-500 font-extrabold uppercase bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-250 text-[9px]"}>
                  {lead.estatus === 'CERRADO_VENTA' || lead.estatus === 'CERRADO' ? "VENTA" : "ABANDONADO"}
                </span>
              </div>
              {lead.numFactura && (
                <div className="text-[10px] text-zinc-500 font-mono">
                  Factura: <span className="font-semibold text-zinc-700">{lead.numFactura}</span>
                </div>
              )}
              
              {/* Progress bar */}
              {lead.fechaVenta && (
                <div className="mt-1 space-y-1">
                  <div className="flex items-center justify-between text-[9px] text-zinc-400 font-medium font-mono">
                    <span>Vida en Cerrado:</span>
                    <span>{daysLeftStr} ({Math.round(closedDaysPercentage)}%)</span>
                  </div>
                  <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        closedDaysPercentage > 85 ? 'bg-red-500' : closedDaysPercentage > 50 ? 'bg-amber-500' : 'bg-blue-600'
                      }`} 
                      style={{ width: `${closedDaysPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5 mt-1 border-t border-zinc-200/40 pt-1.5">
                {(lead.estatus === 'CERRADO_VENTA' || lead.estatus === 'CERRADO') && onSecondPurchase && (
                  <button
                    type="button"
                    onClick={() => onSecondPurchase(lead)}
                    disabled={isUpdating}
                    className="flex-1 py-1 px-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] rounded shadow-xs focus:outline-none transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                  >
                    <span>🛍️ Segunda Compra</span>
                  </button>
                )}
                {lead.estatus === 'CERRADO_ABANDONADO' && onChangeClosureType && (
                  <button
                    type="button"
                    onClick={() => onChangeClosureType(lead)}
                    disabled={isUpdating}
                    className="flex-1 py-1 px-2 bg-zinc-650 hover:bg-zinc-700 text-white font-extrabold text-[10px] rounded shadow-xs focus:outline-none transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                  >
                    <span>🔄 Cambiar Cierre</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Divider */}
        <div className="h-px bg-zinc-100 my-2.5" />

        {/* Bottom Row - Badges & Local Actions */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            {formattedValue && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100">
                <DollarSign className="w-3 h-3 -ml-0.5" />
                {formattedValue}
              </span>
            )}
            {lead.vendedor && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-zinc-650 bg-zinc-100 border border-zinc-200/60" title={`Vendedor: ${lead.vendedor}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                {lead.vendedor}
              </span>
            )}
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-400">
              <Clock className="w-3 h-3" />
              {creationDate}
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
            {onCloseLead && !(lead.estatus === 'CERRADO' || lead.estatus === 'CERRADO_VENTA' || lead.estatus === 'CERRADO_ABANDONADO') && (() => {
              const isCloseAllowed = userRole === 'ADMIN' || lead.hasPassedContactado || (lead.estatus !== 'NUEVO');
              return (
                <button
                  onClick={() => {
                    if (isCloseAllowed) {
                      onCloseLead(lead);
                    }
                  }}
                  disabled={isUpdating || !isCloseAllowed}
                  className={`p-1 rounded-md transition-colors ${
                    isCloseAllowed 
                      ? 'text-zinc-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer' 
                      : 'text-zinc-300 bg-zinc-50 opacity-50 cursor-not-allowed'
                  }`}
                  title={isCloseAllowed 
                    ? "Cerrar Lead (Venta / No Responde)" 
                    : "Acción bloqueada: Un vendedor solo puede cerrar este lead una vez que haya pasado por la fase de CONTACTADO o posterior."
                  }
                  aria-label="Cerrar Lead"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              );
            })()}
            <button
              onClick={() => onEdit(lead)}
              disabled={isUpdating}
              className="p-1 text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
              title="Editar Lead"
              aria-label="Editar"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            {userRole === 'ADMIN' && onTransfer && (
              <div className="relative group/transfer">
                <button
                  className="p-1 text-zinc-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                  title="Transferir Lead"
                >
                  <Users2 className="w-3.5 h-3.5" />
                </button>
                <div className="absolute right-0 bottom-full mb-2 bg-white border border-zinc-200 rounded-lg shadow-lg p-2 w-48 opacity-0 group-hover/transfer:opacity-100 transition-opacity pointer-events-none group-hover/transfer:pointer-events-auto z-50">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Transferir a:</p>
                  {vendorList.filter(v => v !== lead.vendedor).map(v => (
                    <button
                      key={v}
                      onClick={() => onTransfer(lead, v)}
                      className="block w-full text-left px-2 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 rounded-md"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => onDelete(lead.id)}
              disabled={isUpdating}
              className="p-1 text-zinc-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              title="Eliminar Lead"
              aria-label="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sync Status Banner */}
      {isUpdating && (
        <div className="flex items-center justify-center gap-1 px-3 py-1.5 bg-amber-550 text-white rounded-b-xl text-[11px] font-medium leading-none animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Sincronizando con n8n...</span>
        </div>
      )}
    </div>
  );
};
