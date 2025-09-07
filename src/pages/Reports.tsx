import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, TrendingUp, Calendar, Users } from 'lucide-react';
import ReportsList from '@/components/reports/ReportsList';
import NewReportModal from '@/components/reports/NewReportModal';

export default function Reports() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const [activeTab, setActiveTab] = useState('reports');
  const [showNewReportModal, setShowNewReportModal] = useState(false);

  useEffect(() => {
    if (projectId) {
      setActiveTab('reports');
    }
  }, [projectId]);

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Business Reports</h1>
          <p className="text-muted-foreground">
            {projectId 
              ? "KI-generierte Berichte für Ihr Projekt"
              : "Erstellen und verwalten Sie KI-generierte Geschäftsberichte"
            }
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
          <Button 
            onClick={() => navigate('/projects/new')}
            size="sm"
            className="flex-1 sm:flex-initial min-w-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Neues Projekt</span>
            <span className="sm:hidden">Projekt</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/projects')}
            size="sm"
            className="flex-1 sm:flex-initial min-w-0"
          >
            <FileText className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Projekte verwalten</span>
            <span className="sm:hidden">Verwalten</span>
          </Button>
          <Button 
            onClick={() => setShowNewReportModal(true)}
            size="sm"
            className="flex-1 sm:flex-initial min-w-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Neuer Bericht</span>
            <span className="sm:hidden">Bericht</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reports">KI-Berichte</TabsTrigger>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
          <ReportsList projectId={projectId || undefined} />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">KI-Berichte</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Aktive Projekte</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Diesen Monat</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Kunden</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Getting Started */}
          <Card>
            <CardHeader>
              <CardTitle>KI-gestützte Berichtserstellung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Automatisierte Business Reports</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Erstellen Sie professionelle Geschäftsberichte automatisch mit KI. 
                  Beginnen Sie mit einem Projekt und lassen Sie ChatGPT den Bericht generieren.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button onClick={() => navigate('/projects/new')} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Neues Projekt erstellen
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/projects')} className="w-full sm:w-auto">
                    <FileText className="h-4 w-4 mr-2" />
                    Bestehende Projekte ansehen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <NewReportModal 
        open={showNewReportModal} 
        onClose={() => setShowNewReportModal(false)}
      />
    </div>
  );
}