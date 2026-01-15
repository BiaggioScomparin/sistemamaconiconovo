import { jsPDF } from 'jspdf';
import { SessionMinute, MinuteSignature } from '@/hooks/useSessionMinutes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GenerateMinutePdfOptions {
  minute: SessionMinute;
  signatures: MinuteSignature[];
  lodgeName?: string;
  returnBase64?: boolean;
}

const formatTimeExtended = (time: string | null) => {
  if (!time) return '________ horas';
  const [hours, minutes] = time.split(':');
  const hoursNum = parseInt(hours);
  const hoursWords: Record<number, string> = {
    1: 'uma', 2: 'duas', 3: 'três', 4: 'quatro', 5: 'cinco',
    6: 'seis', 7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez',
    11: 'onze', 12: 'doze', 13: 'treze', 14: 'catorze', 15: 'quinze',
    16: 'dezesseis', 17: 'dezessete', 18: 'dezoito', 19: 'dezenove',
    20: 'vinte', 21: 'vinte e uma', 22: 'vinte e duas', 23: 'vinte e três'
  };
  const hoursText = hoursWords[hoursNum] || String(hoursNum);
  const minutesNum = parseInt(minutes);
  
  if (minutesNum > 0) {
    return `${hours}h${minutes} (${hoursText} horas e ${minutes} minutos)`;
  }
  return `${hours}h${minutes} (${hoursText} horas)`;
};

