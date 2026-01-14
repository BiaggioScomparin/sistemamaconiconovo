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
              margin: 2cm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              line-height: 1.5;
              color: #000;
              background: #fff;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
            }
            .header h1 {
              font-size: 14pt;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .header h2 {
              font-size: 16pt;
              font-weight: bold;
              margin: 10px 0;
            }
            .header p {
              font-size: 11pt;
            }
            .intro {
              text-align: justify;
              margin-bottom: 20px;
              text-indent: 2em;
            }
            .section {
              margin-bottom: 15px;
            }
            .section-title {
              font-weight: bold;
              font-size: 12pt;
              margin-bottom: 8px;
              text-decoration: underline;
            }
            .officers-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .officers-table td {
              padding: 4px 8px;
              border: 1px solid #ccc;
              font-size: 11pt;
            }
            .officers-table td:first-child {
              font-weight: bold;
              width: 40%;
              background: #f5f5f5;
            }
            .content-box {
              border: 1px solid #ccc;
              padding: 10px;
              margin-bottom: 10px;
              min-height: 50px;
              text-align: justify;
            }
            .content-box.empty {
              color: #999;
              font-style: italic;
            }
            .signatures {
              margin-top: 40px;
              page-break-inside: avoid;
            }
            .signature-line {
              display: flex;
              justify-content: space-between;
              margin-top: 60px;
            }
            .signature-box {
              width: 30%;
              text-align: center;
            }
            .signature-box .line {
              border-top: 1px solid #000;
              padding-top: 5px;
              font-size: 11pt;
            }
            .signature-box .position {
              font-weight: bold;
              font-size: 10pt;
            }
            .signature-box .signed {
              font-size: 9pt;
              color: #666;
              margin-top: 3px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10pt;
              color: #666;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const formatTime = (time: string | null) => {
    if (!time) return '________';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const getSignatureForPosition = (position: string) => {
    return signatures.find(s => s.signer_position === position);
  };

  const sessionDateFormatted = format(new Date(minute.session_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const dayOfWeek = format(new Date(minute.session_date), 'EEEE', { locale: ptBR });

  return (
    <>
      <Button onClick={handlePrint} variant="outline" size="sm">
        <Printer className="h-4 w-4 mr-1" />
        Imprimir
      </Button>

      {/* Hidden print content */}
      <div id="minute-print-content" className="hidden">
        <div className="header">
          <h1>GRANDE ORIENTE INDEPENDENTE DO BRASIL</h1>
          <p>G.·.O.·.I.·.B.·.</p>
          <h2>Ata de Sessão {minute.session_type === 'ordinaria' ? 'Ordinária' : 'Magna'}</h2>
        </div>

        <p className="intro">
          Ata N.º <strong>{minute.session_number || '____'}</strong> da sessão {minute.session_type === 'ordinaria' ? 'ordinária' : 'magna'}, 
          da A.·.R.·.L.·.S.·. <strong>{lodgeName || '________________________'}</strong>, 
          realizada aos <strong>{sessionDateFormatted}</strong> ({dayOfWeek}) da E.·.V.·. 
          e <strong>{minute.masonic_year || '____'}</strong> V.·.L.·.
        </p>

        <p className="intro">
          Os Trabalhos foram abertos em sessão {minute.session_type === 'ordinaria' ? 'ordinária' : 'magna'} com as exatas <strong>{formatTime(minute.opening_time)}</strong> horas.
        </p>

        <div className="section">
          <p className="section-title">A Loja Estava Assim Constituída:</p>
          <table className="officers-table">
            <tbody>
              <tr><td>Venerável Mestre:</td><td>{minute.presiding_master || '________________________'}</td></tr>
              <tr><td>1º Vigilante Ir.·.:</td><td>{minute.first_vigilant || '________________________'}</td></tr>
              <tr><td>2º Vigilante Ir.·.:</td><td>{minute.second_vigilant || '________________________'}</td></tr>
              <tr><td>Orador Ir.·.:</td><td>{minute.orator || '________________________'}</td></tr>
              <tr><td>Secretário Ir.·.:</td><td>{minute.secretary || '________________________'}</td></tr>
              <tr><td>Tesoureiro Ir.·.:</td><td>{minute.treasurer || '________________________'}</td></tr>
              <tr><td>1º Diácono Ir.·.:</td><td>{minute.first_deacon || '________________________'}</td></tr>
              <tr><td>2º Diácono Ir.·.:</td><td>{minute.second_deacon || '________________________'}</td></tr>
              <tr><td>Chanceler Ir.·.:</td><td>{minute.chancellor || '________________________'}</td></tr>
              <tr><td>Mestre de Cerimônias Ir.·.:</td><td>{minute.master_of_ceremonies || '________________________'}</td></tr>
              <tr><td>Cobridor Interno Ir.·.:</td><td>{minute.inner_guard || '________________________'}</td></tr>
              <tr><td>Hospitaleiro Ir.·.:</td><td>{minute.hospitaller || '________________________'}</td></tr>
              <tr><td>Mestre de Harmonia Ir.·.:</td><td>{minute.master_of_harmony || '________________________'}</td></tr>
            </tbody>
          </table>
        </div>

        {(minute.members_present || minute.visitors) && (
          <div className="section">
            {minute.members_present && (
              <>
                <p className="section-title">Membros Presentes:</p>
                <div className="content-box">{minute.members_present}</div>
              </>
            )}
            {minute.visitors && (
              <>
                <p className="section-title">Visitantes:</p>
                <div className="content-box">{minute.visitors}</div>
              </>
            )}
          </div>
        )}

        <div className="section">
          <p className="section-title">Leitura da Ata:</p>
          <div className={`content-box ${!minute.previous_minutes_reading ? 'empty' : ''}`}>
            {minute.previous_minutes_reading || 'Sem registro'}
          </div>
        </div>

        <div className="section">
          <p className="section-title">Expediente:</p>
          <div className={`content-box ${!minute.expedient ? 'empty' : ''}`}>
            {minute.expedient || 'Sem registro'}
          </div>
        </div>

        <div className="section">
          <p className="section-title">Saco de Proposta e Informações:</p>
          <div className={`content-box ${!minute.proposal_bag ? 'empty' : ''}`}>
            {minute.proposal_bag || 'Sem registro'}
          </div>
        </div>

        <div className="section">
          <p className="section-title">Ordem do Dia:</p>
          <div className={`content-box ${!minute.order_of_the_day ? 'empty' : ''}`}>
            {minute.order_of_the_day || 'Sem registro'}
          </div>
        </div>

        <div className="section">
          <p className="section-title">Tempo de Estudos:</p>
          <div className={`content-box ${!minute.study_time ? 'empty' : ''}`}>
            {minute.study_time || 'Sem registro'}
          </div>
        </div>

        <div className="section">
          <p className="section-title">Tronco de Beneficência:</p>
          <div className={`content-box ${!minute.beneficence_trunk ? 'empty' : ''}`}>
            {minute.beneficence_trunk || 'Sem registro'}
          </div>
        </div>

        <div className="section">
          <p className="section-title">A Palavra a Bem da Ordem em Geral e do Quadro em Particular:</p>
          <div className={`content-box ${!minute.word_for_order ? 'empty' : ''}`}>
            {minute.word_for_order || 'Sem registro'}
          </div>
        </div>

        <div className="section">
          <p className="section-title">Encerramento da Sessão:</p>
          <p className="intro">
            O V.·.M.·. encerrou a presente sessão {minute.closing_ritual ? `com ${minute.closing_ritual}` : 'com ritualística'} às <strong>{formatTime(minute.closing_time)}</strong> horas.
          </p>
          <p className="intro">
            Eu, <strong>{minute.secretary || '________________________'}</strong>, lavrei a presente ATA, que será assinada por direito após sua aprovação em Loja.
          </p>
        </div>

        {minute.observations && (
          <div className="section">
            <p className="section-title">Observações:</p>
            <div className="content-box">{minute.observations}</div>
          </div>
        )}

        <div className="signatures">
          <div className="signature-line">
            <div className="signature-box">
              <div className="line">
                {minute.presiding_master || '________________________'}
              </div>
              <div className="position">V.·.M.·.</div>
              {getSignatureForPosition('Venerável Mestre') && (
                <div className="signed">
                  ✓ Assinado digitalmente em {format(new Date(getSignatureForPosition('Venerável Mestre')!.signed_at), 'dd/MM/yyyy HH:mm')}
                </div>
              )}
            </div>
            <div className="signature-box">
              <div className="line">
                {minute.orator || '________________________'}
              </div>
              <div className="position">Orador</div>
              {getSignatureForPosition('Orador') && (
                <div className="signed">
                  ✓ Assinado digitalmente em {format(new Date(getSignatureForPosition('Orador')!.signed_at), 'dd/MM/yyyy HH:mm')}
                </div>
              )}
            </div>
            <div className="signature-box">
              <div className="line">
                {minute.secretary || '________________________'}
              </div>
              <div className="position">Secretário</div>
              {getSignatureForPosition('Secretário') && (
                <div className="signed">
                  ✓ Assinado digitalmente em {format(new Date(getSignatureForPosition('Secretário')!.signed_at), 'dd/MM/yyyy HH:mm')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="footer">
          <p>Documento gerado pelo Sistema Maçônico - G.·.O.·.I.·.B.·.</p>
          {minute.status === 'signed' && <p><strong>✓ ATA ASSINADA DIGITALMENTE</strong></p>}
        </div>
      </div>
    </>
  );
}
