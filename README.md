# 🏛️ Sistema Maçônico — Gestão de Lojas Maçônicas

Sistema web moderno e completo para gestão de Lojas Maçônicas, cobrindo cadastro de membros, controle de presenças/frequência, atas de reuniões, propostas/votações, tesouraria/financeiro, biblioteca digital, onboarding e validação por QR Code.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend:** React 18 + TypeScript + Vite
* **Estilização:** Tailwind CSS + Radix UI (shadcn/ui) + Lucide Icons
* **Gerenciamento de Estado & Cache:** TanStack Query v5 (React Query)
* **Backend & Banco de Dados:** Supabase (PostgreSQL, Row Level Security, Storage, Auth)
* **Outros:** React Hook Form + Zod, Recharts, jsPDF, QRCode, date-fns

---

## 🚀 Como Executar o Projeto Localmente

### 1. Pré-requisitos
* Node.js 18+ e npm / pnpm / yarn

### 2. Instalação
```bash
# Clone o repositório
git clone https://github.com/BiaggioScomparin/sistemamaconico.git
cd sistemamaconico

# Instale as dependências
npm install
```

### 3. Configuração de Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com base no `.env.example`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica-anon-key
```

### 4. Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse a aplicação em `http://localhost:8080`.

---

## 🗄️ Banco de Dados (Supabase)

Todas as tabelas, funções, enums e políticas RLS estão versionadas na pasta `supabase/migrations/`. 

Para aplicar a estrutura em um novo projeto Supabase:
```bash
npx supabase db push
```

---

## 📦 Build para Produção

```bash
# Gerar a versão otimizada de produção
npm run build

# Testar o preview da build localmente
npm run preview
```
