import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exporterExcel<T extends Record<string, unknown>>(donnees: T[], nomFichier: string, titreFeuille = 'Feuille1') {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(donnees);
  XLSX.utils.book_append_sheet(wb, ws, titreFeuille);
  const buff = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buff]), `${nomFichier}.xlsx`);
}

export function exporterPDF(
  entetes: string[],
  lignes: (string | number)[][],
  titre: string,
  nomFichier: string,
  sousTitre?: string,
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text(titre, 14, 20);
  if (sousTitre) {
    doc.setFontSize(10);
    doc.text(sousTitre, 14, 28);
  }
  autoTable(doc, {
    startY: 36,
    head: [entetes],
    body: lignes,
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  doc.save(`${nomFichier}.pdf`);
}


