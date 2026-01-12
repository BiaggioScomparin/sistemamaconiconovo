-- Adicionar coluna CPF na tabela profiles
ALTER TABLE public.profiles ADD COLUMN cpf TEXT;

-- Criar índice único para CPF (opcional, mas recomendado)
CREATE UNIQUE INDEX idx_profiles_cpf ON public.profiles(cpf) WHERE cpf IS NOT NULL;