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

const getDegreeAbbrevEN = (degree: string | null) => {
  switch (degree) {
    case 'Aprendiz': return 'Entered Apprentice (A∴)';
    case 'Companheiro': return 'Fellowcraft (F∴C∴)';
    case 'Mestre': return 'Master Mason (M∴M∴)';
    case 'Mestre Instalado': return 'Installed Master (M∴I∴)';
    default: return 'Master Mason (M∴M∴)';
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

export async function generateSogliaBatchCardsPDF(
  members: MemberCardData[],
  logoGoibUrl: string,
  logoSogliaUrl: string,
  baseUrl: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (members.length === 0) return;

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
      const lodgeNameOnly = lodge ? lodge.name : '-';
      const orientCityOnly = lodge?.city || '-';
      const validationUrl = `${baseUrl}/validar/${member.id}`;
      const isActive = member.member_status === 'active';

      const qrCodeDataUrl = await generateQRCodeDataURL(validationUrl);

      // Create front SOGLIA HTML
      const frontHTML = `
        <div style="width: 428px; height: 270px; border-radius: 12px; overflow: hidden; position: relative; background: linear-gradient(135deg, #0b0f19 0%, #111827 50%, #030712 100%); border: 1px solid rgba(245, 158, 11, 0.4);">
          <div style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); opacity: 0.15;">
            <img src="${logoSogliaUrl}" style="height: 140px; width: 140px; object-fit: contain;" crossorigin="anonymous" />
          </div>
          <div style="height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 14px; color: white; position: relative; z-index: 10;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(245, 158, 11, 0.3); padding-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <img src="${logoGoibUrl}" style="height: 32px; width: 32px; object-fit: contain;" crossorigin="anonymous" />
                <div>
                  <h1 style="font-size: 11px; font-weight: bold; letter-spacing: 0.5px; color: #fbbf24; text-transform: uppercase; margin: 0; line-height: 1;">G.O.I.B.</h1>
                  <p style="font-size: 8px; color: #cbd5e1; margin: 0; font-weight: 500;">Grand Independent Orient of Brazil</p>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; text-align: right;">
                <div>
                  <h1 style="font-size: 11px; font-weight: bold; letter-spacing: 0.5px; color: #fbbf24; text-transform: uppercase; margin: 0; line-height: 1;">SOGLIA</h1>
                  <p style="font-size: 7px; color: #cbd5e1; margin: 0;">Society of Grand Lodges in Alliance</p>
                </div>
                <img src="${logoSogliaUrl}" style="height: 32px; width: 32px; object-fit: contain;" crossorigin="anonymous" />
              </div>
            </div>

            <div style="text-align: center; padding: 3px 0; background: rgba(245, 158, 11, 0.1); border-top: 1px solid rgba(245, 158, 11, 0.2); border-bottom: 1px solid rgba(245, 158, 11, 0.2); margin: 4px 0;">
              <span style="font-size: 10px; font-weight: bold; letter-spacing: 1.5px; color: #fcd34d; text-transform: uppercase;">
                INTERNATIONAL MASONIC IDENTITY CARD
              </span>
            </div>

            <div style="display: flex; align-items: center; gap: 12px; margin: auto 0;">
              <div style="display: flex; flex-direction: column; align-items: center;">
                <div style="width: 72px; height: 88px; border-radius: 6px; overflow: hidden; background: #0f172a; border: 2px solid rgba(251, 191, 36, 0.6);">
                  ${member.photo_url 
                    ? `<img src="${member.photo_url}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />`
                    : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(251, 191, 36, 0.6); font-size: 20px;">?</div>`
                  }
                </div>
                <p style="font-size: 9px; font-family: monospace; color: #fbbf24; font-weight: bold; margin: 4px 0 0 0;">CIM: ${member.cim_number || '-'}</p>
              </div>

              <div style="flex: 1; min-width: 0;">
                <div style="margin-bottom: 4px;">
                  <p style="font-size: 7px; text-transform: uppercase; color: #94a3b8; font-weight: 500; margin: 0;">Full Name</p>
                  <p style="font-size: 12px; font-weight: bold; color: white; margin: 0; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 2px;">${member.full_name}</p>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 4px;">
                  <div>
                    <p style="font-size: 7px; text-transform: uppercase; color: #94a3b8; font-weight: 500; margin: 0;">Masonic Rank</p>
                    <p style="font-size: 9px; font-weight: 600; color: #fcd34d; margin: 0;">${getDegreeAbbrevEN(member.degree)}</p>
                  </div>
                  <div>
                    <p style="font-size: 7px; text-transform: uppercase; color: #94a3b8; font-weight: 500; margin: 0;">Country</p>
                    <p style="font-size: 9px; font-weight: 600; color: #e2e8f0; margin: 0;">Brazil</p>
                  </div>
                </div>
                <div style="margin-bottom: 4px;">
                  <p style="font-size: 7px; text-transform: uppercase; color: #94a3b8; font-weight: 500; margin: 0;">Masonic Lodge</p>
                  <p style="font-size: 9px; font-weight: 600; color: #f8fafc; margin: 0;">${lodgeNameOnly}</p>
                </div>
                <div>
                  <p style="font-size: 7px; text-transform: uppercase; color: #94a3b8; font-weight: 500; margin: 0;">Orient (City)</p>
                  <p style="font-size: 9px; font-weight: 600; color: #fbbf24; margin: 0;">${orientCityOnly}</p>
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 7px; color: #94a3b8; border-top: 1px solid #1e293b; padding-top: 4px;">
              <span>Jurisdiction: <strong>BRA-GOIB-001</strong></span>
              <span style="color: #fbbf24; font-weight: 500;">Valid Worldwide</span>
            </div>
          </div>
        </div>
      `;

      // Create back SOGLIA HTML
      const backHTML = `
        <div style="width: 428px; height: 270px; border-radius: 12px; overflow: hidden; position: relative; background: linear-gradient(135deg, #0b0f19 0%, #111827 50%, #030712 100%); border: 1px solid rgba(245, 158, 11, 0.4);">
          <div style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); opacity: 0.1;">
            <img src="${logoSogliaUrl}" style="height: 160px; width: 160px; object-fit: contain;" crossorigin="anonymous" />
          </div>
          <div style="height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 14px; color: white; position: relative; z-index: 10;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px;">
              <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid #1e293b; border-radius: 4px; padding: 4px 6px;">
                <p style="font-size: 7px; color: #94a3b8; text-transform: uppercase; font-weight: 500; margin: 0;">Initiation Date</p>
                <p style="font-size: 10px; font-weight: bold; color: white; margin: 2px 0 0 0;">${formatDate(member.initiation_date)}</p>
              </div>
              <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid #1e293b; border-radius: 4px; padding: 4px 6px;">
                <p style="font-size: 7px; color: #94a3b8; text-transform: uppercase; font-weight: 500; margin: 0;">Date of Birth</p>
                <p style="font-size: 10px; font-weight: bold; color: white; margin: 2px 0 0 0;">${formatDate(member.birth_date)}</p>
              </div>
              <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid #1e293b; border-radius: 4px; padding: 4px 6px;">
                <p style="font-size: 7px; color: #94a3b8; text-transform: uppercase; font-weight: 500; margin: 0;">Status</p>
                <p style="font-size: 9px; font-weight: bold; color: ${isActive ? '#4ade80' : '#f87171'}; margin: 2px 0 0 0;">${isActive ? 'Active Member' : 'Inactive'}</p>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
              <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid #1e293b; border-radius: 4px; padding: 6px;">
                <p style="font-size: 7px; color: #94a3b8; text-transform: uppercase; font-weight: 500; margin: 0;">Lodge Office / Position</p>
                <p style="font-size: 10px; font-weight: 600; color: #fcd34d; margin: 2px 0 0 0;">${member.cargo || 'Master Mason'}</p>
              </div>
              <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid #1e293b; border-radius: 4px; padding: 6px;">
                <p style="font-size: 7px; color: #94a3b8; text-transform: uppercase; font-weight: 500; margin: 0;">Grand Orient</p>
                <p style="font-size: 10px; font-weight: 600; color: #e2e8f0; margin: 2px 0 0 0;">G.O.I.B. (Brazil)</p>
              </div>
            </div>

            <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 4px; padding: 6px; margin-bottom: 8px;">
              <p style="font-size: 7.5px; color: #cbd5e1; line-height: 1.3; font-style: italic; margin: 0;">
                "The holder of this international card is recognized as a regular Master Mason in good standing under the jurisdiction of the Grand Independent Orient of Brazil (G.O.I.B.), an allied member of SOGLIA."
              </p>
            </div>

            <div style="display: flex; align-items: flex-end; justify-content: space-between; border-top: 1px solid #1e293b; padding-top: 6px; margin-top: auto;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="background: white; padding: 3px; border-radius: 4px;">
                  ${qrCodeDataUrl 
                    ? `<img src="${qrCodeDataUrl}" style="width: 44px; height: 44px;" />`
                    : `<div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #666;">QR</div>`
                  }
                </div>
                <div>
                  <p style="font-size: 7px; color: #94a3b8; text-transform: uppercase; font-weight: 600; margin: 0;">Digital Verification</p>
                  <p style="font-size: 8px; color: #fbbf24; font-family: monospace; margin: 0;">Scan QR to verify credential</p>
                </div>
              </div>
              <div style="text-align: right; display: flex; align-items: center; gap: 8px;">
                <div>
                  <p style="font-size: 7px; color: #94a3b8; margin: 0;">Confederation Seal</p>
                  <p style="font-size: 9px; font-weight: bold; color: #fbbf24; text-transform: uppercase; letter-spacing: 1px; margin: 0;">SOGLIA INTERNATIONAL</p>
                </div>
                <img src="${logoSogliaUrl}" style="height: 24px; width: 24px; object-fit: contain;" crossorigin="anonymous" />
              </div>
            </div>
          </div>
        </div>
      `;

      // Render front
      container.innerHTML = frontHTML;
      await new Promise(r => setTimeout(r, 150));
      
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

    const date = new Date().toISOString().split('T')[0];
    pdf.save(`soglia-carteirinhas-${date}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
