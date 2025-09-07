import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Users, DollarSign, Ticket, TrendingUp, Shield, Settings, Globe, Menu, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { TenantStats } from '@/types/admin';
import TenantsOverviewTab from '@/components/admin/TenantsOverviewTab';
import TenantFeaturesTab from '@/components/admin/TenantFeaturesTab';
import RevenueBillingTab from '@/components/admin/RevenueBillingTab';
import AnalyticsReportsTab from '@/components/admin/AnalyticsReportsTab';
import SupportCenterTab from '@/components/admin/SupportCenterTab';
import SystemSettingsTab from '@/components/admin/SystemSettingsTab';
import PlatformManagementTab from '@/components/admin/PlatformManagementTab';
import TenantSelector from '@/components/admin/TenantSelector';
import { CustomerApiManagementTab } from '@/components/admin/CustomerApiManagementTab';
import ApiManagementTab from '@/components/admin/ApiManagementTab';
import SiteManagementTab from '@/components/admin/SiteManagementTab';
import UnifiedTenantManagement from '@/components/admin/UnifiedTenantManagement';
import UnifiedApiManagement from '@/components/admin/UnifiedApiManagement';

export default function AdminDashboard() {
  console.log('AdminDashboard component loaded - NEW VERSION');
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tenants');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Auto-close sidebar on mobile by default
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_tenant_stats');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      toast({
        title: "Fehler",
        description: "Statistiken konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const managementItems = [
    {
      id: 'tenants',
      label: 'Mandanten Verwaltung',
      icon: Building2,
      description: 'Tenants, Features & Site-Einstellungen'
    },
    {
      id: 'impersonation',
      label: 'Dashboard Zugriff',
      icon: Users,
      description: 'Tenant-Impersonation'
    }
  ];

  const businessItems = [
    {
      id: 'revenue',
      label: 'Umsatz & Billing',
      icon: DollarSign,
      description: 'Abonnements & Zahlungen'
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      icon: TrendingUp,
      description: 'Berichte & Statistiken'
    }
  ];

  const apiSupportItems = [
    {
      id: 'support',
      label: 'Support Center',
      icon: Ticket,
      description: 'Tickets & Kundensupport'
    },
    {
      id: 'api-management',
      label: 'API Verwaltung',
      icon: Shield,
      description: 'System & Kunden APIs'
    }
  ];

  const systemItems = [
    {
      id: 'settings',
      label: 'System Konfiguration',
      icon: Settings,
      description: 'Globale Einstellungen'
    }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-900/50 to-purple-900/50">
      <div className="container mx-auto px-3 md:px-6 py-4 md:py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Willkommen im Admin Dashboard
          </h1>
          <p className="text-purple-200">
            Verwalten Sie Ihr gesamtes System von einer zentralen Stelle aus
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-200">Gesamt Mandanten</CardTitle>
              <Building2 className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.total_tenants || 0}</div>
              <p className="text-xs text-purple-300">
                {stats?.suspended_tenants || 0} gesperrt
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-200">Aktive Abonnements</CardTitle>
              <Users className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.active_tenants || 0}</div>
              <p className="text-xs text-purple-300">
                {stats?.trial_tenants || 0} Trial-Versionen
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-200">Monatlicher Umsatz</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(stats?.total_revenue || 0)}
              </div>
              <p className="text-xs text-purple-300">
                Monatlicher Gesamtumsatz
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-200">Support Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">-</div>
              <p className="text-xs text-purple-300">
                Noch keine Daten
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Hamburger Menu Button */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-purple-200 hover:text-white hover:bg-purple-500/20 transition-colors"
            aria-label={sidebarOpen ? "Navigasyon menüsünü kapat" : "Navigasyon menüsünü aç"}
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            <span className="ml-2">{sidebarOpen ? "Kapat" : "Menu"}</span>
          </Button>
        </div>

        {/* Main Content with Sidebar */}
        <div className="relative flex gap-4 lg:gap-6">
          {/* Sidebar Overlay (Mobile) */}
          {sidebarOpen && isMobile && (
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Left Sidebar Navigation */}
          <div className={`
            ${isMobile ? 'fixed left-0 top-0 z-50 h-full' : 'relative'}
            ${isMobile && sidebarOpen ? 'translate-x-0' : isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
            ${isMobile ? 'w-80 p-4' : sidebarOpen ? 'w-80 flex-shrink-0' : 'w-16 flex-shrink-0'}
            transition-all duration-300 ease-in-out
          `}>
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-lg border border-purple-500/20 p-3 lg:p-4 h-full overflow-y-auto">
              {/* Mobile Close Button */}
              {isMobile && (
                <div className="flex justify-end mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(false)}
                    className="text-purple-200 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              )}
              
              {(!isMobile && sidebarOpen || isMobile) && (
                <h3 className="text-lg font-semibold text-white mb-4">Navigation</h3>
              )}
              
              {/* Management Section */}
              <div className="space-y-3 mb-6">
                {(!isMobile && sidebarOpen || isMobile) && (
                  <div className="text-xs text-purple-300 font-medium mb-3 px-3">VERWALTUNG</div>
                )}
                <div className="space-y-2">
                  {managementItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <Button
                        key={item.id}
                        variant="ghost"
                        onClick={() => {
                          setActiveTab(item.id);
                          if (isMobile) setSidebarOpen(false);
                        }}
                        className={`w-full ${!isMobile && !sidebarOpen ? 'justify-center p-2' : 'justify-start p-3'} h-auto ${
                          activeTab === item.id
                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                            : "text-purple-200 hover:bg-purple-500/20 hover:text-white"
                        }`}
                        title={!isMobile && !sidebarOpen ? item.label : undefined}
                      >
                        <div className={`flex items-start gap-3 w-full ${!isMobile && !sidebarOpen ? 'justify-center' : ''}`}>
                          <IconComponent className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          {(!isMobile && sidebarOpen || isMobile) && (
                            <div className="text-left flex-1">
                              <div className="font-medium text-sm">{item.label}</div>
                              <div className="text-xs opacity-75 mt-1">{item.description}</div>
                            </div>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Business Section */}
              <div className="space-y-3 mb-6">
                {(!isMobile && sidebarOpen || isMobile) && (
                  <div className="text-xs text-purple-300 font-medium mb-3 px-3">GESCHÄFT</div>
                )}
                <div className="space-y-2">
                  {businessItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <Button
                        key={item.id}
                        variant="ghost"
                        onClick={() => {
                          setActiveTab(item.id);
                          if (isMobile) setSidebarOpen(false);
                        }}
                        className={`w-full ${!isMobile && !sidebarOpen ? 'justify-center p-2' : 'justify-start p-3'} h-auto ${
                          activeTab === item.id
                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                            : "text-purple-200 hover:bg-purple-500/20 hover:text-white"
                        }`}
                        title={!isMobile && !sidebarOpen ? item.label : undefined}
                      >
                        <div className={`flex items-start gap-3 w-full ${!isMobile && !sidebarOpen ? 'justify-center' : ''}`}>
                          <IconComponent className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          {(!isMobile && sidebarOpen || isMobile) && (
                            <div className="text-left flex-1">
                              <div className="font-medium text-sm">{item.label}</div>
                              <div className="text-xs opacity-75 mt-1">{item.description}</div>
                            </div>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* API & Support Section */}
              <div className="space-y-3 mb-6">
                {(!isMobile && sidebarOpen || isMobile) && (
                  <div className="text-xs text-purple-300 font-medium mb-3 px-3">API & SUPPORT</div>
                )}
                <div className="space-y-2">
                  {apiSupportItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <Button
                        key={item.id}
                        variant="ghost"
                        onClick={() => {
                          setActiveTab(item.id);
                          if (isMobile) setSidebarOpen(false);
                        }}
                        className={`w-full ${!isMobile && !sidebarOpen ? 'justify-center p-2' : 'justify-start p-3'} h-auto ${
                          activeTab === item.id
                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                            : "text-purple-200 hover:bg-purple-500/20 hover:text-white"
                        }`}
                        title={!isMobile && !sidebarOpen ? item.label : undefined}
                      >
                        <div className={`flex items-start gap-3 w-full ${!isMobile && !sidebarOpen ? 'justify-center' : ''}`}>
                          <IconComponent className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          {(!isMobile && sidebarOpen || isMobile) && (
                            <div className="text-left flex-1">
                              <div className="font-medium text-sm">{item.label}</div>
                              <div className="text-xs opacity-75 mt-1">{item.description}</div>
                            </div>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* System Section */}
              {(!isMobile && sidebarOpen || isMobile) && (
                <div className="border-t border-purple-500/20 pt-4">
                  <div className="text-xs text-purple-300 font-medium mb-3 px-3">SYSTEM</div>
                  <div className="space-y-2">
                    {systemItems.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <Button
                          key={item.id}
                          variant="ghost"
                          onClick={() => {
                            setActiveTab(item.id);
                            if (isMobile) setSidebarOpen(false);
                          }}
                          className={`w-full justify-start p-3 h-auto ${
                            activeTab === item.id
                              ? "bg-purple-600 hover:bg-purple-700 text-white"
                              : "text-purple-200 hover:bg-purple-500/20 hover:text-white"
                          }`}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <IconComponent className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            <div className="text-left flex-1">
                              <div className="font-medium text-sm">{item.label}</div>
                              <div className="text-xs opacity-75 mt-1">{item.description}</div>
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Collapsed System Section for Desktop */}
              {!isMobile && !sidebarOpen && (
                <div className="border-t border-purple-500/20 pt-4">
                  <div className="space-y-2">
                    {systemItems.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <Button
                          key={item.id}
                          variant="ghost"
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full justify-center p-2 h-auto ${
                            activeTab === item.id
                              ? "bg-purple-600 hover:bg-purple-700 text-white"
                              : "text-purple-200 hover:bg-purple-500/20 hover:text-white"
                          }`}
                          title={item.label}
                        >
                          <IconComponent className="h-5 w-5 flex-shrink-0" />
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-lg border border-purple-500/20 overflow-hidden">
              {activeTab === 'tenants' && <UnifiedTenantManagement onStatsChange={loadStats} />}
              {activeTab === 'impersonation' && <TenantSelector />}
              {activeTab === 'revenue' && <RevenueBillingTab />}
              {activeTab === 'analytics' && <AnalyticsReportsTab />}
              {activeTab === 'support' && <SupportCenterTab />}
              {activeTab === 'api-management' && <UnifiedApiManagement />}
              {activeTab === 'settings' && <SystemSettingsTab />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}