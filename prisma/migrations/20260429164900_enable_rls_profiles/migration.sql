-- Habilita Row Level Security na tabela profiles e cria políticas para que
-- cada usuário só possa ler/escrever a própria linha (id = auth.uid()).
--
-- Os blocos abaixo garantem que o schema "auth" e a função auth.uid() existam
-- mesmo no shadow database do Prisma (que é um Postgres limpo). Em produção
-- (Supabase) eles já existem e o IF NOT EXISTS evita sobrescrever.

CREATE SCHEMA IF NOT EXISTS "auth";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    EXECUTE $func$
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS '
        SELECT NULL::uuid
      ';
    $func$;
  END IF;
END $$;

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

-- Usuário só lê o próprio perfil
CREATE POLICY "profiles_select_own" ON "profiles"
  FOR SELECT USING (auth.uid() = id);

-- Usuário só insere o próprio perfil (com id = auth.uid())
CREATE POLICY "profiles_insert_own" ON "profiles"
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Usuário só atualiza o próprio perfil
CREATE POLICY "profiles_update_own" ON "profiles"
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
