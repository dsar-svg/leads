/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LeadStatus = string;

export interface Lead {
  id: string;
  name: string;
  nombre_contacto: string;
  rif: string;
  telefono: string;
  ubicacion_estado: string;
  ubicacion_detail: string;
  categoria_interes: string;
  especialidad_tienda: string;
  canal_origen: string;
  campana: string;
  seller_id: string;
  seller_name?: string;
  status: string;
  whatsapp_link: string;
  observaciones_vendedor: string;
  monto_cerrado_usd: number;
  num_factura: string;
  fecha_venta: string;
  created_at: string;
  updated_at: string;
  // UI Only / Temporary fields for KanbanBoard
  hasPassedContactado?: boolean;
  motivoCierre?: string;
  fechaIngreso?: string;
  rowNumber?: number;
  hasSecondPurchase?: boolean;
}

export interface Column {
  id: string;
  title: string;
  color: string;
  bgClass: string;
  borderClass: string;
  accentClass: string;
  textClass: string;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  leadId: string;
  leadNombre: string;
  prevStatus?: LeadStatus;
  newStatus: LeadStatus;
  url: string;
  status: 'PENDING' | 'SUCCESS' | 'ERROR';
  responseMessage?: string;
}
