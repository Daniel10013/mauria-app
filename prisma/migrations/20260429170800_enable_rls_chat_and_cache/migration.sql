-- Habilita Row Level Security e cria políticas para chat_threads, chat_messages
-- e api_cache. O bloco inicial garante que auth.uid() exista no shadow database
-- do Prisma (igual ao truque usado na migration de RLS do profiles).

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

ALTER TABLE "chat_threads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_cache" ENABLE ROW LEVEL SECURITY;

-- chat_threads: dono lê/edita só os próprios
CREATE POLICY "threads_select_own" ON "chat_threads"
  FOR SELECT USING (auth.uid() = "userId");
CREATE POLICY "threads_insert_own" ON "chat_threads"
  FOR INSERT WITH CHECK (auth.uid() = "userId");
CREATE POLICY "threads_update_own" ON "chat_threads"
  FOR UPDATE USING (auth.uid() = "userId") WITH CHECK (auth.uid() = "userId");
CREATE POLICY "threads_delete_own" ON "chat_threads"
  FOR DELETE USING (auth.uid() = "userId");

-- chat_messages: dono é via thread.userId. Subquery na policy.
CREATE POLICY "messages_select_via_thread" ON "chat_messages"
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM "chat_threads" t
    WHERE t.id = "chat_messages"."threadId" AND t."userId" = auth.uid()
  ));
CREATE POLICY "messages_insert_via_thread" ON "chat_messages"
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM "chat_threads" t
    WHERE t.id = "chat_messages"."threadId" AND t."userId" = auth.uid()
  ));

-- api_cache: leitura pública (cache global), escrita apenas via service role.
CREATE POLICY "cache_select_all" ON "api_cache" FOR SELECT USING (true);
