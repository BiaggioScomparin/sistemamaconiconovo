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
  photoUrl?: string | null;
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

const normalizeImageUrl = (rawUrl: string | null | undefined): string | null => {
  if (!rawUrl) return null;
  let url = rawUrl.trim();
  if (!url) return null;

  // Se já for base64 Data URL, retorna diretamente
  if (url.startsWith('data:')) return url;

  // Substitui domínios antigos/expirados pelo domínio ativo da VPS
  if (url.includes('banco.goib.com.br')) {
    url = url.replace('banco.goib.com.br', 'banco.goib.org');
  }

  // Se for caminho relativo do storage (ex: photos/... ou /storage/...)
  if (url.startsWith('photos/')) {
    url = `https://banco.goib.org/storage/v1/object/public/${url}`;
  } else if (url.startsWith('/storage/')) {
    url = `https://banco.goib.org${url}`;
  }

  return url;
};

/**
 * Converte qualquer imagem (URL remota, caminho relativo, blob ou base64)
 * em um Data URL JPEG padronizado (600x800, proporcao 3x4).
 * Suporta PNG, JPEG, WEBP, AVIF com total compatibilidade com jsPDF.
 */
const loadPhotoAsJpeg = async (rawUrl: string | null | undefined): Promise<string | null> => {
  if (!rawUrl) return null;
  const url = normalizeImageUrl(rawUrl);
  if (!url) return null;

  console.log('[EditalPDF] Iniciando loadPhotoAsJpeg para:', { rawUrl, normalized: url });

  // Ambiente nao-navegador (Node / SSR)
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    try {
      if (url.startsWith('data:')) return url;
      const resp = await fetch(url);
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        return 'data:image/jpeg;base64,' + Buffer.from(buf).toString('base64');
      }
    } catch {
      return null;
    }
    return null;
  }

  // Funcao utilitaria para renderizar uma Image em um Canvas 3x4 (600x800) e exportar como JPEG
  const renderImgToJpeg = (img: HTMLImageElement): string | null => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Fundo branco solido (essencial para fotos transparentes)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const srcW = img.naturalWidth || img.width || 600;
      const srcH = img.naturalHeight || img.height || 800;
      const targetRatio = 3 / 4;
      const srcRatio = srcW / srcH;

      let renderW = srcW;
      let renderH = srcH;
      let offsetX = 0;
      let offsetY = 0;

      if (srcRatio > targetRatio) {
        // Mais largo que 3x4: corta laterais proporcionalmente
        renderW = srcH * targetRatio;
        offsetX = (srcW - renderW) / 2;
      } else {
        // Mais alto que 3x4: corta topo e base proporcionalmente
        renderH = srcW / targetRatio;
        offsetY = (srcH - renderH) / 2;
      }

      ctx.drawImage(
        img,
        offsetX, offsetY, renderW, renderH,
        0, 0, canvas.width, canvas.height
      );

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      console.log('[EditalPDF] Canvas gerou JPEG com sucesso! Tamanho:', dataUrl.length);
      return dataUrl;
    } catch (e) {
      console.warn('[EditalPDF] Erro ao converter imagem em canvas JPEG:', e);
      return null;
    }
  };

  // 1. Se ja for data URL (ex: arquivo lido via FileReader no upload)
  if (url.startsWith('data:')) {
    console.log('[EditalPDF] Imagem ja e Data URL inline.');
    return new Promise((resolve) => {
      const img = new Image();
      // NUNCA colocar crossOrigin em data: URLs
      img.onload = () => resolve(renderImgToJpeg(img) || url);
      img.onerror = () => resolve(url);
      img.src = url;
    });
  }

  // 2. Para URLs remotas (ex: banco.goib.org ou supabase.co):
  // Adicionamos cache buster ?t=Date.now() para garantir bypass de cache stale do navegador e Cloudflare
  const cacheBuster = `t=${Date.now()}`;
  const fetchUrl = url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;

  try {
    console.log('[EditalPDF] Método 1: Fetch com CORS e cache buster:', fetchUrl);
    const resp = await fetch(fetchUrl, { mode: 'cors' });
    if (resp.ok) {
      const blob = await resp.blob();
      console.log('[EditalPDF] Fetch OK! Blob recebido:', blob.size, 'bytes, tipo:', blob.type);
      const rawDataUrl = await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = (e) => {
          console.warn('[EditalPDF] FileReader falhou:', e);
          resolve(null);
        };
        reader.readAsDataURL(blob);
      });

      if (rawDataUrl) {
        console.log('[EditalPDF] FileReader gerou Data URL raw, renderizando no Canvas...');
        const convertedJpeg = await new Promise<string | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(renderImgToJpeg(img));
          img.onerror = (e) => {
            console.warn('[EditalPDF] Image.onload falhou com Data URL:', e);
            resolve(null);
          };
          img.src = rawDataUrl;
        });

        if (convertedJpeg) return convertedJpeg;
        // Se a conversao em canvas falhou mas temos o rawDataUrl (ex: PNG), retorna o raw
        if (rawDataUrl.startsWith('data:image/jpeg') || rawDataUrl.startsWith('data:image/png')) {
          console.log('[EditalPDF] Usando rawDataUrl como fallback de imagem');
          return rawDataUrl;
        }
      }
    } else {
      console.warn('[EditalPDF] Fetch HTTP status não-OK:', resp.status);
    }
  } catch (err) {
    console.warn('[EditalPDF] Fetch direto falhou, tentando fallback via <img> com crossOrigin:', err);
  }

  // 3. Fallback: carregamento direto via HTMLImageElement com crossOrigin = 'anonymous' e cache buster
  console.log('[EditalPDF] Método 2: Fallback via HTMLImageElement com crossOrigin');
  return new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      console.warn('[EditalPDF] Timeout (8s) no fallback Image element');
      resolve(null);
    }, 8000);

    img.onload = () => {
      clearTimeout(timer);
      console.log('[EditalPDF] HTMLImageElement fallback carregado com sucesso!');
      resolve(renderImgToJpeg(img));
    };

    img.onerror = (e) => {
      clearTimeout(timer);
      console.warn('[EditalPDF] Fallback HTMLImageElement falhou:', e);
      resolve(null);
    };

    img.src = fetchUrl;
  });
};

