import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useVendor } from '@/contexts/VendorContext';
import { ArrowLeft, Plus, FileText, Clock, Image, Link as LinkIcon, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import AddEvidenceModal from '@/components/project/AddEvidenceModal';

interface Project {
  id: string;
  name: string;
  client_name: string;
  client_email: string;
  service_type: 'web' | 'seo' | 'other';
  tags: string[];
  status: 'active' | 'completed' | 'paused';
  created_at: string;
}

interface Evidence {
  id: string;
  type: 'screenshot' | 'url' | 'note' | 'file' | 'metric';
  title: string;
  content?: string;
  url?: string;
  file_path?: string;
  captured_at: string;
}

interface Report {
  id: string;
  version: number;
  status: 'draft' | 'ready' | 'sent';
  created_at: string;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { vendor } = useVendor();
  const [project, setProject] = useState<Project | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);

  useEffect(() => {
    const loadProjectData = async () => {
      if (!id || !vendor?.id) return;

      try {
        setLoading(true);

        // Load project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .eq('vendor_id', vendor.id)
          .single();

        if (projectError) throw projectError;
        setProject(projectData as Project);

        // Load evidence
        const { data: evidenceData, error: evidenceError } = await supabase
          .from('evidence')
          .select('*')
          .eq('project_id', id)
          .order('captured_at', { ascending: false });

        if (evidenceError) throw evidenceError;
        setEvidence(evidenceData as Evidence[] || []);

        // Load reports
        const { data: reportsData, error: reportsError } = await supabase
          .from('reports')
          .select('*')
          .eq('project_id', id)
          .order('created_at', { ascending: false });

        if (reportsError) throw reportsError;
        setReports(reportsData as Report[] || []);

        console.log('Project loaded successfully:', projectData?.name);
      } catch (error) {
        console.error('Error loading project data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjectData();
  }, [id, vendor?.id]);

  const getServiceTypeColor = (type: string) => {
    switch (type) {
      case 'seo': return 'bg-blue-100 text-blue-800';
      case 'web': return 'bg-green-100 text-green-800';
      case 'other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'screenshot': return <Image className="h-4 w-4" />;
      case 'url': return <LinkIcon className="h-4 w-4" />;
      case 'metric': return <BarChart3 className="h-4 w-4" />;
      case 'file': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const reloadEvidence = async () => {
    if (!id) return;
    
    try {
      const { data: evidenceData, error: evidenceError } = await supabase
        .from('evidence')
        .select('*')
        .eq('project_id', id)
        .order('captured_at', { ascending: false });

      if (evidenceError) throw evidenceError;
      setEvidence(evidenceData as Evidence[] || []);
    } catch (error) {
      console.error('Error reloading evidence:', error);
    }
  };

  const generateReport = async () => {
    if (!project?.id) return;
    
    try {
      setReportGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('generate-business-report', {
        body: {
          projectId: project.id,
          reportType: 'comprehensive',
          language: 'de'
        }
      });

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: `KI-Bericht wurde erfolgreich erstellt (${data.sectionsCount} Abschnitte)`
      });

      // Navigate to the generated report
      navigate(`/reports?project=${project.id}`);
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Fehler",
        description: "Bericht konnte nicht erstellt werden",
        variant: "destructive"
      });
    } finally {
      setReportGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6 p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Projekt wird geladen...</h1>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6 p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Projekt nicht gefunden</h1>
        <Button onClick={() => navigate('/dashboard/reports')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zu Berichten
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard/reports')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge className={getServiceTypeColor(project.service_type)}>
                {project.service_type.toUpperCase()}
              </Badge>
              <Badge className={getStatusColor(project.status)}>
                {project.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {project.client_name} • {project.client_email}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/dashboard/projects/${project.id}/report-wizard`)}>
            <Plus className="h-4 w-4 mr-2" />
            Interaktiver KI-Bericht
          </Button>
          <Button variant="outline" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zu Projekten
          </Button>
        </div>
      </div>

      {/* Project Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Belege</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{evidence.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arbeitszeit</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0h 0m</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Berichte</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erstellt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {format(new Date(project.created_at), 'dd.MM.yyyy')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="evidence" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="evidence">Belege & Nachweise</TabsTrigger>
          <TabsTrigger value="reports">Berichte</TabsTrigger>
        </TabsList>

        <TabsContent value="evidence" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Belege & Nachweise</h3>
            <Button size="sm" onClick={() => setIsEvidenceModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Beleg hinzufügen
            </Button>
          </div>
          
          <div className="space-y-4">
            {evidence.length > 0 ? (
              evidence.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-2">
                        {getEvidenceIcon(item.type)}
                        <Badge variant="secondary">{item.type}</Badge>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.title}</h4>
                        {item.content && (
                          <p className="text-sm text-muted-foreground mt-1">{item.content}</p>
                        )}
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline mt-1 block"
                          >
                            {item.url}
                          </a>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(item.captured_at), 'dd.MM.yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="font-semibold mb-2">Keine Belege vorhanden</h4>
                  <p className="text-muted-foreground mb-4">
                    Fügen Sie Screenshots, URLs, Dateien oder Metriken hinzu.
                  </p>
                  <Button onClick={() => setIsEvidenceModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ersten Beleg hinzufügen
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Berichte</h3>
            <Button onClick={() => navigate(`/dashboard/reports/${id}/new`)}>
              <Plus className="h-4 w-4 mr-2" />
              Neuer Bericht
            </Button>
          </div>
          
          <div className="space-y-4">
            {reports.length > 0 ? (
              reports.map((report) => (
                <Card key={report.id} className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/dashboard/reports/${id}/report/${report.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Bericht Version {report.version}</h4>
                        <p className="text-sm text-muted-foreground">
                          Erstellt am {format(new Date(report.created_at), 'dd.MM.yyyy HH:mm')}
                        </p>
                      </div>
                      <Badge 
                        className={
                          report.status === 'sent' ? 'bg-green-100 text-green-800' :
                          report.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }
                      >
                        {report.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="font-semibold mb-2">Keine Berichte vorhanden</h4>
                  <p className="text-muted-foreground mb-4">
                    Erstellen Sie Ihren ersten Bericht für dieses Projekt.
                  </p>
                  <Button onClick={() => navigate(`/dashboard/reports/${id}/new`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ersten Bericht erstellen
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Add Evidence Modal */}
      {id && (
        <AddEvidenceModal
          open={isEvidenceModalOpen}
          onOpenChange={setIsEvidenceModalOpen}
          projectId={id}
          onSuccess={reloadEvidence}
        />
      )}
    </div>
  );
}