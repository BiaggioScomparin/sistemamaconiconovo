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
              margin: 1.5cm 2cm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #000;
              background: #fff;
              position: relative;
            }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              opacity: 0.08;
              z-index: -1;
              width: 500px;
              height: 500px;
              pointer-events: none;
            }
            .header {
              text-align: center;
              margin-bottom: 25px;
              padding-bottom: 10px;
            }
            .header-line {
              font-size: 13pt;
              font-weight: normal;
              letter-spacing: 1px;
              margin-bottom: 20px;
            }
            .header h2 {
              font-size: 16pt;
              font-weight: bold;
              margin: 15px 0;
              text-decoration: underline;
            }
            .header h3 {
              font-size: 14pt;
              font-weight: bold;
              margin: 10px 0;
              text-decoration: underline;
            }
            .intro {
              text-align: justify;
              margin-bottom: 15px;
            }
            .section {
              margin-bottom: 20px;
            }
            .section-title {
              font-weight: bold;
              font-size: 12pt;
              margin-bottom: 8px;
              text-decoration: underline;
            }
            .officers-list {
              margin-bottom: 15px;
            }
            .officer-item {
              display: flex;
              margin-bottom: 3px;
            }
            .officer-label {
              font-weight: bold;
              min-width: 220px;
            }
            .officer-value {
            }
            .content-text {
              text-align: justify;
              margin-bottom: 10px;
            }
            .signatures-section {
              margin-top: 50px;
              page-break-inside: avoid;
            }
            .signature-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            .signature-table td {
              padding: 8px;
              border: 1px solid #000;
              vertical-align: middle;
            }
            .signature-table td:first-child {
              font-weight: bold;
              width: 25%;
            }
            .signature-table td:nth-child(2) {
              width: 50%;
              text-align: center;
              position: relative;
            }
            .signature-table td:nth-child(3) {
              width: 25%;
              text-align: center;
            }
            .seal-container {
              position: relative;
              display: inline-block;
            }
            .signature-seal {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-15deg);
              border: 3px solid #228B22;
              border-radius: 50%;
              width: 70px;
              height: 70px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: rgba(34, 139, 34, 0.1);
              font-size: 7pt;
              font-weight: bold;
              color: #228B22;
              text-align: center;
              line-height: 1.1;
            }
            .signature-seal-text {
              font-size: 8pt;
            }
            .signature-seal-check {
              font-size: 16pt;
              margin-bottom: 2px;
            }
            .signature-name {
              font-style: italic;
            }
            .closing-text {
              text-align: justify;
              margin-top: 20px;
            }
            .lavrei-text {
              text-align: justify;
              margin-top: 15px;
              margin-bottom: 30px;
            }
            @media print {
              body { 
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .watermark {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .signature-seal {
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

  const formatTime = (time: string | null) => {
    if (!time) return '________';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const formatTimeExtended = (time: string | null) => {
    if (!time) return '________ horas';
    const [hours, minutes] = time.split(':');
    const hoursNum = parseInt(hours);
    const hoursText = hoursNum === 1 ? 'uma hora' : 
      hoursNum === 2 ? 'duas horas' :
      hoursNum === 3 ? 'três horas' :
      hoursNum === 4 ? 'quatro horas' :
      hoursNum === 5 ? 'cinco horas' :
      hoursNum === 6 ? 'seis horas' :
      hoursNum === 7 ? 'sete horas' :
      hoursNum === 8 ? 'oito horas' :
      hoursNum === 9 ? 'nove horas' :
      hoursNum === 10 ? 'dez horas' :
      hoursNum === 11 ? 'onze horas' :
      hoursNum === 12 ? 'doze horas' :
      hoursNum === 13 ? 'treze horas' :
      hoursNum === 14 ? 'catorze horas' :
      hoursNum === 15 ? 'quinze horas' :
      hoursNum === 16 ? 'dezesseis horas' :
      hoursNum === 17 ? 'dezessete horas' :
      hoursNum === 18 ? 'dezoito horas' :
      hoursNum === 19 ? 'dezenove horas' :
      hoursNum === 20 ? 'vinte horas' :
      hoursNum === 21 ? 'vinte e uma horas' :
      hoursNum === 22 ? 'vinte e duas horas' :
      hoursNum === 23 ? 'vinte e três horas' :
      `${hoursNum} horas`;
    
    if (minutes && parseInt(minutes) > 0) {
      return `${hours}:${minutes} (${hoursText} e ${minutes} minutos)`;
    }
    return `${hours}:${minutes} (${hoursText})`;
  };

  const getSignatureForPosition = (position: string) => {
    // Check both display names and snake_case values
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

  return (
    <>
      <Button onClick={handlePrint} variant="outline" size="sm">
        <Printer className="h-4 w-4 mr-1" />
        Imprimir
      </Button>

      {/* Hidden print content */}
      <div id="minute-print-content" className="hidden">
        <div className="header">
          <p className="header-line">GRANDE ORIENTE INDEPENDENTE DO BRASIL – G∴O∴ I∴ B∴</p>
          <h2>Ata de Sessão {minute.session_type === 'ordinaria' ? 'Ordinária' : 'Magna'}</h2>
          <h3>Ata N.º {minute.session_number || '____'} – Sessão {minute.session_type === 'ordinaria' ? 'Ordinária' : 'Magna'}{minute.session_type === 'magna' ? ' de Iniciação' : ''}</h3>
        </div>

        <p className="intro">
          da A∴ R∴ L∴ S∴ <strong>{lodgeName || '________________________'}</strong>, realizada aos <strong>{day}</strong> dias do mês de <strong>{month}</strong> de <strong>{year}</strong>, da E∴ V∴ e <strong>{minute.masonic_year || '____'}</strong> V∴ L∴.
        </p>

        <p className="intro">
          Os trabalhos foram abertos em Sessão {minute.session_type === 'ordinaria' ? 'Ordinária' : 'Magna'}{minute.session_type === 'magna' ? ' de iniciação' : ''} com as exatas <strong>{formatTimeExtended(minute.opening_time)}</strong>.
        </p>

        <div className="section">
          <p className="section-title">A Loja estava assim constituída:</p>
          <div className="officers-list">
            <div className="officer-item">
              <span className="officer-label">Venerável Mestre:</span>
              <span className="officer-value">Ir∴ {minute.presiding_master || '________________________'}</span>
            </div>
            <div className="officer-item">
              <span className="officer-label">1º Vigilante:</span>
              <span className="officer-value">Ir∴ {minute.first_vigilant || '________________________'}</span>
            </div>
            <div className="officer-item">
              <span className="officer-label">2º Vigilante:</span>
              <span className="officer-value">Ir∴ {minute.second_vigilant || '________________________'}</span>
            </div>
            <div className="officer-item">
              <span className="officer-label">Orador:</span>
              <span className="officer-value">Ir∴ {minute.orator || '________________________'}</span>
            </div>
            <div className="officer-item">
              <span className="officer-label">Secretário:</span>
              <span className="officer-value">Ir∴ {minute.secretary || '________________________'}</span>
            </div>
            <div className="officer-item">
              <span className="officer-label">1º Diácono:</span>
              <span className="officer-value">Ir∴ {minute.first_deacon || '________________________'}</span>
            </div>
            <div className="officer-item">
              <span className="officer-label">2º Diácono:</span>
              <span className="officer-value">Ir∴ {minute.second_deacon || '________________________'}</span>
            </div>
            <div className="officer-item">
              <span className="officer-label">Chanceler:</span>
              <span className="officer-value">Ir∴ {minute.chancellor || '________________________'}</span>
            </div>
            <div className="officer-item">
              <span className="officer-label">Tesoureiro:</span>
              <span className="officer-value">Ir∴ {minute.treasurer || '________________________'}</span>
            </div>
            <div className="officer-item">
              <span className="officer-label">Cobridor Interno:</span>
              <span className="officer-value">Ir∴ {minute.inner_guard || '________________________'}</span>
            </div>
            <div className="officer-item">
              <span className="officer-label">Mestre de Cerimônias e Hospitaleiro:</span>
              <span className="officer-value">Ir∴ {minute.master_of_ceremonies || minute.hospitaller || '________________________'}</span>
            </div>
          </div>
        </div>

        {minute.members_present && (
          <div className="section">
            <div className="officer-item">
              <span className="officer-label">VV∴ IIr∴ Presentes:</span>
              <span className="officer-value">{minute.members_present}</span>
            </div>
          </div>
        )}

        {minute.visitors && (
          <div className="section">
            <div className="officer-item">
              <span className="officer-label">Visitantes:</span>
              <span className="officer-value">{minute.visitors}</span>
            </div>
          </div>
        )}

        {minute.beneficence_trunk && (
          <div className="section">
            <p className="section-title">Tronco de Beneficência:</p>
            <p className="content-text">{minute.beneficence_trunk}</p>
          </div>
        )}

        {minute.previous_minutes_reading && (
          <div className="section">
            <p className="section-title">Leitura da Ata Anterior:</p>
            <p className="content-text">{minute.previous_minutes_reading}</p>
          </div>
        )}

        {minute.expedient && (
          <div className="section">
            <p className="section-title">Expediente:</p>
            <p className="content-text">{minute.expedient}</p>
          </div>
        )}

        {minute.correspondence_read && (
          <div className="section">
            <p className="section-title">Correspondências Lidas:</p>
            <p className="content-text">{minute.correspondence_read}</p>
          </div>
        )}

        {minute.proposal_bag && (
          <div className="section">
            <p className="section-title">Saco de Propostas e Informações:</p>
            <p className="content-text">{minute.proposal_bag}</p>
          </div>
        )}

        {minute.order_of_the_day && (
          <div className="section">
            <p className="section-title">Ordem do Dia:</p>
            <p className="content-text">{minute.order_of_the_day}</p>
          </div>
        )}

        {minute.study_time && (
          <div className="section">
            <p className="section-title">Tempo de Estudos:</p>
            <p className="content-text">{minute.study_time}</p>
          </div>
        )}

        {minute.word_for_order && (
          <div className="section">
            <p className="section-title">Palavra Relativa ao Ato Constituído:</p>
            <p className="content-text">{minute.word_for_order}</p>
          </div>
        )}

        {minute.general_matters && (
          <div className="section">
            <p className="section-title">Assuntos Gerais:</p>
            <p className="content-text">{minute.general_matters}</p>
          </div>
        )}

        {minute.deliberations && (
          <div className="section">
            <p className="section-title">Deliberações:</p>
            <p className="content-text">{minute.deliberations}</p>
          </div>
        )}

        {minute.observations && (
          <div className="section">
            <p className="section-title">Observações:</p>
            <p className="content-text">{minute.observations}</p>
          </div>
        )}

        <div className="section">
          <p className="section-title">Encerramento da Sessão:</p>
          <p className="closing-text">
            O V∴M∴ encerrou a presente Sessão {minute.session_type === 'ordinaria' ? 'Ordinária' : 'Magna'} com a devida ritualística às <strong>{formatTimeExtended(minute.closing_time)}</strong>.
          </p>
        </div>

        <p className="lavrei-text">
          Eu, <strong>{minute.secretary || '________________________'}</strong>, Secretário da A∴ R∴ L∴ S∴ {lodgeName || '________________________'}, lavrei a presente ATA, que será assinada por direito após sua aprovação em Loja.
        </p>

        <div className="signatures-section">
          <table className="signature-table">
            <tbody>
              <tr>
                <td>Secretário:</td>
                <td>
                  <div className="seal-container">
                    <span className="signature-name">Ir∴ {minute.secretary || '________________________'}</span>
                    {secretarioSignature && (
                      <div className="signature-seal">
                        <span className="signature-seal-check">✓</span>
                        <span className="signature-seal-text">ASSINADO</span>
                        <span style={{ fontSize: '6pt' }}>{format(new Date(secretarioSignature.signed_at), 'dd/MM/yy')}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td></td>
              </tr>
              <tr>
                <td>V∴M∴:</td>
                <td>
                  <div className="seal-container">
                    <span className="signature-name">Ir∴ {minute.presiding_master || '________________________'}</span>
                    {vmSignature && (
                      <div className="signature-seal">
                        <span className="signature-seal-check">✓</span>
                        <span className="signature-seal-text">ASSINADO</span>
                        <span style={{ fontSize: '6pt' }}>{format(new Date(vmSignature.signed_at), 'dd/MM/yy')}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td></td>
              </tr>
              <tr>
                <td>Orador:</td>
                <td>
                  <div className="seal-container">
                    <span className="signature-name">Ir∴ {minute.orator || '________________________'}</span>
                    {oradorSignature && (
                      <div className="signature-seal">
                        <span className="signature-seal-check">✓</span>
                        <span className="signature-seal-text">ASSINADO</span>
                        <span style={{ fontSize: '6pt' }}>{format(new Date(oradorSignature.signed_at), 'dd/MM/yy')}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
