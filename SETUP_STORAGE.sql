
-- 1. Cria o Bucket 'cars' para salvar as fotos
insert into storage.buckets (id, name, public)
values ('cars', 'cars', true)
on conflict (id) do nothing;

-- 2. Permite que qualquer um (public) faça Upload de imagens (Simplificado para Demo)
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'cars' );

create policy "Public Insert"
on storage.objects for insert
with check ( bucket_id = 'cars' );
