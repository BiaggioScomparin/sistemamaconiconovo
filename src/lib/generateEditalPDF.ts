import jsPDF from 'jspdf';

interface ProfileData {
  full_name: string;
  birth_date: string;
  naturality?: string | null;
  nationality?: string | null;
  state?: string | null;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  cep?: string | null;
  residence_time?: string | null;
  voter_title?: string | null;
  voter_zone?: string | null;
  cpf?: string | null;
  identity_number?: string | null;
  identity_issuer?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  education_level?: string | null;
  civil_status?: string | null;
  spouse_name?: string | null;
  marriage_date?: string | null;
  profession?: string | null;
  is_retired?: boolean | null;
  employer?: string | null;
  work_street?: string | null;
  work_neighborhood?: string | null;
  work_city?: string | null;
  work_state?: string | null;
  work_cep?: string | null;
  work_time?: string | null;
  photo_url?: string | null;
}

interface Child {
  name: string;
  birth_date: string;
}

interface LodgeData {
  name: string;
  city?: string | null;
  state?: string | null;
}

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
};

export async function generateEditalPDF(
  profile: ProfileData,
  children: Child[] = [],
  lodge?: LodgeData | null
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 15;

  // Header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('GOIB', margin, y);
  doc.text('GRANDE ORIENTE INDEPENDENTE DO BRASIL', pageWidth / 2, y, { align: 'center' });
  
  y += 8;
  doc.setFontSize(14);
  doc.text('A∴R∴L∴S∴ LEALDADE E JUSTIÇA', pageWidth / 2, y, { align: 'center' });
  
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nº _________`, pageWidth - margin - 30, y);
  
  y += 6;
  doc.text(`Oriente de ${lodge?.city || '_________'} ${lodge?.state || '__'}`, margin, y);
  
  y += 5;
  doc.text(`Endereço ___________________________________`, margin, y);
  
  y += 5;
  doc.text(`Sessões às _______ E.A.A.`, margin, y);
  doc.text(`Rito _________________`, pageWidth - margin - 50, y);
  
  // EDITAL Title
  y += 10;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('EDITAL', pageWidth / 2, y, { align: 'center' });
  
  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('TORNAMOS PÚBLICO, que o Candidato abaixo assinado requereu nesta Loja', margin, y);
  
  y += 6;
  doc.text('☒ ADMISSÃO     ☐ REGULARIZAÇÃO', margin, y);
  
  // Photo placeholder
  const photoX = pageWidth - margin - 25;
  const photoY = y + 5;
  doc.rect(photoX, photoY, 25, 30);
  doc.setFontSize(7);
  doc.text('FOTO 3x4', photoX + 12.5, photoY + 15, { align: 'center' });
  
  // Data table
  y += 12;
  const labelWidth = 35;
  const valueWidth = 70;
  const col2LabelX = margin + labelWidth + valueWidth + 5;
  const lineHeight = 5;
  
  const drawRow = (label1: string, value1: string, label2?: string, value2?: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label1, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value1 || '', margin + labelWidth, y);
    
    if (label2 !== undefined) {
      doc.setFont('helvetica', 'bold');
      doc.text(label2, col2LabelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value2 || '', col2LabelX + 25, y);
    }
    y += lineHeight;
  };
  
  drawRow('Nome:', profile.full_name);
  drawRow('Nasc.:', formatDate(profile.birth_date), 'Natural de:', profile.naturality || '');
  drawRow('Nacionalidade:', profile.nationality || 'Brasileiro', 'UF:', profile.state || '');
  
  const fullAddress = [profile.street, profile.number, profile.neighborhood].filter(Boolean).join(', ');
  drawRow('Resid. atual:', fullAddress);
  drawRow('Cidade:', `${profile.city || ''} ${profile.state || ''}`, 'CEP:', profile.cep || '');
  drawRow('Tempo:', profile.residence_time || '');
  
  drawRow('Titulo de Eleitor:', profile.voter_title || '', 'Zona:', profile.voter_zone || '');
  drawRow('CPF:', profile.cpf || '');
  drawRow('Identidade:', `${profile.identity_number || ''} ${profile.identity_issuer || ''}`);
  
  y += 2;
  drawRow('Pai:', profile.father_name || '');
  drawRow('Mãe:', profile.mother_name || '');
  drawRow('Grau instrução:', profile.education_level || '');
  drawRow('Est. civil:', profile.civil_status || '');
  
  if (profile.spouse_name) {
    drawRow('Nome cônjuge:', profile.spouse_name, 'Data nasc.:', formatDate(profile.marriage_date));
  }
  
  // Children
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.text('Filhos:', margin, y);
  y += lineHeight;
  
  doc.setFont('helvetica', 'normal');
  if (children.length > 0) {
    children.slice(0, 5).forEach((child) => {
      doc.text(`${child.name}`, margin + 10, y);
      doc.text(`Data nasc.: ${formatDate(child.birth_date)}`, col2LabelX, y);
      y += lineHeight;
    });
  } else {
    y += lineHeight * 2;
  }
  
  // Professional data
  y += 2;
  drawRow('Profissão:', profile.profession || '', 'Aposentado:', profile.is_retired ? 'SIM' : 'NÃO');
  drawRow('Empregador:', profile.employer || '');
  
  const workAddress = [profile.work_street, profile.work_neighborhood].filter(Boolean).join(', ');
  drawRow('End. trabalho:', workAddress);
  drawRow('Cidade:', `${profile.work_city || ''} ${profile.work_state || ''}`, 'CEP:', profile.work_cep || '');
  drawRow('Tempo:', profile.work_time || '');
  
  // Footer notice
  y += 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('É dever de todo Obreiro dar ciência à Loja de qualquer fato que possa impedir a admissão do candidato.', pageWidth / 2, y, { align: 'center' });
  
  // Signatures
  y += 15;
  doc.setFont('helvetica', 'normal');
  const sigLineWidth = 60;
  
  doc.line(margin, y, margin + sigLineWidth, y);
  doc.line(pageWidth - margin - sigLineWidth, y, pageWidth - margin, y);
  
  y += 5;
  doc.text('Candidato', margin + sigLineWidth / 2, y, { align: 'center' });
  doc.text('Secretário', pageWidth - margin - sigLineWidth / 2, y, { align: 'center' });
  
  // Save PDF
  doc.save(`Edital_${profile.full_name.replace(/\s+/g, '_')}.pdf`);
}