export async function generateMinutePdf({
  minute,
  signatures,
  lodgeName = '',
  returnBase64 = false
}: GenerateMinutePdfOptions): Promise<string> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentWidth = pageWidth - 2 * margin;
  let y = 20;

  const sessionDate = new Date(minute.session_date);
  const day = format(sessionDate, 'd', { locale: ptBR });
  const month = format(sessionDate, 'MMMM', { locale: ptBR });
  const year = format(sessionDate, 'yyyy', { locale: ptBR });
  
  const isMagna = minute.session_type === 'magna';
  const sessionTypeName = isMagna ? 'Magna' : 'Ordinária';
  
  const getCeremonyTypeName = (type: string | null) => {
    switch (type) {
      case 'iniciacao': return 'Iniciação';
      case 'elevacao': return 'Elevação';
      case 'exaltacao': return 'Exaltação';
      default: return 'Iniciação';
    }
  };
  
  const ceremonyType = getCeremonyTypeName(minute.magna_ceremony_type);

  const getSignatureForPosition = (position: string) => {
    const positionMap: Record<string, string[]> = {
      'veneravel_mestre': ['veneravel_mestre', 'Venerável Mestre'],
      'orador': ['orador', 'Orador'],
      'secretario': ['secretario', 'Secretário'],
    };
    
    for (const sig of signatures) {
      const matchPositions = positionMap[position] || [position];
      if (matchPositions.includes(sig.signer_position)) {
        return sig;
      }
    }
    return undefined;
  };

  // Helper to check page break
  const checkPageBreak = (neededSpace: number) => {
    if (y + neededSpace > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('GRANDE ORIENTE INDEPENDENTE DO BRASIL', pageWidth / 2, y, { align: 'center' });
  y += 6;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('G∴O∴I∴B∴', pageWidth / 2, y, { align: 'center' });
  y += 4;
  
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`Ata de Sessão ${sessionTypeName}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(12);
  if (isMagna) {
    doc.text(`Ata N.º ${minute.session_number || '____'} — Sessão Magna de ${ceremonyType}`, pageWidth / 2, y, { align: 'center' });
  } else {
    doc.text(`Ata N.º ${minute.session_number || '____'} — Sessão ${sessionTypeName}`, pageWidth / 2, y, { align: 'center' });
  }
  y += 15;

  // Main paragraph
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  
  let introText = '';
  if (isMagna) {
    introText = `Ata da Sessão Magna de ${ceremonyType} da A∴R∴L∴S∴ ${lodgeName || '________________________'}, realizada aos ${day} dias do mês de ${month} do ano de ${year} da Era Vulgar, correspondente ao ano de ${minute.masonic_year || '____'} da Verdadeira Luz.`;
  } else {
    introText = `Ata da sessão ${sessionTypeName.toLowerCase()} da A∴R∴L∴S∴ ${lodgeName || '________________________'}, realizada aos ${day} dias do mês de ${month} do ano de ${year} da Era Vulgar, correspondente ao ano de ${minute.masonic_year || '____'} da Verdadeira Luz.`;
  }
  
  const introLines = doc.splitTextToSize(introText, contentWidth);
  checkPageBreak(introLines.length * 5 + 5);
  doc.text(introLines, margin, y);
  y += introLines.length * 5 + 5;

  const openingText = `Os trabalhos foram abertos em Sessão ${sessionTypeName}${isMagna ? ` de ${ceremonyType}` : ''} com as exatas ${formatTimeExtended(minute.opening_time)}.`;
  const openingLines = doc.splitTextToSize(openingText, contentWidth);
  checkPageBreak(openingLines.length * 5 + 10);
  doc.text(openingLines, margin, y);
  y += openingLines.length * 5 + 10;

  // Officers section
  checkPageBreak(60);
  doc.setFont('helvetica', 'bold');
  doc.text('A Loja estava assim constituída:', margin, y);
  y += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const officers = [
    ['Venerável Mestre:', minute.presiding_master],
    ['1º Vigilante:', minute.first_vigilant],
    ['2º Vigilante:', minute.second_vigilant],
    ['Orador:', minute.orator],
    ['Secretário:', minute.secretary],
    ['Tesoureiro:', minute.treasurer],
    ['1º Diácono:', minute.first_deacon],
    ['2º Diácono:', minute.second_deacon],
    ['Mestre de Cerimônias:', minute.master_of_ceremonies],
    ['Chanceler:', minute.chancellor],
    ['Cobridor Interno:', minute.inner_guard],
    ['Hospitaleiro:', minute.hospitaller],
  ];

  officers.forEach(([title, name]) => {
    checkPageBreak(6);
    doc.setFont('helvetica', 'bold');
    doc.text(`  ${title}`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ir∴ ${name || '—'}`, margin + 45, y);
    y += 5;
  });
  y += 8;

  // Presence section
  if (minute.members_present) {
    checkPageBreak(15);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('VV∴ IIr∴ Presentes:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const presenceLines = doc.splitTextToSize(minute.members_present, contentWidth);
    doc.text(presenceLines, margin, y);
    y += presenceLines.length * 5 + 8;
  }

  if (minute.visitors) {
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.text('Visitantes:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const visitorsLines = doc.splitTextToSize(minute.visitors, contentWidth);
    doc.text(visitorsLines, margin, y);
    y += visitorsLines.length * 5 + 8;
  }

  // Magna Ceremony Section - Initiates
  if (isMagna && minute.initiates) {
    checkPageBreak(60);
    y += 5;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Seguiu a Cerimônia de: ${ceremonyType}`, margin, y);
    y += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Ritualisticamente conforme o Rito Escocês Antigo e Aceito os seguintes candidatos:', margin, y);
    y += 10;
    
    // Parse initiates (one per line)
    const initiatesList = minute.initiates.split('\n').filter(name => name.trim());
    
    // Create table for initiates
    const tableStartX = margin;
    const nameWidth = 80;
    const signatureWidth = 70;
    
    // Table header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Nome do Candidato', tableStartX + 5, y);
    doc.text('Assinatura', tableStartX + nameWidth + 10, y);
    y += 5;
    doc.setLineWidth(0.3);
    doc.line(tableStartX, y, tableStartX + nameWidth + signatureWidth, y);
    y += 5;
    
    // Table rows
    doc.setFont('helvetica', 'normal');
    initiatesList.forEach((name, index) => {
      checkPageBreak(12);
      
      // Draw row
      const rowHeight = 10;
      doc.rect(tableStartX, y, nameWidth, rowHeight);
      doc.rect(tableStartX + nameWidth, y, signatureWidth, rowHeight);
      
      // Name
      doc.setFontSize(9);
      doc.text(`${index + 1}. ${name.trim()}`, tableStartX + 3, y + 7);
      
      // Signature line placeholder
      doc.setFontSize(8);
      doc.text('Ass.:', tableStartX + nameWidth + 5, y + 7);
      doc.setLineWidth(0.2);
      doc.line(tableStartX + nameWidth + 15, y + 7, tableStartX + nameWidth + signatureWidth - 5, y + 7);
      
      y += rowHeight;
    });
    
    y += 10;
  }

  // Content sections
  const sections = [
    ['Leitura da Ata Anterior', minute.previous_minutes_reading],
    ['Expediente', minute.expedient],
    ['Correspondências Lidas', minute.correspondence_read],
    ['Saco de Propostas e Informações', minute.proposal_bag],
    ['Ordem do Dia', minute.order_of_the_day],
    ['Tempo de Estudos', minute.study_time],
    ['Tronco de Beneficência', minute.beneficence_trunk],
    ['Palavra a Bem da Ordem em Geral', minute.word_for_order],
    ['Assuntos Gerais', minute.general_matters],
    ['Deliberações', minute.deliberations],
    ['Observações', minute.observations],
  ];

  sections.forEach(([title, content]) => {
    if (content) {
      checkPageBreak(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(String(title), margin, y);
      y += 1;
      doc.setLineWidth(0.3);
      doc.line(margin, y, margin + 60, y);
      y += 5;
      
      doc.setFont('helvetica', 'normal');
      const contentLines = doc.splitTextToSize(String(content), contentWidth);
      checkPageBreak(contentLines.length * 5 + 5);
      doc.text(contentLines, margin, y);
      y += contentLines.length * 5 + 8;
    }
  });

  // Closing
  checkPageBreak(40);
  y += 5;
  
  const closingText = `O Venerável Mestre encerrou a presente Sessão ${sessionTypeName}${isMagna ? ` de ${ceremonyType}` : ''} com a devida ritualística às ${formatTimeExtended(minute.closing_time)}.`;
  const closingLines = doc.splitTextToSize(closingText, contentWidth);
  doc.text(closingLines, margin, y);
  y += closingLines.length * 5 + 10;

  const secretaryStatement = `Eu, ${minute.secretary || '________________________'}, Secretário da A∴R∴L∴S∴ ${lodgeName || '________________________'}, lavrei a presente Ata, que será assinada por direito após sua aprovação em Loja.`;
  const stmtLines = doc.splitTextToSize(secretaryStatement, contentWidth);
  doc.setFont('helvetica', 'italic');
  doc.text(stmtLines, margin, y);
  y += stmtLines.length * 5 + 20;

  // Signatures
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ASSINATURAS', pageWidth / 2, y, { align: 'center' });
  y += 25;

  const signaturePositions = [
    { x: margin + 20, label: 'Venerável Mestre', name: minute.presiding_master, sig: getSignatureForPosition('veneravel_mestre') },
    { x: pageWidth / 2, label: 'Orador', name: minute.orator, sig: getSignatureForPosition('orador') },
    { x: pageWidth - margin - 20, label: 'Secretário', name: minute.secretary, sig: getSignatureForPosition('secretario') },
  ];

  signaturePositions.forEach(({ x, label, name, sig }) => {
    doc.setLineWidth(0.4);
    doc.line(x - 30, y, x + 30, y);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Ir∴ ${name || '________________________'}`, x, y + 5, { align: 'center' });
    
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(label, x, y + 10, { align: 'center' });
    
    if (sig) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`✓ Assinado em ${format(new Date(sig.signed_at), 'dd/MM/yyyy')}`, x, y + 15, { align: 'center' });
    }
  });
  y += 25;

  // Footer
  checkPageBreak(20);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Documento gerado pelo Sistema de Gestão Maçônica — G∴O∴I∴B∴', pageWidth / 2, pageHeight - 18, { align: 'center' });
  
  if (minute.status === 'signed') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('✓ ATA ASSINADA DIGITALMENTE', pageWidth / 2, pageHeight - 12, { align: 'center' });
  }

  if (returnBase64) {
    // Return base64 without data URI prefix
    const pdfOutput = doc.output('datauristring');
    return pdfOutput.split(',')[1]; // Remove "data:application/pdf;base64," prefix
  }

  // Save the PDF
  const fileName = `Ata_${sessionTypeName}_${format(sessionDate, 'dd-MM-yyyy')}_N${minute.session_number || 'X'}.pdf`;
  doc.save(fileName);
  return fileName;
}
