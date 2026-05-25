/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Lead, LeadStatus } from './types';

// Default mock n8n webhook URL.
export const DEFAULT_WEBHOOK_URL = 'https://n8n.tu-servidor.com/webhook/crm-leads';

/**
 * Retrieves the currently saved Webhook URL from local storage or returns the default.
 */
export function getWebhookUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('crm_n8n_webhook_url');
    return saved || DEFAULT_WEBHOOK_URL;
  }
  return DEFAULT_WEBHOOK_URL;
}

/**
 * Saves a new Webhook URL to local storage.
 */
export function saveWebhookUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('crm_n8n_webhook_url', url);
  }
}

/**
 * Sends a status change update to the configured n8n Webhook.
 * It uses standard fetch POST. If the URL contains 'tu-servidor', runs a realistic simulation.
 * 
 * @param lead The complete lead object with updated status
 * @param prevStatus The previous status before drag & drop
 * @returns A promise with the success state and response details
 */
export async function sendWebhookStatusChange(
  lead: Lead,
  prevStatus: LeadStatus
): Promise<{ success: boolean; message: string; rawResponse?: any }> {
  const webhookUrl = getWebhookUrl();
  const payload = {
    event: 'lead_status_changed',
    timestamp: new Date().toISOString(),
    lead: {
      id: lead.id,
      nombre: lead.nombre,
      empresa: lead.empresa,
      telefono: lead.telefono,
      ubicacion_estado: lead.ubicacionEstado,
      ubicacion_detalle: lead.ubicacionDetalle,
      rif: lead.rif,
      canal_origen: lead.canalOrigen,
      campana: lead.campana,
      vendedor: lead.vendedor,
      estatus_anterior: prevStatus,
      estatus_nuevo: lead.estatus,
      notas: lead.notas || '',
      monto_cerrado_usd: lead.valorEstimado || 0,
      num_factura: lead.numFactura || '',
      fecha_venta: lead.fechaVenta || '',
      fecha_ingreso: lead.fechaIngreso,
      categoria_interes: lead.categoriaInteres || ''
    }
  };

  // If the URL is still the placeholder or if testing offline, simulate a response
  if (webhookUrl === DEFAULT_WEBHOOK_URL || !webhookUrl.startsWith('http')) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    return {
      success: true,
      message: `[SIMULACIÓN WEBHOOK n8n] Sincronizado en tiempo real. Configura tu Webhook en el engranaje superior.`,
      rawResponse: {
        status: "success",
        webhook_type: "simulation",
        received_payload: payload
      }
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Error en webhook n8n: ${response.status} ${response.statusText}`);
    }

    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    return {
      success: true,
      message: 'Notificación enviada exitosamente al Webhook de n8n.',
      rawResponse: responseData,
    };
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return {
      success: false,
      message: error.message || 'Error de conexión de red con el Webhook de n8n.',
    };
  }
}

// --- GOOGLE SHEETS API IMPLEMENTATION ---

export const SHEETS_COLUMNS = [
  "ID_Lead",
  "Fecha Ingreso",
  "Nombre Contacto",
  "Empresa/Tienda",
  "RIF",
  "Telefono",
  "Ubicacion Estado",
  "Ubicacion Detalle",
  "Canal Origen",
  "Campana",
  "Vendedor",
  "Fase Oportunidad",
  "Observaciones Vendedor",
  "Monto Cerrado USD",
  "Num Factura",
  "Fecha Venta",
  "Categoria Interes"
];

/**
 * Gets the configured spreadsheet ID from local storage.
 */
export function getSavedSpreadsheetId(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('crm_sheets_id') || '';
  }
  return '';
}

/**
 * Saves the spreadsheet ID to local storage.
 */
export function saveSpreadsheetId(id: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('crm_sheets_id', id.trim());
  }
}

/**
 * Extracts a spreadsheet ID from a Google Sheets URL if needed,
 * or returns the trimmed input directly.
 */
export function parseSpreadsheetIdInput(input: string): string {
  const urlPattern = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
  const match = input.match(urlPattern);
  return match ? match[1] : input.trim();
}

/**
 * Fetches the metadata from the spreadsheet to figure out the name of the first sheet.
 * Always identify the sheet page dynamically instead of assuming.
 */
export async function getFirstSheetTitle(accessToken: string, spreadsheetId: string): Promise<string> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(title))`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Error al leer metadatos de Google Sheets: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const sheets = data.sheets;
  if (sheets && sheets.length > 0) {
    return sheets[0].properties.title;
  }
  return 'Sheet1';
}

/**
 * Appends the standard header row to an empty spreadsheet.
 */
export async function initializeSheetHeaders(accessToken: string, spreadsheetId: string, sheetTitle: string): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:P1?valueInputOption=USER_ENTERED`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: `${sheetTitle}!A1:P1`,
      majorDimension: 'ROWS',
      values: [SHEETS_COLUMNS],
    }),
  });

  if (!response.ok) {
    throw new Error(`No se pudieron inicializar las cabeceras en Google Sheets.`);
  }
}

/**
 * Reads all lead rows from Google Sheets, mapping them to the internal Lead array.
 */
export async function fetchLeadsFromSheet(accessToken: string, spreadsheetId: string): Promise<{ sheetTitle: string; leads: Lead[] }> {
  const sheetTitle = await getFirstSheetTitle(accessToken, spreadsheetId);
  const range = `${sheetTitle}!A1:P500`; // Fetch first 500 records
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`No se pudo leer la tabla de leads. Asegúrate de tener permisos.`);
  }

  const data = await response.json();
  const values: any[][] = data.values || [];

  // Check if sheet is empty. If so, initialize it!
  if (values.length === 0) {
    await initializeSheetHeaders(accessToken, spreadsheetId, sheetTitle);
    return { sheetTitle, leads: [] };
  }

  const headers = values[0] || [];
  
  // Map index of headers dynamically for perfect order flexibility
  const headerMap: Record<string, number> = {};
  SHEETS_COLUMNS.forEach((colName) => {
    const idx = headers.findIndex(h => h && h.toString().trim().toLowerCase() === colName.toLowerCase());
    headerMap[colName] = idx; // Can be -1 if missing
  });

  const parsedLeads: Lead[] = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i] || [];

    const getValue = (colName: string): string => {
      const idx = headerMap[colName];
      if (idx === undefined || idx === -1 || idx >= row.length) return '';
      return (row[idx] ?? '').toString().trim();
    };

    const id = getValue("ID_Lead") || `row-${i + 1}`;
    const fechaIngreso = getValue("Fecha Ingreso") || new Date().toISOString();
    const nombre = getValue("Nombre Contacto") || 'Sin Nombre';
    const empresa = getValue("Empresa/Tienda") || 'Sin Empresa/Tienda';
    const rif = getValue("RIF") || '';
    const telefono = getValue("Telefono") || '';
    const ubicacionEstado = getValue("Ubicacion Estado") || '';
    const ubicacionDetalle = getValue("Ubicacion Detalle") || '';
    const canalOrigen = getValue("Canal Origen") || '';
    const campana = getValue("Campana") || '';
    const vendedor = getValue("Vendedor") || 'Unassigned';
    
    const stage = getValue("Fase Oportunidad").trim();
    const estatus: LeadStatus = stage || 'NUEVO';

    const notas = getValue("Observaciones Vendedor") || '';
    
    const rawVal = getValue("Monto Cerrado USD");
    const valorEstimado = parseFloat(rawVal.replace(/[^0-9.]/g, '')) || 0;

    const numFactura = getValue("Num Factura") || '';
    const fechaVenta = getValue("Fecha Venta") || '';
    const categoriaInteres = getValue("Categoria Interes") || '';

    parsedLeads.push({
      id,
      fechaIngreso,
      nombre,
      empresa,
      rif,
      telefono,
      ubicacionEstado,
      ubicacionDetalle,
      canalOrigen,
      campana,
      vendedor,
      estatus,
      notas,
      valorEstimado,
      numFactura,
      fechaVenta,
      categoriaInteres,
      rowNumber: i + 1 // Row is 2 for index 1, etc.
    });
  }

  return { sheetTitle, leads: parsedLeads };
}

/**
 * Builds the ordered row array to send to Google Sheets based on current column headers.
 */
function buildRowArray(lead: Lead, headers: string[]): any[] {
  const row = new Array(headers.length).fill('');
  
  SHEETS_COLUMNS.forEach((colName) => {
    // Exact target column index
    const idx = headers.findIndex(h => h && h.toString().trim().toLowerCase() === colName.toLowerCase());
    if (idx !== -1) {
      switch (colName) {
        case "ID_Lead": row[idx] = lead.id; break;
        case "Fecha Ingreso": row[idx] = lead.fechaIngreso; break;
        case "Nombre Contacto": row[idx] = lead.nombre; break;
        case "Empresa/Tienda": row[idx] = lead.empresa; break;
        case "RIF": row[idx] = lead.rif; break;
        case "Telefono": row[idx] = lead.telefono; break;
        case "Ubicacion Estado": row[idx] = lead.ubicacionEstado; break;
        case "Ubicacion Detalle": row[idx] = lead.ubicacionDetalle; break;
        case "Canal Origen": row[idx] = lead.canalOrigen; break;
        case "Campana": row[idx] = lead.campana; break;
        case "Vendedor": row[idx] = lead.vendedor; break;
        case "Fase Oportunidad": row[idx] = lead.estatus; break;
        case "Observaciones Vendedor": row[idx] = lead.notas; break;
        case "Monto Cerrado USD": row[idx] = lead.valorEstimado; break;
        case "Num Factura": row[idx] = lead.numFactura; break;
        case "Fecha Venta": row[idx] = lead.fechaVenta; break;
        case "Categoria Interes": row[idx] = lead.categoriaInteres; break;
      }
    }
  });

  return row;
}

/**
 * Updates an existing lead's row in Google Sheets.
 */
export async function updateLeadInSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  lead: Lead
): Promise<void> {
  if (!lead.rowNumber) {
    throw new Error('No se puede actualizar el Lead: Falta número de fila de Google Sheets.');
  }

  // Fetch header row first to ensure we write values into the correct column indexes
  const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:P1`;
  const headerRes = await fetch(headerUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!headerRes.ok) {
    throw new Error('No se pudo verificar el orden de columnas del archivo para actualizar.');
  }

  const headerData = await headerRes.json();
  const headers = headerData.values?.[0] || SHEETS_COLUMNS;

  const rowValues = buildRowArray(lead, headers);
  
  // Build cell range. Example: "Hoja 1!A15:P15"
  const range = `${sheetTitle}!A${lead.rowNumber}:P${lead.rowNumber}`;
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: [rowValues],
    }),
  });

  if (!response.ok) {
    throw new Error(`Error de Google Sheets al actualizar la fila: ${response.statusText}`);
  }
}

/**
 * Appends a new lead to Google Sheets.
 */
export async function appendLeadToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  lead: Lead
): Promise<number> {
  // Fetch header row first
  const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:P1`;
  const headerRes = await fetch(headerUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!headerRes.ok) {
    throw new Error('No se pudo verificar el orden de las columnas antes de añadir.');
  }

  const headerData = await headerRes.json();
  const headers = headerData.values?.[0] || SHEETS_COLUMNS;

  const rowValues = buildRowArray(lead, headers);

  // POST append
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A:P:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: `${sheetTitle}!A:P`,
      majorDimension: 'ROWS',
      values: [rowValues],
    }),
  });

  if (!response.ok) {
    throw new Error(`Error de Google Sheets al crear registro: ${response.statusText}`);
  }

  const result = await response.json();
  
  // Extract index of the updated/appended range to return the computed row index
  // Result has: "updates": { "updatedRange": "Hoja 1!A18:P18" }
  const updatedRange = result.updates?.updatedRange || '';
  const match = updatedRange.match(/A(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return 0; // return 0 if row number couldn't be resolved dynamically (will force a reload)
}
