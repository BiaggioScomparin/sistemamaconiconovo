// Types for the database
export type AppRole = 'admin' | 'member';

export type ProfileStatus = 'pending' | 'approved' | 'rejected';

export interface Lodge {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  created_at: string;
  updated_at: string;
}

export type MasonicDegree = 'Aprendiz' | 'Companheiro' | 'Mestre';

export interface Profile {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  cpf: string | null;
  birth_date: string;
  initiation_date: string | null;
  mother_name: string | null;
  spouse_name: string | null;
  cim_number: string | null;
  photo_url: string | null;
  lodge_id: string | null;
  lodge_position: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  status: ProfileStatus;
  degree: MasonicDegree | null;
  created_at: string;
  updated_at: string;
  lodge?: Lodge;
}

export interface Child {
  id: string;
  profile_id: string;
  name: string;
  birth_date: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}
