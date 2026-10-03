# 🐳 Guia de Deploy do Banco de Dados e Supabase na VPS

Este guia passo a passo ensina como hospedar a base de dados do **Sistema Maçônico** na sua própria **VPS** (Ubuntu/Debian, DigitalOcean, Hetzner, AWS, Contabo, etc.) utilizando **Docker Compose**.

---

## 🏗️ O que é o Supabase Self-Hosted na VPS?

Ao hospedar o Supabase na sua própria VPS:
1. Você tem **zero custos recorrentes por uso** além da mensalidade fixa da sua VPS.
2. Mantém **100% de compatibilidade** com o código do frontend (`@supabase/supabase-js`).
3. Tem controle total sobre o **PostgreSQL**, backups, usuários e segurança.

---

## 📋 Passo a Passo para Instalação na VPS

### 1. Acessar a VPS e Instalar Docker & Docker Compose
Conecte-se via SSH na sua VPS:
```bash
ssh root@seu-ip-da-vps
```

Instale o Docker e o Docker Compose (Ubuntu/Debian):
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

---

### 2. Baixar o Supabase Self-Hosted Oficial

```bash
# Clone o repositório oficial do Supabase Docker
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker

# Copie o arquivo de variáveis de ambiente
cp .env.example .env
```

---

### 3. Configurar Senhas e Chaves no `.env` da VPS

Abra o arquivo `.env`:
```bash
nano .env
```
Altere principalmente:
* `POSTGRES_PASSWORD`: Defina uma senha forte para o banco PostgreSQL.
* `JWT_SECRET`: Defina um segredo aleatório de no mínimo 32 caracteres.
* `ANON_KEY` e `SERVICE_ROLE_KEY`: Gerados a partir do `JWT_SECRET` (o próprio Supabase disponibiliza utilitário ou você pode usar chaves padrão de dev).

---

### 4. Subir os Serviços com Docker Compose

```bash
docker compose up -d
```
Após alguns instantes, o Supabase estará rodando na sua VPS:
* **API do Supabase (Kong Gateway):** `http://SEU_IP_DA_VPS:8000`
* **Painel de Controle Studio (Dashboard Web):** `http://SEU_IP_DA_VPS:8000` (ou na porta 3000 conforme `.env`).

---

### 5. Importar o Banco de Dados (`schema_consolidado.sql`)

Transfira o arquivo `schema_consolidado.sql` para a VPS (ou copie seu conteúdo):
```bash
# Executar a importação direta no container do PostgreSQL
docker exec -i supabase-db psql -U postgres -d postgres < schema_consolidado.sql
```

---

### 6. Atualizar as Variáveis de Ambiente no Frontend

No arquivo `.env` da sua aplicação web:

```env
VITE_SUPABASE_URL=http://SEU_IP_DA_VPS:8000
VITE_SUPABASE_PUBLISHABLE_KEY=sua-anon-key-configurada-na-vps
```

---

## 🔒 7. Recomendação para Produção (HTTPS com Nginx + Let's Encrypt)

Para rodar em ambiente de produção seguro com certificado SSL gratuito:
1. Aponte um domínio/subdomínio para o IP da sua VPS (ex: `api.sistemamaconico.com.br`).
2. Instale o Nginx e Certbot:
```bash
sudo apt install nginx certbot python3-certbot-nginx
```
3. Configure o Nginx como Proxy Reverso apontando a porta `8000` para o subdomínio e ative o SSL com `certbot --nginx`.