const loadImage = async (rawUrl: string): Promise<string | null> => {
  const url = normalizeImageUrl(rawUrl);
  if (!url) return null;

  // Se for base64 Data URL, retorna imediatamente sem tentar fetch
  if (url.startsWith('data:')) {
    return url;
  }

  // 1. Tenta carregar via fetch + FileReader (modo padrão)
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      const base64 = await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
      if (base64) return base64;
    }
  } catch (err) {
    console.warn('Fetch direto da imagem falhou, tentando fallback Image/Canvas:', err);
  }

  // 2. Fallback resiliente via HTMLImageElement + Canvas (converte qualquer formato PNG/WEBP/JPEG com CORS)
  if (typeof document !== 'undefined') {
    try {
      const canvasBase64 = await new Promise<string | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width || 300;
            canvas.height = img.naturalHeight || img.height || 400;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(null);
              return;
            }
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.95));
          } catch (e) {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
      if (canvasBase64) return canvasBase64;
    } catch (err) {
      console.warn('Fallback via Canvas também falhou:', err);
    }
  }

  return null;
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

  // Draw GOIB Logo
  const logoWidth = 26;
  const logoHeight = 26;
  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, y, logoWidth, logoHeight);
  }

  // Header Text Positioning
  const textLeftMargin = logoData ? margin + logoWidth + 4 : margin;
  const textHeaderWidth = logoData ? pageWidth - margin * 2 - logoWidth - 4 : pageWidth - margin * 2;
  const textCenterX = textLeftMargin + textHeaderWidth / 2;

  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('GRANDE ORIENTE INDEPENDENTE DO BRASIL', textCenterX, y + 6, { align: 'center' });

  // Clean Lodge Name (remove prefix A.R.L.S. and duplicate lodge numbers if present)
  let rawLodgeName = lodge?.name || 'Lealdade e Justiça';
  let cleanLodgeName = rawLodgeName
    .replace(/^(A[∴\.]?R[∴\.]?L[∴\.]?S[∴\.]?)\s*/i, '')
    .replace(/\s*(N[ºo]?\s*)?\d+$/i, '')
    .trim();
  if (!cleanLodgeName) cleanLodgeName = 'Lealdade e Justiça';

  const lodgeNum = config?.lodgeNumber ? `Nº ${config.lodgeNumber}` : 'Nº 001';

  // Oriente City
  let orienteCity = config?.oriente || lodge?.city || 'São Paulo';
  if (orienteCity.toLowerCase().startsWith('rua') || orienteCity.toLowerCase().startsWith('av')) {
    orienteCity = 'São Paulo';
  }

  // Use clean A.R.L.S. ASCII representation to avoid jsPDF multibyte font tracking corruption
  doc.setFontSize(10.5);
  const line1Text = `A.R.L.S.  ${cleanLodgeName}    ${lodgeNum}  Oriente de ${orienteCity}`;
  doc.text(line1Text, textCenterX, y + 13, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  const lodgeAddressStr = config?.endereco || 
    [lodge?.street, lodge?.number, lodge?.neighborhood].filter(Boolean).join(' ') || 
    'Rua Paru 175 - TUCURUVI-SP';
  const stateStr = lodge?.state || 'SP';
  const line2Text = `Endereço: ${lodgeAddressStr}  UF ${stateStr}`;
  doc.text(line2Text, textCenterX, y + 19, { align: 'center' });

  const sessaoHora = config?.sessaoHora || '20:00';
  const ritoRaw = config?.rito || 'R.E.A';
  const ritoClean = ritoRaw.replace(/R[∴\.]E[∴\.]A/i, 'R.E.A');
  const line3Text = `Sessões as ${sessaoHora}H            RITO ${ritoClean}`;
  doc.text(line3Text, textCenterX, y + 25, { align: 'center' });

  y += 32;

  // Border separator line
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

  // Announcement Text
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
  const candidatePhotoUrl = config?.photoUrl || profile.photo_url;
  console.log('[EditalPDF] candidatePhotoUrl selecionado:', candidatePhotoUrl);

  if (candidatePhotoUrl) {
    const pData = await loadPhotoAsJpeg(candidatePhotoUrl);
    if (pData) {
      try {
        const imgFmt = pData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(pData, imgFmt, photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1);
        candidatePhotoLoaded = true;
        console.log('[EditalPDF] Foto inserida no PDF com sucesso! Formato:', imgFmt);
      } catch (err) {
        console.warn('[EditalPDF] Falha ao inserir imagem com formato explicitado, tentando autodetect:', err);
        try {
          doc.addImage(pData, '', photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1);
          candidatePhotoLoaded = true;
          console.log('[EditalPDF] Foto inserida no PDF com sucesso via autodetect!');
        } catch (err2) {
          console.error('[EditalPDF] Falha critica ao renderizar foto do candidato no PDF:', err2);
        }
      }
    } else {
      console.warn('[EditalPDF] loadPhotoAsJpeg não retornou dados para:', candidatePhotoUrl);
    }
  } else {
    console.warn('[EditalPDF] Nenhuma URL de foto informada (config.photoUrl nem profile.photo_url)');
  }

  if (!candidatePhotoLoaded) {
    console.warn('[EditalPDF] Renderizando quadro de FOTO 3x4 vazio no PDF');
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
