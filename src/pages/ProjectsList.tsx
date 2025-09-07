import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useVendor } from '@/contexts/VendorContext';
import { Plus, Search, FolderOpen, Clock, FileText, Trash2, MoreVertical } from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

export default function ProjectsList() {
  const navigate = useNavigate();
  const { vendor } = useVendor();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      if (!vendor?.id) return;

      try {
        setLoading(true);

        let query = supabase
          .from('projects')
          .select('*')
          .eq('vendor_id', vendor.id)
          .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        if (serviceFilter !== 'all') {
          query = query.eq('service_type', serviceFilter);
        }

        const { data, error } = await query;

        if (error) throw error;

        let filteredProjects = data || [];

        if (searchTerm) {
          filteredProjects = filteredProjects.filter(project =>
            project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.client_email.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        setProjects(filteredProjects as Project[]);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [vendor?.id, statusFilter, serviceFilter, searchTerm]);

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

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      setProjects(projects.filter(p => p.id !== projectId));
      toast.success('Projekt erfolgreich gelöscht');
      setDeleteProjectId(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Fehler beim Löschen des Projekts');
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6 p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Projekte werden geladen...</h1>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projekte</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Projekte und erstellen Sie Berichte
          </p>
        </div>
        <Button 
          onClick={() => navigate('/dashboard/projects/new')}
          className="self-start sm:self-auto"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Neues Projekt</span>
          <span className="sm:hidden">Neu</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Projekte durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="paused">Pausiert</SelectItem>
            <SelectItem value="completed">Abgeschlossen</SelectItem>
          </SelectContent>
        </Select>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Services</SelectItem>
            <SelectItem value="web">Web Development</SelectItem>
            <SelectItem value="seo">SEO & Marketing</SelectItem>
            <SelectItem value="other">Andere</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length > 0 ? (
          projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div 
                    className="flex-1 min-w-0 cursor-pointer" 
                    onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                  >
                    <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                    <p className="text-sm text-muted-foreground truncate">
                      {project.client_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <Badge className={getServiceTypeColor(project.service_type)}>
                        {project.service_type.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteProjectId(project.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent 
                className="cursor-pointer"
                onClick={() => navigate(`/dashboard/projects/${project.id}`)}
              >
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {project.client_email}
                  </p>
                  
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {project.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{project.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(project.created_at), 'dd.MM.yyyy')}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Berichte
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-8 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Keine Projekte gefunden</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all' || serviceFilter !== 'all' 
                    ? 'Versuchen Sie andere Suchbegriffe oder Filter.'
                    : 'Erstellen Sie Ihr erstes Projekt, um Berichte zu generieren.'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && serviceFilter === 'all' && (
                  <Button onClick={() => navigate('/dashboard/projects/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Erstes Projekt erstellen
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projekt löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie dieses Projekt löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
              Alle zugehörigen Berichte und Daten werden ebenfalls gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProjectId && handleDeleteProject(deleteProjectId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}