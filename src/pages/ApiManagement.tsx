import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { N8nWebhookIntegration } from '@/components/invoice/N8nWebhookIntegration';
import VendorApiManager from '@/components/VendorApiManager';
import { 
  Webhook,
  Brain,
  Settings,
  Key,
  Bot,
  Globe,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ApiManagement() {
  const [activeTab, setActiveTab] = useState('tenant-apis');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">API Management</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre KI-APIs und Workflow-Integrationen
          </p>
        </div>
      </div>

      {/* API Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
          onClick={() => setActiveTab('tenant-apis')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xl font-bold">KI APIs</p>
                  <Badge variant="secondary" className="text-xs">Tenant-spezifisch</Badge>
                </div>
                <p className="text-sm text-muted-foreground">OpenAI, Gemini, Claude</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
          onClick={() => setActiveTab('n8n')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Webhook className="h-6 w-6 text-blue-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xl font-bold">n8n</p>
                  <Badge variant="outline" className="text-xs">Workflow</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Automation & Webhooks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
          onClick={() => setActiveTab('system-info')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Globe className="h-6 w-6 text-green-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xl font-bold">System</p>
                  <Badge variant="default" className="text-xs">Global</Badge>
                </div>
                <p className="text-sm text-muted-foreground">E-Mail & Core Services</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tenant-apis" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Meine KI APIs
          </TabsTrigger>
          <TabsTrigger value="n8n" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            n8n Integration
          </TabsTrigger>
          <TabsTrigger value="system-info" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            System Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenant-apis" className="space-y-6">
          <VendorApiManager />
        </TabsContent>

        <TabsContent value="n8n" className="space-y-6">
          <N8nWebhookIntegration />
        </TabsContent>

        <TabsContent value="system-info" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-green-600" />
                  Globale Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span className="font-medium text-green-800">E-Mail Service (Resend)</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Alle E-Mails werden zentral von <code className="bg-green-100 px-1 rounded">support@coredesk.ch</code> versendet
                    </p>
                    <ul className="text-xs text-green-600 mt-2 space-y-1">
                      <li>• Rechnungsversand</li>
                      <li>• System-Benachrichtigungen</li>
                      <li>• Erinnerungen</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="font-medium text-blue-800">Supabase Services</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Datenbank, Authentifizierung und Storage sind systemweit aktiv
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Tenant-spezifische APIs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Warum Tenant-spezifisch?</h4>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                      <li>Kostenkontrolle pro Unternehmen</li>
                      <li>Individuelle API-Limits</li>
                      <li>Getrennte Abrechnung</li>
                      <li>Anbieter-Flexibilität</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Verfügbare KI-Anbieter:</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-green-600" />
                        <span className="text-sm">OpenAI (GPT-5, GPT-4)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Google Gemini</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-purple-600" />
                        <span className="text-sm">Anthropic Claude 4</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Info className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-yellow-800">Wichtig</span>
                    </div>
                    <p className="text-sm text-yellow-700">
                      Mindestens ein KI-API muss konfiguriert sein für die Berichtserstellung
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
