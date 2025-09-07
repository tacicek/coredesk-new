-- Create Business Report Module tables

-- Organizations table (already exists as vendors, but let's add specific columns)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS locale text DEFAULT 'en';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS billing_email text;

-- Projects table for report module
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  client_name text NOT NULL,
  client_email text NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('web', 'seo', 'other')),
  tags text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Evidence table for storing project evidence
CREATE TABLE IF NOT EXISTS evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('screenshot', 'url', 'note', 'file', 'metric')),
  title text NOT NULL,
  content text,
  url text,
  file_path text,
  captured_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Work logs table
CREATE TABLE IF NOT EXISTS work_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date date NOT NULL,
  title text NOT NULL,
  description text,
  time_spent_minutes integer NOT NULL DEFAULT 0,
  assignee uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Report templates table
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE, -- NULL for system templates
  name text NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('web', 'seo', 'other')),
  format text NOT NULL DEFAULT 'latex' CHECK (format IN ('latex', 'markdown')),
  body_template text NOT NULL,
  variables jsonb DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'sent')),
  llm_model text,
  prompt_config jsonb DEFAULT '{}',
  answers jsonb DEFAULT '{}',
  outline jsonb DEFAULT '{}',
  compiled_pdf_path text,
  template_id uuid REFERENCES report_templates(id),
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Report sections table
CREATE TABLE IF NOT EXISTS report_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_markdown text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view their vendor's projects" 
ON projects FOR SELECT 
USING (vendor_id = get_user_vendor_id());

CREATE POLICY "Users can create projects for their vendor" 
ON projects FOR INSERT 
WITH CHECK (vendor_id = get_user_vendor_id() AND created_by = auth.uid());

CREATE POLICY "Users can update their vendor's projects" 
ON projects FOR UPDATE 
USING (vendor_id = get_user_vendor_id());

CREATE POLICY "Users can delete their vendor's projects" 
ON projects FOR DELETE 
USING (vendor_id = get_user_vendor_id());

-- RLS Policies for evidence
CREATE POLICY "Users can view evidence for their vendor's projects" 
ON evidence FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = evidence.project_id 
  AND p.vendor_id = get_user_vendor_id()
));

CREATE POLICY "Users can create evidence for their vendor's projects" 
ON evidence FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = evidence.project_id 
  AND p.vendor_id = get_user_vendor_id()
) AND created_by = auth.uid());

CREATE POLICY "Users can update evidence for their vendor's projects" 
ON evidence FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = evidence.project_id 
  AND p.vendor_id = get_user_vendor_id()
));

CREATE POLICY "Users can delete evidence for their vendor's projects" 
ON evidence FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = evidence.project_id 
  AND p.vendor_id = get_user_vendor_id()
));

-- RLS Policies for work_logs
CREATE POLICY "Users can view work logs for their vendor's projects" 
ON work_logs FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = work_logs.project_id 
  AND p.vendor_id = get_user_vendor_id()
));

CREATE POLICY "Users can create work logs for their vendor's projects" 
ON work_logs FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = work_logs.project_id 
  AND p.vendor_id = get_user_vendor_id()
) AND created_by = auth.uid());

CREATE POLICY "Users can update work logs for their vendor's projects" 
ON work_logs FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = work_logs.project_id 
  AND p.vendor_id = get_user_vendor_id()
));

CREATE POLICY "Users can delete work logs for their vendor's projects" 
ON work_logs FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = work_logs.project_id 
  AND p.vendor_id = get_user_vendor_id()
));

-- RLS Policies for report_templates
CREATE POLICY "Users can view available report templates" 
ON report_templates FOR SELECT 
USING (vendor_id IS NULL OR vendor_id = get_user_vendor_id());

CREATE POLICY "Users can create templates for their vendor" 
ON report_templates FOR INSERT 
WITH CHECK (vendor_id = get_user_vendor_id() AND created_by = auth.uid());

