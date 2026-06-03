
ALTER TABLE public.studio_projects ADD COLUMN IF NOT EXISTS advisor_messages jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.studio_requirements ADD CONSTRAINT studio_requirements_project_unique UNIQUE (project_id);
ALTER TABLE public.studio_designs ADD CONSTRAINT studio_designs_project_unique UNIQUE (project_id);
ALTER TABLE public.studio_components ADD CONSTRAINT studio_components_project_unique UNIQUE (project_id);
