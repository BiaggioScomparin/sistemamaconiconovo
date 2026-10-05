import jsPDF from 'jspdf';

interface ProfileData {
  id?: string;
  full_name: string;
  birth_date: string;
  naturality?: string | null;
  nationality?: string | null;
  state?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
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
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
}

interface EditalConfig {
  oriente?: string;
  endereco?: string;
  sessaoHora?: string;
  rito?: string;
  lodgeNumber?: string;
}

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
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
  const margin = 14;
  let y = 12;

  // Primary Colors
  const darkBlue = [15, 50, 90];
  const textColor = [30, 30, 30];

  // Try loading GOIB Logo
  const logoUrls = [
    `${window.location.origin}/images/logo-goib-edital.png`,
    `${window.location.origin}/src/assets/logo-goib.png`,
    '/images/logo-goib-edital.png'
  ];

  let logoData: string | null = null;
  for (const url of logoUrls) {
    logoData = await loadImage(url);
    if (logoData) break;
  }

  // Draw GOIB Logo centered or top-left
  const logoWidth = 26;
  const logoHeight = 26;
  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, y, logoWidth, logoHeight);
  }

  // Header Title Text
  const textLeftMargin = logoData ? margin + logoWidth + 4 : margin;
  const textHeaderWidth = logoData ? pageWidth - margin * 2 - logoWidth - 4 : pageWidth - margin * 2;
  const textCenterX = textLeftMargin + textHeaderWidth / 2;

  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('GRANDE ORIENTE INDEPENDENTE DO BRASIL', textCenterX, y + 6, { align: 'center' });

  // Lodge Info Subheader Lines
  doc.setFontSize(10.5);
  const lodgeName = lodge?.name || 'Lealdade e Justiça';
  const lodgeNum = config?.lodgeNumber ? `Nº ${config.lodgeNumber}` : 'Nº 001';
  const orienteCity = lodge?.city || config?.oriente || 'São Paulo';
  doc.text(`A∴R∴L∴S∴  ${lodgeName}    ${lodgeNum}  Oriente de ${orienteCity}`, textCenterX, y + 13, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  const lodgeAddressStr = config?.endereco || 
    [lodge?.street, lodge?.number, lodge?.neighborhood].filter(Boolean).join(', ') || 
    'Rua Paru 175 - TUCURUVI-SP';
  const stateStr = lodge?.state || config?.oriente || 'SP';
  doc.text(`Endereço: ${lodgeAddressStr}  UF ${stateStr}`, textCenterX, y + 19, { align: 'center' });

  const sessaoHora = config?.sessaoHora || '20:00';
  const rito = config?.rito || 'R∴E∴A';
  doc.text(`Sessões as ${sessaoHora}H            RITO ${rito}`, textCenterX, y + 25, { align: 'center' });

  y += 32;

  // Border separator
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  y += 8;

  // EDITAL Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text('EDITAL', pageWidth / 2, y, { align: 'center' });

  y += 7;

  // Declaration Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(
    'TORNAMOS PÚBLICO, que o Candidato abaixo assinado requereu nesta Loja sua ADMISSÃO',
    pageWidth / 2,
    y,
    { align: 'center' }
  );

  y += 8;

  // Photo Frame (Right side)
  const photoW = 32;
  const photoH = 42;
  const photoX = pageWidth - margin - photoW;
  const photoY = y;

  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.5);
  doc.rect(photoX, photoY, photoW, photoH);

  let candidatePhotoLoaded = false;
  if (profile.photo_url) {
    const pData = await loadImage(profile.photo_url);
    if (pData) {
      doc.addImage(pData, 'JPEG', photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1);
      candidatePhotoLoaded = true;
    }
  }

  if (!candidatePhotoLoaded) {
    doc.setFillColor(248, 248, 248);
    doc.rect(photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('FOTO 3x4', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
  }

  // Personal Data (Left of photo box)
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(9);

  const drawField = (label: string, val: string, startY: number, customMargin = margin) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, customMargin, startY);
    const labelWidth = doc.getTextWidth(label);
    doc.setFont('helvetica', 'normal');
    doc.text(` ${val || ''}`, customMargin + labelWidth, startY);
  };

  let curY = photoY + 4;
  drawField('Nome Completo do Candidato: ', profile.full_name || '', curY);

  curY += 6;
  drawField('Data de Nascimento do Candidato: ', formatDate(profile.birth_date), curY);

  curY += 6;
  drawField('Natural de: ', profile.naturality || 'São Paulo capital', curY);
  drawField('Nacionalidade: ', profile.nationality || 'brasileira', curY, margin + 95);

  curY += 6;
  const fullAddress = [profile.street, profile.number, profile.neighborhood, profile.city]
    .filter(Boolean)
    .join(', ');
  drawField('Endereço Atual: ', (fullAddress || 'Rua coronel Júlio Dino de Almeida 12').substring(0, 48), curY);
  drawField('Tempo: ', profile.residence_time || '', curY, margin + 115);

  curY += 6;
  drawField('Titulo De Eleitor: ', profile.voter_title || '', curY);

  curY += 6;
  drawField('RG: ', profile.identity_number || '', curY);
  drawField('CPF: ', profile.cpf || '', curY, margin + 60);

  y = photoY + photoH + 7;

  // Helper section header
  const drawSectionHeader = (title: string, sectionY: number) => {
    doc.setFillColor(240, 243, 248);
    doc.rect(margin, sectionY - 4, pageWidth - margin * 2, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
    doc.text(title, pageWidth / 2, sectionY, { align: 'center' });
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(9);
  };

  // DADOS FAMILIARES Section
  drawSectionHeader('DADOS FAMILIARES', y);
  y += 7;

  drawField('Nome do Pai: ', profile.father_name || '', y);
  y += 5.5;

  drawField('Nome da Mãe: ', profile.mother_name || '', y);
  y += 5.5;

  drawField('Nome da Esposa: ', profile.spouse_name || 'Não tem', y);
  if (profile.spouse_name) {
    drawField('Nascimento: ', formatDate(profile.marriage_date), y, margin + 110);
  }
  y += 5.5;

  // Children 1, 2, 3
  const child1 = children[0];
  const child2 = children[1];
  const child3 = children[2];

  drawField('Filho 1: ', child1 ? child1.name : (children.length === 0 ? 'Não tem' : ''), y);
  drawField('Nascimento: ', child1 ? formatDate(child1.birth_date) : '', y, margin + 110);
  y += 5.5;

  drawField('Filho 2: ', child2 ? child2.name : (children.length <= 1 ? 'Não tem' : ''), y);
  drawField('Nascimento: ', child2 ? formatDate(child2.birth_date) : '', y, margin + 110);
  y += 5.5;

  drawField('Filho 3: ', child3 ? child3.name : (children.length <= 2 ? 'Não tem' : ''), y);
  drawField('Nascimento: ', child3 ? formatDate(child3.birth_date) : '', y, margin + 110);
  y += 9;

  // DADOS PROFISSIONAIS Section
  drawSectionHeader('DADOS PROFISSIONAIS', y);
  y += 7;

  drawField('Profissão: ', profile.profession || '', y);
  drawField('Especialização: ', '', y, margin + 85);
  y += 5.5;

  drawField('Empregador: ', profile.employer || '', y);
  drawField('Aposentado?: ', profile.is_retired ? 'Sim' : 'Não', y, margin + 115);
  y += 5.5;

  const workAddrStr = [profile.work_street, profile.work_neighborhood, profile.work_city]
    .filter(Boolean)
    .join(', ');
  drawField('Endereço do Trabalho: ', workAddrStr.substring(0, 42), y);
  drawField('Data de Contratação: ', profile.work_time || '', y, margin + 105);

  y += 14;

  // Duty Statement Box / Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text(
    'É dever de todo Obreiro dar ciência à Loja de qualquer fato que possa impedir a admissão do candidato',
    pageWidth / 2,
    y,
    { align: 'center' }
  );

  y += 22;

  // Signatures
  const lineLength = 65;
  const leftSigX = margin + 10;
  const rightSigX = pageWidth - margin - 10 - lineLength;

  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.4);
  doc.line(leftSigX, y, leftSigX + lineLength, y);
  doc.line(rightSigX, y, rightSigX + lineLength, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Candidato', leftSigX + lineLength / 2, y, { align: 'center' });
  doc.text('Secretário', rightSigX + lineLength / 2, y, { align: 'center' });

  // Save PDF file
  const fileName = `Edital_${profile.full_name.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
