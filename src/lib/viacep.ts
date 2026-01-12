import { ViaCEPResponse } from './supabase-types';

export async function fetchAddressByCEP(cep: string): Promise<ViaCEPResponse | null> {
  const cleanCEP = cep.replace(/\D/g, '');
  
  if (cleanCEP.length !== 8) {
    return null;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    const data: ViaCEPResponse = await response.json();
    
    if (data.erro) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching address:', error);
    return null;
  }
}

export function formatCEP(cep: string): string {
  const clean = cep.replace(/\D/g, '');
  if (clean.length >= 5) {
    return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
  }
  return clean;
}
