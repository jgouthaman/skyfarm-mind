-- Storage bucket for uploaded mission-brief documents (PDF / Word / plain
-- text). Each file is keyed by the mission it was attached to: `<mission_id>.
-- <ext>` (e.g. `b7e4a1c2-9f3d-4e21-8a6b-5c9d2f1e8a4b.pdf`) — that key IS the
-- link between the stored file and its mission; there is no separate table.
--
-- Written server-side only (documentStorage.ts's storeDocumentFile, via the
-- service role, once Stage 1 has created the mission and its id exists to
-- name the file after) -- a user never uploads directly to this bucket.
--
-- Private bucket: no public policies below, so nothing is readable except
-- through the service role, same posture as every Hangar_* table. This does
-- NOT feed the pipeline (only the already-extracted text does, via the
-- "document" source) -- it exists purely so the original file can be
-- retrieved later if needed.
--
-- Idempotent; safe to run twice. Not auto-applied -- run manually in the
-- Supabase SQL editor. If your project rejects a direct insert into
-- storage.buckets (some hosting configurations restrict it), create the
-- bucket instead via Dashboard -> Storage -> New bucket, name exactly
-- "BK_HangarMission", Public bucket: OFF -- then skip this file; the code
-- only needs the bucket to exist under that name, however it was created.

insert into storage.buckets (id, name, public)
values ('BK_HangarMission', 'BK_HangarMission', false)
on conflict (id) do nothing;
