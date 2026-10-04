import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

interface MemberCardData {
  id: string;
  full_name: string;
  photo_url: string | null;
  cim_number: string | null;
  degree: string | null;
  cargo: string | null;
  initiation_date: string | null;
  birth_date: string;
  member_status: string;
  lodges?: {
    name: string;
    city: string | null;
    state: string | null;
  } | null;
}

const getDegreeAbbrev = (degree: string | null) => {
  switch (degree) {
    case 'Aprendiz': return 'Apr∴';
    case 'Companheiro': return 'Comp∴';
    case 'Mestre': return 'M∴M∴';
    default: return 'Apr∴';
  }
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return '-';
  }
};

// Generate QR code as data URL
async function generateQRCodeDataURL(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 100,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
}

export async function generateBatchCardsPDF(
  members: MemberCardData[],
  logoUrl: string,
  baseUrl: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (members.length === 0) return;

  // Create a container for rendering cards
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  document.body.appendChild(container);

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85.6, 53.98], // Credit card size
  });

  let isFirstPage = true;

  try {
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      onProgress?.(i + 1, members.length);

      const lodge = member.lodges;
      const lodgeInfo = lodge ? lodge.name : '-';
      const orienteInfo = lodge?.city && lodge?.state 
        ? `${lodge.city} - ${lodge.state}` 
        : '-';
      const validationUrl = `${baseUrl}/validar/${member.id}`;
      const isActive = member.member_status === 'active';

      // Generate QR code for this member
      const qrCodeDataUrl = await generateQRCodeDataURL(validationUrl);

      // Create front card HTML
      const frontHTML = `
        <div style="width: 428px; height: 270px; border-radius: 12px; overflow: hidden; position: relative; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);">
          <div style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); opacity: 0.2;">
            <img src="${logoUrl}" style="height: 128px; width: 128px; object-fit: contain;" crossorigin="anonymous" />
          </div>
          <div style="height: 100%; display: flex; padding: 16px; color: white; position: relative; z-index: 10;">
            <div style="flex: 1; display: flex; flex-direction: column; padding-right: 16px;">
              <div style="margin-bottom: 16px;">
                <h1 style="font-size: 14px; letter-spacing: 0.5px; color: #fbbf24; text-transform: uppercase; font-weight: bold; margin: 0;">
                  Cédula de Identidade Maçônica
                </h1>
                <p style="font-size: 10px; color: rgba(251, 191, 36, 0.8); letter-spacing: 2px; margin: 0;">G.O.I.B</p>
              </div>
              <div style="flex: 1;">
                <div style="margin-bottom: 12px;">
                  <p style="font-size: 8px; color: rgba(255,255,255,0.5); text-transform: uppercase; margin: 0 0 2px 0;">Nome completo</p>
                  <div style="border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 4px;">
                    <p style="font-size: 12px; color: white; margin: 0;">${member.full_name}</p>
                  </div>
                </div>
                <div style="margin-bottom: 12px;">
                  <p style="font-size: 8px; color: rgba(255,255,255,0.5); text-transform: uppercase; margin: 0 0 2px 0;">Loja Maçônica</p>
                  <div style="border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 4px;">
                    <p style="font-size: 12px; color: white; margin: 0;">${lodgeInfo}</p>
                  </div>
                </div>
                <div>
                  <p style="font-size: 8px; color: rgba(255,255,255,0.5); text-transform: uppercase; margin: 0 0 2px 0;">Grau</p>
                  <div style="border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 4px;">
                    <p style="font-size: 12px; color: #fcd34d; margin: 0;">${getDegreeAbbrev(member.degree)}</p>
                  </div>
                </div>
              </div>
              <div style="margin-top: auto; padding-top: 8px;">
                <p style="font-size: 6px; color: rgba(255,255,255,0.4); line-height: 1.3; margin: 0;">
                  Este cartão é seu documento pessoal para inscrição<br/>nas programações do Oriente.
                </p>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 112px;">
              <div style="width: 96px; height: 112px; border-radius: 6px; overflow: hidden; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); margin-bottom: 8px;">
                ${member.photo_url 
                  ? `<img src="${member.photo_url}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />`
                  : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.4); font-size: 24px;">?</div>`
                }
              </div>
              <div style="text-align: center;">
                <p style="font-size: 8px; color: rgba(255,255,255,0.5); text-transform: uppercase; margin: 0;">CIM</p>
                <p style="font-size: 16px; color: #fbbf24; font-weight: bold; margin: 0;">${member.cim_number || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      `;

      // Create back card HTML with real QR code
      const backHTML = `
        <div style="width: 428px; height: 270px; border-radius: 12px; overflow: hidden; position: relative; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);">
          <div style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); opacity: 0.1;">
            <img src="${logoUrl}" style="height: 160px; width: 160px; object-fit: contain;" crossorigin="anonymous" />
          </div>
          <div style="height: 100%; display: flex; flex-direction: column; padding: 16px; color: white; position: relative; z-index: 10;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
              <div>
                <p style="font-size: 8px; color: rgba(255,255,255,0.5); text-transform: uppercase; margin: 0 0 2px 0;">Data de Iniciação</p>
                <div style="background: white; border-radius: 4px; padding: 4px 8px;">
                  <p style="font-size: 10px; color: black; margin: 0;">${formatDate(member.initiation_date)}</p>
                </div>
              </div>
              <div>
                <p style="font-size: 8px; color: rgba(255,255,255,0.5); text-transform: uppercase; margin: 0 0 2px 0;">Data de nascimento</p>
                <div style="background: white; border-radius: 4px; padding: 4px 8px;">
                  <p style="font-size: 10px; color: black; margin: 0;">${formatDate(member.birth_date)}</p>
                </div>
              </div>
              <div>
                <p style="font-size: 8px; color: rgba(255,255,255,0.5); text-transform: uppercase; margin: 0 0 2px 0;">Validade</p>
                <div style="background: white; border-radius: 4px; padding: 4px 8px;">
                  <p style="font-size: 7px; color: black; margin: 0; line-height: 1.3;">Válido enquanto<br/>membro ativo</p>
                </div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
              <div>
                <p style="font-size: 8px; color: rgba(255,255,255,0.5); text-transform: uppercase; margin: 0 0 2px 0;">Cargo</p>
                <div style="background: white; border-radius: 4px; padding: 4px 8px; min-height: 28px; display: flex; align-items: center;">
                  <p style="font-size: 10px; color: black; margin: 0;">${member.cargo || '-'}</p>
                </div>
              </div>
              <div>
                <p style="font-size: 8px; color: rgba(255,255,255,0.5); text-transform: uppercase; margin: 0 0 2px 0;">Oriente</p>
                <div style="background: white; border-radius: 4px; padding: 4px 8px; min-height: 28px; display: flex; align-items: center;">
                  <p style="font-size: 10px; color: black; margin: 0;">${orienteInfo}</p>
                </div>
              </div>
            </div>
            <div style="text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center;">
              <h2 style="font-size: 16px; color: #fbbf24; font-weight: bold; letter-spacing: 0.5px; margin: 0;">
                Grande Oriente Independente do Brasil
              </h2>
            </div>
            <div style="display: flex; align-items: flex-end; justify-content: space-between; margin-top: auto;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="background: white; padding: 4px; border-radius: 4px;">
                  ${qrCodeDataUrl 
                    ? `<img src="${qrCodeDataUrl}" style="width: 50px; height: 50px;" />`
                    : `<div style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #666;">QR</div>`
                  }
                </div>
                <div>
                  <p style="font-size: 6px; color: rgba(255,255,255,0.5); text-transform: uppercase; margin: 0;">Validação</p>
                  <p style="font-size: 8px; color: rgba(255,255,255,0.7); margin: 0;">Escaneie para verificar</p>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 4px; background: ${isActive ? '#16a34a' : '#dc2626'};">
                  <div style="width: 8px; height: 8px; border-radius: 50%; background: ${isActive ? '#86efac' : '#fca5a5'};"></div>
                  <span style="font-size: 8px; color: white; text-transform: uppercase;">
                    ${isActive ? 'Membro Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Render front
      container.innerHTML = frontHTML;
      await new Promise(r => setTimeout(r, 150)); // Wait for images to load
      
      const frontElement = container.firstElementChild as HTMLElement;
      const canvasFront = await html2canvas(frontElement, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
      });

      if (!isFirstPage) {
        pdf.addPage([85.6, 53.98], 'landscape');
      }
      const imgFront = canvasFront.toDataURL('image/png');
      pdf.addImage(imgFront, 'PNG', 0, 0, 85.6, 53.98);
      isFirstPage = false;

      // Render back
      container.innerHTML = backHTML;
      await new Promise(r => setTimeout(r, 150));
      
      const backElement = container.firstElementChild as HTMLElement;
      const canvasBack = await html2canvas(backElement, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
      });

      pdf.addPage([85.6, 53.98], 'landscape');
      const imgBack = canvasBack.toDataURL('image/png');
      pdf.addImage(imgBack, 'PNG', 0, 0, 85.6, 53.98);
    }

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    pdf.save(`carteirinhas-${date}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
