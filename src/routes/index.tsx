export default function Index() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-red-600">Auditoria de Segurança e Banco de Dados</h1>
      
      <section className="space-y-4">
        <p className="font-semibold">
          Analise completamente toda a aplicação antes de realizar qualquer alteração e execute uma auditoria profunda de SEGURANÇA e BANCO DE DADOS em todo o sistema.
        </p>
        <p>
          Identificar vulnerabilidades, falhas de segurança, riscos de exposição de dados, problemas de autenticação/autorização e otimizar toda a estrutura do banco de dados.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Analise:</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Estrutura completa do banco de dados, tabelas, relações</li>
          <li>Políticas de acesso (RLS no Supabase), queries</li>
          <li>Endpoints, APIs, autenticação, sessão</li>
          <li>Autorização e permissões por role</li>
          <li>Exposição de dados sensíveis, validação de inputs</li>
          <li>Upload de arquivos, storage, logs</li>
          <li>Tokens e chaves de API, variáveis de ambiente</li>
          <li>Possíveis pontos de injeção</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-red-500">Segurança (prioridade máxima):</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Falhas de autenticação e autorização</li>
          <li>RLS mal configuradas, exposição de dados no frontend</li>
          <li>Queries inseguras, endpoints sem validação</li>
          <li>Upload sem validação, acesso direto a tabelas</li>
          <li>Vazamento de IDs/emails, tokens expostos</li>
          <li>Falta de expiração de sessão e proteção de rotas</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold text-blue-500">Banco de Dados:</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Normalização, relações corretas, foreign keys</li>
          <li>Indexação, remoção de redundância</li>
          <li>Otimização de queries pesadas, paginação</li>
          <li>Evitar N+1 queries</li>
        </ul>
      </section>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <p className="font-bold">Supabase:</p>
        <p>Revisar RLS, policies por role, Storage policies, realtime subscriptions, service_role usage.</p>
      </div>

      <footer className="mt-8 border-t pt-4 text-sm font-medium italic">
        Regras: NUNCA expor secrets no frontend, SEMPRE validar no backend/banco, princípio de menor privilégio, proteger dados sensíveis. O sistema deve estar seguro, protegido, com banco otimizado e pronto para produção.
      </footer>
    </div>
  );
}

