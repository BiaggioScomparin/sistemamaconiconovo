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

interface EditalConfig {
  oriente: string;
  endereco: string;
  sessaoHora: string;
  rito: string;
  lodgeNumber: string;
}

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
};

const loadImage = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export async function generateEditalPDF(
  profile: ProfileData,
  children: Child[] = [],
  lodge?: LodgeData | null,
  config?: EditalConfig
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 15;

  // Colors
  const primaryBlue = [25, 84, 123];
  const darkBlue = [15, 50, 80];
  const gold = [180, 150, 50];

  // Try to load the logo
  const logoUrl = `${window.location.origin}/images/logo-goib-edital.png`;
  const logoData = await loadImage(logoUrl);

  // Header with modern design
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Add logo if loaded
  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, 5, 35, 35);
  }

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GRANDE ORIENTE INDEPENDENTE DO BRASIL', pageWidth / 2 + 10, 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text(`A∴R∴L∴S∴ ${lodge?.name || 'LEALDADE E JUSTIÇA'}`, pageWidth / 2 + 10, 24, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const lodgeNumber = config?.lodgeNumber ? `Nº ${config.lodgeNumber}` : '';
  if (lodgeNumber) {
    doc.text(lodgeNumber, pageWidth / 2 + 10, 32, { align: 'center' });
  }
  
  const orienteText = `Oriente de ${lodge?.city || config?.oriente || '_________'}`;
  doc.text(orienteText, pageWidth / 2 + 10, 38, { align: 'center' });

  y = 52;

  // Lodge info bar
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, pageWidth - margin * 2, 14, 'F');
  
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  const endereco = config?.endereco || 'Endereço não informado';
  doc.text(`Endereço: ${endereco}`, margin + 3, y + 5);
  doc.text(`Sessões às: ${config?.sessaoHora || '20:00'} hrs`, margin + 3, y + 10);
  doc.text(`Rito: ${config?.rito || 'REEA'}`, pageWidth - margin - 40, y + 5);

  y += 20;

  // EDITAL Title with decoration
  doc.setFillColor(gold[0], gold[1], gold[2]);
  doc.rect(margin, y, pageWidth - margin * 2, 0.5, 'F');
  
  y += 8;
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('EDITAL', pageWidth / 2, y, { align: 'center' });
  
  y += 5;
  doc.setFillColor(gold[0], gold[1], gold[2]);
  doc.rect(margin, y, pageWidth - margin * 2, 0.5, 'F');

  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('TORNAMOS PÚBLICO, que o Candidato abaixo assinado requereu nesta Loja:', margin, y);
  
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('☒ ADMISSÃO     ☐ REGULARIZAÇÃO', margin, y);

  // Photo box (right side)
  const photoX = pageWidth - margin - 30;
  const photoY = y + 5;
  const photoWidth = 30;
  const photoHeight = 40;
  
  // Photo border
  doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setLineWidth(0.5);
  doc.rect(photoX - 1, photoY - 1, photoWidth + 2, photoHeight + 2);
  
  // Try to add candidate photo
  if (profile.photo_url) {
    const photoData = await loadImage(profile.photo_url);
    if (photoData) {
      doc.addImage(photoData, 'JPEG', photoX, photoY, photoWidth, photoHeight);
    } else {
      doc.setFillColor(245, 245, 245);
      doc.rect(photoX, photoY, photoWidth, photoHeight, 'F');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('FOTO 3x4', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
    }
  } else {
    doc.setFillColor(245, 245, 245);
    doc.rect(photoX, photoY, photoWidth, photoHeight, 'F');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('FOTO 3x4', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
  }

  y += 12;
  const contentWidth = pageWidth - margin * 2 - photoWidth - 10;
  
  // Section helper function
  const drawSection = (title: string) => {
    y += 6;
    doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 3, y + 4.5);
    y += 9;
    doc.setTextColor(60, 60, 60);
  };

  // Data row helper
  const drawRow = (label: string, value: string, label2?: string, value2?: string) => {
    const col1Width = 30;
    const val1Width = 60;
    const col2X = margin + col1Width + val1Width + 5;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '-', margin + col1Width, y);
    
    if (label2 !== undefined && (margin + col1Width + val1Width + 30) < photoX) {
      doc.setFont('helvetica', 'bold');
      doc.text(label2, col2X, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value2 || '-', col2X + 20, y);
    }
    y += 5;
  };

  // Personal Data Section
  drawSection('DADOS PESSOAIS');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text(profile.full_name.toUpperCase(), margin, y);
  y += 6;
  doc.setTextColor(60, 60, 60);

  drawRow('Nascimento:', formatDate(profile.birth_date), 'Natural:', profile.naturality || '');
  drawRow('Nacionalidade:', profile.nationality || 'Brasileiro(a)', 'UF:', profile.state || '');
  
  const fullAddress = [profile.street, profile.number, profile.neighborhood].filter(Boolean).join(', ');
  drawRow('Endereço:', fullAddress.substring(0, 50) + (fullAddress.length > 50 ? '...' : ''));
  drawRow('Cidade:', `${profile.city || ''} - ${profile.state || ''}`, 'CEP:', profile.cep || '');
  drawRow('Tempo res.:', profile.residence_time || '');

  // Documents section after photo area
  y = photoY + photoHeight + 5;
  
  drawSection('DOCUMENTOS');
  drawRow('Título Eleitor:', profile.voter_title || '', 'Zona:', profile.voter_zone || '');
  drawRow('CPF:', profile.cpf || '');
  drawRow('Identidade:', `${profile.identity_number || ''} - ${profile.identity_issuer || ''}`);

  // Family section
  drawSection('FILIAÇÃO E FAMÍLIA');
  drawRow('Pai:', profile.father_name || '');
  drawRow('Mãe:', profile.mother_name || '');
  drawRow('Instrução:', profile.education_level || '', 'Estado civil:', profile.civil_status || '');
  
  if (profile.spouse_name) {
    drawRow('Cônjuge:', profile.spouse_name, 'Casamento:', formatDate(profile.marriage_date));
  }

  // Children
  if (children.length > 0) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Filhos:', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    children.slice(0, 4).forEach((child) => {
      doc.text(`• ${child.name} - Nasc: ${formatDate(child.birth_date)}`, margin + 5, y);
      y += 4;
    });
  }

  // Professional section
  drawSection('DADOS PROFISSIONAIS');
  drawRow('Profissão:', profile.profession || '', 'Aposentado:', profile.is_retired ? 'SIM' : 'NÃO');
  drawRow('Empregador:', profile.employer || '');
  
  const workAddress = [profile.work_street, profile.work_neighborhood].filter(Boolean).join(', ');
  if (workAddress) {
    drawRow('End. trabalho:', workAddress.substring(0, 50));
    drawRow('Cidade trab.:', `${profile.work_city || ''} - ${profile.work_state || ''}`, 'CEP:', profile.work_cep || '');
  }
  drawRow('Tempo trab.:', profile.work_time || '');

  // Footer notice
  y += 10;
  doc.setFillColor(255, 248, 220);
  doc.rect(margin, y, pageWidth - margin * 2, 10, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 80, 20);
  doc.text('É dever de todo Obreiro dar ciência à Loja de qualquer fato que possa impedir a admissão do candidato.', pageWidth / 2, y + 6, { align: 'center' });

  // Signatures
  y += 20;
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  const sigLineWidth = 65;
  
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + sigLineWidth, y);
  doc.line(pageWidth - margin - sigLineWidth, y, pageWidth - margin, y);
  
  y += 5;
  doc.setFontSize(9);
  doc.text('Candidato', margin + sigLineWidth / 2, y, { align: 'center' });
  doc.text('Secretário', pageWidth - margin - sigLineWidth / 2, y, { align: 'center' });

  // Footer with date
  y += 15;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Documento gerado em ${today}`, pageWidth / 2, y, { align: 'center' });

  // Save PDF
  doc.save(`Edital_${profile.full_name.replace(/\s+/g, '_')}.pdf`);
}
