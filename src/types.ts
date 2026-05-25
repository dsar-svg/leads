/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LeadStatus = string;

export interface Lead {
  id: string; // ID_Lead
  fechaIngreso: string; // Fecha Ingreso
  nombre: string; // Nombre Contacto
  empresa: string; // Empresa/Tienda
  rif: string; // RIF
  telefono: string; // Telefono
  ubicacionEstado: string; // Ubicacion Estado
  ubicacionDetalle: string; // Ubicacion Detalle
  canalOrigen: string; // Canal Origen
  campana: string; // Campana
  vendedor: string; // Vendedor
  estatus: LeadStatus; // Fase Oportunidad ('NUEVO', 'CONTACTADO', or any custom status, and 'CERRADO' or 'CERRADO_VENTA' / 'CERRADO_ABANDONADO' for closed leads)
  notas: string; // Observaciones Vendedor
  valorEstimado: number; // Monto Cerrado USD (only if closed as sale)
  numFactura: string; // Num Factura (only if closed as sale)
  fechaVenta: string; // Fecha Venta (independent closure date)
  motivoCierre?: 'VENTA' | 'ABANDONADO' | string; // Closure type
  categoriaInteres: string; // Categoria de Interes
  rowNumber?: number; // Optional reference to the Google Sheet row index (1-based, typically row 2+)
  hasPassedContactado?: boolean; // Ha pasado por la fase de contactado
  hasSecondPurchase?: boolean; // Indica si ya se registró una segunda compra para este lead
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
