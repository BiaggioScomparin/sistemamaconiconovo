import * as XLSX from 'xlsx';

export interface MemberImportRow {
  full_name: string;
  email: string;
  cpf: string;
  birth_date: string;
  mother_name?: string;
  spouse_name?: string;
  initiation_date?: string;
  degree?: string;
  lodge_name?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  phone?: string;
  cell_phone?: string;
}

// Column mapping for Excel import
export const EXCEL_COLUMNS = {
  'Nome Completo': 'full_name',
  'E-mail': 'email',
  'CPF': 'cpf',
  'Data de Nascimento': 'birth_date',
  'Nome da Mãe': 'mother_name',
  'Nome do Cônjuge': 'spouse_name',
  'Data de Iniciação': 'initiation_date',
  'Grau': 'degree',
  'Nome da Loja': 'lodge_name',
  'CEP': 'cep',
  'Rua': 'street',
  'Número': 'number',
  'Complemento': 'complement',
  'Bairro': 'neighborhood',
  'Cidade': 'city',
  'Estado': 'state',
  'Telefone': 'phone',
  'Celular': 'cell_phone',
} as const;

// Generate and download Excel template
export function downloadMembersTemplate(): void {
  // Create sample data
  const sampleData = [
    {
      'Nome Completo': 'João da Silva',
      'E-mail': 'joao.silva@email.com',
      'CPF': '123.456.789-00',
      'Data de Nascimento': '1980-01-15',
      'Nome da Mãe': 'Maria da Silva',
      'Nome do Cônjuge': 'Ana da Silva',
      'Data de Iniciação': '2015-06-20',
      'Grau': 'Mestre',
      'Nome da Loja': 'Loja Exemplo',
      'CEP': '01310-100',
      'Rua': 'Av. Paulista',
      'Número': '1000',
      'Complemento': 'Apto 101',
      'Bairro': 'Bela Vista',
      'Cidade': 'São Paulo',
      'Estado': 'SP',
      'Telefone': '(11) 3333-4444',
      'Celular': '(11) 99999-8888',
    },
    {
      'Nome Completo': 'Pedro Santos',
      'E-mail': 'pedro.santos@email.com',
      'CPF': '987.654.321-00',
      'Data de Nascimento': '1975-05-22',
      'Nome da Mãe': 'Joana Santos',
      'Nome do Cônjuge': '',
      'Data de Iniciação': '2020-03-10',
      'Grau': 'Aprendiz',
      'Nome da Loja': 'Loja Exemplo',
      'CEP': '04538-132',
      'Rua': 'Rua Funchal',
      'Número': '500',
      'Complemento': '',
      'Bairro': 'Vila Olímpia',
      'Cidade': 'São Paulo',
      'Estado': 'SP',
      'Telefone': '',
      'Celular': '(11) 98888-7777',
    },
  ];

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths
  const columnWidths = [
    { wch: 25 }, // Nome Completo
    { wch: 25 }, // E-mail
    { wch: 15 }, // CPF
    { wch: 15 }, // Data de Nascimento
    { wch: 20 }, // Nome da Mãe
    { wch: 20 }, // Nome do Cônjuge
    { wch: 15 }, // Data de Iniciação
    { wch: 12 }, // Grau
    { wch: 20 }, // Nome da Loja
    { wch: 12 }, // CEP
    { wch: 30 }, // Rua
    { wch: 10 }, // Número
    { wch: 15 }, // Complemento
    { wch: 15 }, // Bairro
    { wch: 15 }, // Cidade
    { wch: 8 },  // Estado
    { wch: 15 }, // Telefone
    { wch: 15 }, // Celular
  ];
  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Membros');

  // Create instructions sheet
  const instructions = [
    { 'Instruções': 'MODELO DE IMPORTAÇÃO DE MEMBROS' },
    { 'Instruções': '' },
    { 'Instruções': 'Campos obrigatórios: Nome Completo, E-mail, CPF, Data de Nascimento' },
    { 'Instruções': '' },
    { 'Instruções': 'Formato de datas: AAAA-MM-DD (ex: 1980-01-15)' },
    { 'Instruções': 'Formato de CPF: 000.000.000-00' },
    { 'Instruções': '' },
    { 'Instruções': 'Graus válidos: Aprendiz, Companheiro, Mestre, Mestre Instalado' },
    { 'Instruções': '' },
    { 'Instruções': 'O Nome da Loja deve corresponder exatamente ao nome cadastrado no sistema.' },
    { 'Instruções': 'Se a loja não existir, o membro será importado sem loja associada.' },
    { 'Instruções': '' },
    { 'Instruções': 'Apague as linhas de exemplo antes de preencher seus dados.' },
  ];
  const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
  instructionsSheet['!cols'] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instruções');

  // Download file
  XLSX.writeFile(workbook, 'modelo_importacao_membros.xlsx');
}

// Parse Excel file and return member data
export async function parseExcelMembers(file: File): Promise<MemberImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get first sheet (Membros)
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
        
        // Map columns to our format
        const members: MemberImportRow[] = jsonData.map((row) => {
          const member: Record<string, any> = {};
          
          for (const [excelCol, dbCol] of Object.entries(EXCEL_COLUMNS)) {
            if (row[excelCol] !== undefined && row[excelCol] !== '') {
              let value = row[excelCol];
              
              // Handle date fields
              if ((dbCol === 'birth_date' || dbCol === 'initiation_date') && value) {
                // If it's a number (Excel date serial), convert it
                if (typeof value === 'number') {
                  const date = XLSX.SSF.parse_date_code(value);
                  value = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
                }
              }
              
              member[dbCol] = String(value).trim();
            }
          }
          
          return member as MemberImportRow;
        });
        
        // Filter out empty rows and validate required fields
        const validMembers = members.filter(m => 
          m.full_name && m.email && m.cpf && m.birth_date
        );
        
        resolve(validMembers);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsBinaryString(file);
  });
}

// Validate member data before import
export function validateMemberData(member: MemberImportRow): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!member.full_name || member.full_name.length < 3) {
    errors.push('Nome completo é obrigatório (mínimo 3 caracteres)');
  }
  
  if (!member.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
    errors.push('E-mail inválido');
  }
  
  if (!member.cpf || member.cpf.replace(/\D/g, '').length !== 11) {
    errors.push('CPF inválido');
  }
  
  if (!member.birth_date || !/^\d{4}-\d{2}-\d{2}$/.test(member.birth_date)) {
    errors.push('Data de nascimento inválida (use formato AAAA-MM-DD)');
  }
  
  if (member.initiation_date && !/^\d{4}-\d{2}-\d{2}$/.test(member.initiation_date)) {
    errors.push('Data de iniciação inválida (use formato AAAA-MM-DD)');
  }
  
  if (member.degree && !['Aprendiz', 'Companheiro', 'Mestre', 'Mestre Instalado'].includes(member.degree)) {
    errors.push('Grau inválido (use: Aprendiz, Companheiro, Mestre ou Mestre Instalado)');
  }
  
  return { valid: errors.length === 0, errors };
}
