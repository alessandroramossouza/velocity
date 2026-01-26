
# Guia de Deploy (Supabase + Vercel)

Este projeto foi atualizado para usar **Supabase** como backend e está pronto para deploy na **Vercel**.

## 1. Configurar o Supabase (Banco de Dados)

1. Crie uma conta e um novo projeto em [https://supabase.com](https://supabase.com).
2. Vá para a seção **SQL Editor** do seu projeto no Supabase.
3. Copie o conteúdo do arquivo `supabase_migration.sql` (que está na raiz deste projeto) e cole no editor SQL do Supabase.
4. Clique em **Run** para criar as tabelas e dados iniciais.
5. Vá para **Project Settings** -> **API**.
6. Copie a `Project URL` e a `anon public` key.

## 2. Configurar o Ambiente Local (Opcional, para testar)

1. Renomeie o arquivo `.env.example` para `.env.local` (se já não existir) ou crie um novo.
2. Preencha com suas credenciais:
   ```env
   VITE_SUPABASE_URL=sua_url_do_projeto
   VITE_SUPABASE_ANON_KEY=sua_chave_anon_publica
   ```

## 3. Deploy no Vercel

### Opção A: Vercel Dashboard (Recomendado)
1. Crie um repositório no GitHub/GitLab/Bitbucket e suba este código.
2. Acesse [https://vercel.com/new](https://vercel.com/new).
3. Importe o repositório do seu projeto.
4. **IMPORTANTE**: Na configuração de deploy do Vercel, abra a seção **Environment Variables**.
5. Adicione as mesmas variáveis que você pegou do Supabase:
   - `VITE_SUPABASE_URL`: (Sua URL)
   - `VITE_SUPABASE_ANON_KEY`: (Sua Key)
6. Clique em **Deploy**.

### Opção B: Vercel CLI
1. Instale o Vercel CLI e faça login: `npm i -g vercel && vercel login`.
2. Rode `vercel` na raiz do projeto.
3. Siga as instruções.
4. Quando perguntado sobre Environment Variables, adicione-as.

## Notas Importantes
- O backend PHP anterior (`api/*.php`) foi descontinuado em favor do acesso direto ao Supabase via Client JS.
- Assegure-se de que os dados de "Políticas de Segurança" (RLS) no `supabase_migration.sql` atendam às suas necessidades de segurança (atualmente estão abertos para facilitar o teste).
