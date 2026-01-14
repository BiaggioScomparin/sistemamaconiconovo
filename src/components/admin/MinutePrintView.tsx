import { SessionMinute, MinuteSignature } from '@/hooks/useSessionMinutes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface MinutePrintViewProps {
  minute: SessionMinute;
  signatures: MinuteSignature[];
  lodgeName?: string;
}

export function MinutePrintView({ minute, signatures, lodgeName }: MinutePrintViewProps) {
  const handlePrint = () => {
    const printContent = document.getElementById('minute-print-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ata de Sessão ${minute.session_type === 'ordinaria' ? 'Ordinária' : 'Magna'} - ${format(new Date(minute.session_date), 'dd/MM/yyyy')}</title>
          <style>
            @page {
              size: A4;
              margin: 2cm 2.5cm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Georgia', 'Times New Roman', Times, serif;
              font-size: 11pt;
              line-height: 1.8;
              color: #1a1a1a;
              background: #fff;
              position: relative;
            }
            
            /* Watermark */
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              opacity: 0.06;
              z-index: -1;
              width: 450px;
              height: 450px;
              pointer-events: none;
            }
            
            /* Header */
            .document-header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px double #333;
            }
            .org-name {
              font-size: 14pt;
              font-weight: bold;
              letter-spacing: 2px;
              text-transform: uppercase;
              margin-bottom: 5px;
              color: #1a1a1a;
            }
            .org-abbreviation {
              font-size: 11pt;
              letter-spacing: 3px;
              color: #444;
              margin-bottom: 25px;
            }
            .document-title {
              font-size: 18pt;
              font-weight: bold;
              margin: 20px 0 10px;
              letter-spacing: 1px;
            }
            .document-subtitle {
              font-size: 13pt;
              font-weight: bold;
              font-style: italic;
              margin: 10px 0;
              color: #333;
            }
            
            /* Content */
            .content-wrapper {
              padding: 0 10px;
            }
            .paragraph {
              text-align: justify;
              text-indent: 2em;
              margin-bottom: 18px;
              hyphens: auto;
            }
            .paragraph strong {
              font-weight: 600;
            }
            
            /* Officers Section */
            .officers-section {
              margin: 25px 0;
              padding: 15px 20px;
              background: linear-gradient(to right, #fafafa, #fff, #fafafa);
              border-left: 3px solid #333;
            }
            .officers-title {
              font-size: 12pt;
              font-weight: bold;
              margin-bottom: 15px;
              text-decoration: underline;
              text-underline-offset: 3px;
            }
            .officers-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 30px;
            }
            .officer-row {
              display: flex;
              align-items: baseline;
            }
            .officer-title {
              font-weight: 600;
              min-width: 180px;
              color: #333;
            }
            .officer-name {
              flex: 1;
            }
            .officer-row.full-width {
              grid-column: 1 / -1;
            }
            
            /* Sections */
            .section {
              margin: 20px 0;
            }
            .section-header {
              font-size: 11pt;
              font-weight: bold;
              margin-bottom: 8px;
              padding-bottom: 3px;
              border-bottom: 1px solid #ccc;
              color: #222;
            }
            .section-content {
              text-align: justify;
              padding-left: 15px;
              color: #333;
            }
            
            /* Presence Section */
            .presence-section {
              margin: 20px 0;
              padding: 12px 15px;
              background: #f8f8f8;
              border-radius: 3px;
            }
            .presence-label {
              font-weight: bold;
              margin-right: 10px;
            }
            
            /* Closing */
            .closing-section {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
            .closing-text {
              text-align: justify;
              text-indent: 2em;
              margin-bottom: 15px;
            }
            .secretary-statement {
              text-align: justify;
              text-indent: 2em;
              margin: 25px 0;
              font-style: italic;
              padding: 15px;
              background: #fafafa;
              border-left: 3px solid #666;
            }
            
            /* Signatures */
            .signatures-container {
              margin-top: 50px;
              page-break-inside: avoid;
            }
            .signatures-title {
              text-align: center;
              font-size: 10pt;
              font-weight: bold;
              margin-bottom: 25px;
              letter-spacing: 1px;
              text-transform: uppercase;
              color: #555;
            }
            .signatures-grid {
              display: flex;
              justify-content: space-around;
              gap: 20px;
            }
            .signature-block {
              text-align: center;
              width: 200px;
              position: relative;
            }
            .signature-line {
              border-top: 1px solid #333;
              margin-top: 50px;
              padding-top: 8px;
            }
            .signature-name {
              font-weight: 600;
              font-size: 10pt;
              margin-bottom: 3px;
            }
            .signature-position {
              font-size: 9pt;
              color: #555;
              font-style: italic;
            }
            
            /* Seal */
            .signature-seal {
              position: absolute;
              top: 0;
              left: 50%;
              transform: translateX(-50%) rotate(-12deg);
              width: 80px;
              height: 80px;
              border: 3px solid #006400;
              border-radius: 50%;
              background: radial-gradient(circle, rgba(0,100,0,0.08) 0%, rgba(0,100,0,0.15) 100%);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              box-shadow: 0 0 0 2px rgba(0,100,0,0.1), inset 0 0 10px rgba(0,100,0,0.05);
            }
            .seal-check {
              font-size: 20pt;
              color: #006400;
              font-weight: bold;
              line-height: 1;
            }
            .seal-text {
              font-size: 7pt;
              font-weight: bold;
              color: #006400;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .seal-date {
              font-size: 6pt;
              color: #006400;
              margin-top: 2px;
            }
            
            /* Footer */
            .document-footer {
              margin-top: 40px;
              padding-top: 15px;
              border-top: 2px double #333;
              text-align: center;
              font-size: 9pt;
              color: #666;
            }
            .footer-badge {
              display: inline-block;
              margin-top: 10px;
              padding: 5px 20px;
              background: #006400;
              color: white;
              font-weight: bold;
              font-size: 8pt;
              letter-spacing: 1px;
              text-transform: uppercase;
              border-radius: 3px;
            }
            
            @media print {
              body { 
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .watermark,
              .signature-seal,
              .footer-badge,
              .officers-section {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>
          <img src="/images/logo-goib-watermark.png" class="watermark" alt="" />
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

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

  const sessionDate = new Date(minute.session_date);
  const day = format(sessionDate, 'd', { locale: ptBR });
  const month = format(sessionDate, 'MMMM', { locale: ptBR });
  const year = format(sessionDate, 'yyyy', { locale: ptBR });

  const vmSignature = getSignatureForPosition('veneravel_mestre');
  const oradorSignature = getSignatureForPosition('orador');
  const secretarioSignature = getSignatureForPosition('secretario');

  const sessionTypeName = minute.session_type === 'ordinaria' ? 'Ordinária' : 'Magna';

  return (
    <>
      <Button onClick={handlePrint} variant="outline" size="sm">
        <Printer className="h-4 w-4 mr-1" />
        Imprimir
      </Button>

      {/* Hidden print content */}
      <div id="minute-print-content" className="hidden">
        <div className="document-header">
          <p className="org-name">Grande Oriente Independente do Brasil</p>
          <p className="org-abbreviation">G∴O∴I∴B∴</p>
          <h1 className="document-title">Ata de Sessão {sessionTypeName}</h1>
          <p className="document-subtitle">
            Ata N.º {minute.session_number || '____'} — Sessão {sessionTypeName}
            {minute.session_type === 'magna' ? ' de Iniciação' : ''}
          </p>
        </div>

        <div className="content-wrapper">
          <p className="paragraph">
            Ata da sessão {sessionTypeName.toLowerCase()} da <strong>A∴R∴L∴S∴ {lodgeName || '________________________'}</strong>, 
            realizada aos <strong>{day}</strong> dias do mês de <strong>{month}</strong> do ano de <strong>{year}</strong> da Era Vulgar, 
            correspondente ao ano de <strong>{minute.masonic_year || '____'}</strong> da Verdadeira Luz.
          </p>

          <p className="paragraph">
            Os trabalhos foram abertos em Sessão {sessionTypeName}
            {minute.session_type === 'magna' ? ' de Iniciação' : ''} com as exatas <strong>{formatTimeExtended(minute.opening_time)}</strong>.
          </p>

          <div className="officers-section">
            <p className="officers-title">A Loja estava assim constituída:</p>
            <div className="officers-grid">
              <div className="officer-row">
                <span className="officer-title">Venerável Mestre:</span>
                <span className="officer-name">Ir∴ {minute.presiding_master || '—'}</span>
              </div>
              <div className="officer-row">
                <span className="officer-title">Orador:</span>
                <span className="officer-name">Ir∴ {minute.orator || '—'}</span>
              </div>
              <div className="officer-row">
                <span className="officer-title">1º Vigilante:</span>
                <span className="officer-name">Ir∴ {minute.first_vigilant || '—'}</span>
              </div>
              <div className="officer-row">
                <span className="officer-title">Secretário:</span>
                <span className="officer-name">Ir∴ {minute.secretary || '—'}</span>
              </div>
              <div className="officer-row">
                <span className="officer-title">2º Vigilante:</span>
                <span className="officer-name">Ir∴ {minute.second_vigilant || '—'}</span>
              </div>
              <div className="officer-row">
                <span className="officer-title">Tesoureiro:</span>
                <span className="officer-name">Ir∴ {minute.treasurer || '—'}</span>
              </div>
              <div className="officer-row">
                <span className="officer-title">1º Diácono:</span>
                <span className="officer-name">Ir∴ {minute.first_deacon || '—'}</span>
              </div>
              <div className="officer-row">
                <span className="officer-title">Chanceler:</span>
                <span className="officer-name">Ir∴ {minute.chancellor || '—'}</span>
              </div>
              <div className="officer-row">
                <span className="officer-title">2º Diácono:</span>
                <span className="officer-name">Ir∴ {minute.second_deacon || '—'}</span>
              </div>
              <div className="officer-row">
                <span className="officer-title">Cobridor Interno:</span>
                <span className="officer-name">Ir∴ {minute.inner_guard || '—'}</span>
              </div>
              <div className="officer-row">
                <span className="officer-title">M∴ de Cerimônias:</span>
                <span className="officer-name">Ir∴ {minute.master_of_ceremonies || '—'}</span>
              </div>
              <div className="officer-row">
                <span className="officer-title">Hospitaleiro:</span>
                <span className="officer-name">Ir∴ {minute.hospitaller || '—'}</span>
              </div>
            </div>
          </div>

          {minute.members_present && (
            <div className="presence-section">
              <span className="presence-label">VV∴ IIr∴ Presentes:</span>
              <span>{minute.members_present}</span>
            </div>
          )}

          {minute.visitors && (
            <div className="presence-section">
              <span className="presence-label">Visitantes:</span>
              <span>{minute.visitors}</span>
            </div>
          )}

          {minute.previous_minutes_reading && (
            <div className="section">
              <p className="section-header">Leitura da Ata Anterior</p>
              <p className="section-content">{minute.previous_minutes_reading}</p>
            </div>
          )}

          {minute.expedient && (
            <div className="section">
              <p className="section-header">Expediente</p>
              <p className="section-content">{minute.expedient}</p>
            </div>
          )}

          {minute.correspondence_read && (
            <div className="section">
              <p className="section-header">Correspondências Lidas</p>
              <p className="section-content">{minute.correspondence_read}</p>
            </div>
          )}

          {minute.proposal_bag && (
            <div className="section">
              <p className="section-header">Saco de Propostas e Informações</p>
              <p className="section-content">{minute.proposal_bag}</p>
            </div>
          )}

          {minute.order_of_the_day && (
            <div className="section">
              <p className="section-header">Ordem do Dia</p>
              <p className="section-content">{minute.order_of_the_day}</p>
            </div>
          )}

          {minute.study_time && (
            <div className="section">
              <p className="section-header">Tempo de Estudos</p>
              <p className="section-content">{minute.study_time}</p>
            </div>
          )}

          {minute.beneficence_trunk && (
            <div className="section">
              <p className="section-header">Tronco de Beneficência</p>
              <p className="section-content">{minute.beneficence_trunk}</p>
            </div>
          )}

          {minute.word_for_order && (
            <div className="section">
              <p className="section-header">Palavra a Bem da Ordem em Geral e do Quadro em Particular</p>
              <p className="section-content">{minute.word_for_order}</p>
            </div>
          )}

          {minute.general_matters && (
            <div className="section">
              <p className="section-header">Assuntos Gerais</p>
              <p className="section-content">{minute.general_matters}</p>
            </div>
          )}

          {minute.deliberations && (
            <div className="section">
              <p className="section-header">Deliberações</p>
              <p className="section-content">{minute.deliberations}</p>
            </div>
          )}

          {minute.observations && (
            <div className="section">
              <p className="section-header">Observações</p>
              <p className="section-content">{minute.observations}</p>
            </div>
          )}

          <div className="closing-section">
            <p className="closing-text">
              O Venerável Mestre encerrou a presente Sessão {sessionTypeName} com a devida ritualística 
              às <strong>{formatTimeExtended(minute.closing_time)}</strong>.
            </p>
            
            <p className="secretary-statement">
              Eu, <strong>{minute.secretary || '________________________'}</strong>, Secretário da 
              A∴R∴L∴S∴ {lodgeName || '________________________'}, lavrei a presente Ata, 
              que será assinada por direito após sua aprovação em Loja.
            </p>
          </div>

          <div className="signatures-container">
            <p className="signatures-title">Assinaturas</p>
            <div className="signatures-grid">
              <div className="signature-block">
                {vmSignature && (
                  <div className="signature-seal">
                    <span className="seal-check">✓</span>
                    <span className="seal-text">Assinado</span>
                    <span className="seal-date">{format(new Date(vmSignature.signed_at), 'dd/MM/yyyy')}</span>
                  </div>
                )}
                <div className="signature-line">
                  <p className="signature-name">Ir∴ {minute.presiding_master || '________________________'}</p>
                  <p className="signature-position">Venerável Mestre</p>
                </div>
              </div>
              
              <div className="signature-block">
                {oradorSignature && (
                  <div className="signature-seal">
                    <span className="seal-check">✓</span>
                    <span className="seal-text">Assinado</span>
                    <span className="seal-date">{format(new Date(oradorSignature.signed_at), 'dd/MM/yyyy')}</span>
                  </div>
                )}
                <div className="signature-line">
                  <p className="signature-name">Ir∴ {minute.orator || '________________________'}</p>
                  <p className="signature-position">Orador</p>
                </div>
              </div>
              
              <div className="signature-block">
                {secretarioSignature && (
                  <div className="signature-seal">
                    <span className="seal-check">✓</span>
                    <span className="seal-text">Assinado</span>
                    <span className="seal-date">{format(new Date(secretarioSignature.signed_at), 'dd/MM/yyyy')}</span>
                  </div>
                )}
                <div className="signature-line">
                  <p className="signature-name">Ir∴ {minute.secretary || '________________________'}</p>
                  <p className="signature-position">Secretário</p>
                </div>
              </div>
            </div>
          </div>

          <div className="document-footer">
            <p>Documento gerado pelo Sistema de Gestão Maçônica — G∴O∴I∴B∴</p>
            {minute.status === 'signed' && (
              <span className="footer-badge">✓ Ata Assinada Digitalmente</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