CREATE POLICY "Users can update their vendor's templates" 
ON report_templates FOR UPDATE 
USING (vendor_id = get_user_vendor_id());

CREATE POLICY "Users can delete their vendor's templates" 
ON report_templates FOR DELETE 
USING (vendor_id = get_user_vendor_id());

-- RLS Policies for reports
CREATE POLICY "Users can view reports for their vendor's projects" 
ON reports FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = reports.project_id 
  AND p.vendor_id = get_user_vendor_id()
));

CREATE POLICY "Users can create reports for their vendor's projects" 
ON reports FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = reports.project_id 
  AND p.vendor_id = get_user_vendor_id()
) AND created_by = auth.uid());

CREATE POLICY "Users can update reports for their vendor's projects" 
ON reports FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = reports.project_id 
  AND p.vendor_id = get_user_vendor_id()
));

CREATE POLICY "Users can delete reports for their vendor's projects" 
ON reports FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = reports.project_id 
  AND p.vendor_id = get_user_vendor_id()
));

-- RLS Policies for report_sections
CREATE POLICY "Users can view sections for their vendor's reports" 
ON report_sections FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM reports r 
  JOIN projects p ON p.id = r.project_id 
  WHERE r.id = report_sections.report_id 
  AND p.vendor_id = get_user_vendor_id()
));

CREATE POLICY "Users can create sections for their vendor's reports" 
ON report_sections FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM reports r 
  JOIN projects p ON p.id = r.project_id 
  WHERE r.id = report_sections.report_id 
  AND p.vendor_id = get_user_vendor_id()
));

CREATE POLICY "Users can update sections for their vendor's reports" 
ON report_sections FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM reports r 
  JOIN projects p ON p.id = r.project_id 
  WHERE r.id = report_sections.report_id 
  AND p.vendor_id = get_user_vendor_id()
));

CREATE POLICY "Users can delete sections for their vendor's reports" 
ON report_sections FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM reports r 
  JOIN projects p ON p.id = r.project_id 
  WHERE r.id = report_sections.report_id 
  AND p.vendor_id = get_user_vendor_id()
));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_vendor_id ON projects(vendor_id);
CREATE INDEX IF NOT EXISTS idx_evidence_project_id ON evidence(project_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_project_id ON work_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id);
CREATE INDEX IF NOT EXISTS idx_report_sections_report_id ON report_sections(report_id);

-- Insert default report templates
INSERT INTO report_templates (name, service_type, format, body_template, variables, is_active) VALUES
(
  'SEO Standard Report',
  'seo',
  'latex',
  '\documentclass[11pt]{article}
\usepackage{fontspec}
\setmainfont{Arial}
\usepackage{geometry}
\usepackage{hyperref}
\usepackage{graphicx}
\geometry{margin=2.2cm}
\title{{{project_name}} — SEO Report}
\author{{{agency_name}}}
\date{{{report_date}}}

\begin{document}
\maketitle

\section*{Executive Summary}
{{executive_summary}}

{% for section in sections %}
\section*{{{section.title}}}
{{section.content}}
{% endfor %}

\end{document}',
  '["project_name", "agency_name", "report_date", "executive_summary"]',
  true
),
(
  'Web Development Report',
  'web',
  'latex',
  '\documentclass[11pt]{article}
\usepackage{fontspec}
\setmainfont{Arial}
\usepackage{geometry}
\usepackage{hyperref}
\usepackage{graphicx}
\geometry{margin=2.2cm}
\title{{{project_name}} — Development Report}
\author{{{agency_name}}}
\date{{{report_date}}}

\begin{document}
\maketitle

\section*{Project Overview}
{{project_overview}}

{% for section in sections %}
\section*{{{section.title}}}
{{section.content}}
{% endfor %}

\end{document}',
  '["project_name", "agency_name", "report_date", "project_overview"]',
  true
);

-- Add trigger for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON report_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_sections_updated_at BEFORE UPDATE ON report_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();