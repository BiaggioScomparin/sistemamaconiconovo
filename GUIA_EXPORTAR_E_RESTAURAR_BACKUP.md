# 💾 Guia de Restauração do Backup Real (`.backup`)

> [!SUCCESS]
> **Backup Localizado e Validado:**  
> Arquivo: `backup_sistemamaconico.backup` (817 KB - Formato Nativo `PGDMP` do PostgreSQL 17/18)  
> Localização no Projeto: `supabase/backup_sistemamaconico.backup`

Este backup contém a estrutura completa e **todos os dados reais de produção** (Usuários, Autenticação, Perfis, Lojas, Presenças, Votações, Atas, Biblioteca e Finanças).

---

## 📥 Como Restaurar este Backup na VPS

Como o arquivo `.backup` foi gerado no formato binário customizado do PostgreSQL (`pg_dump -Fc`), a restauração é feita utilizando o utilitário **`pg_restore`**.

### Passo 1: Enviar o arquivo de backup para a sua VPS
No terminal do seu computador (PowerShell):
```powershell
scp C:\Users\biagg\.gemini\antigravity\scratch\sistemamaconico\supabase\backup_sistemamaconico.backup root@IP_DA_SUA_VPS:/root/
```

### Passo 2: Conectar na VPS e Restaurar no Postgres/Supabase
No terminal da sua VPS (SSH):
```bash
ssh root@IP_DA_SUA_VPS

# Executar a restauração direta no container PostgreSQL do Supabase
docker exec -i supabase-db pg_restore -U postgres -d postgres --clean --if-exists < /root/backup_sistemamaconico.backup
```

### Passo 3: Verificação de Dados
Após a restauração terminar, você pode verificar se todos os dados foram importados:
```bash
docker exec -it supabase-db psql -U postgres -d postgres -c "SELECT count(*) FROM public.profiles;"
```

---

## 🔒 Prontos para Produção!
Todos os dados históricos, cadastros de membros e logins permanecerão intactos na sua nova infraestrutura autônoma.
