import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bot, Edit, Eye, EyeOff, Key, Plus, MessageSquare, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useVendor } from '@/contexts/VendorContext';

interface VendorApiKey {
  id: string;
  vendor_id: string;
  api_provider: string;
  api_key_name: string;
  encrypted_value: string;
  description: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const AI_PROVIDERS = [
  {
    id: 'openai_api_key',
    name: 'OpenAI',
    description: 'GPT-5, ChatGPT, DALL-E',
    icon: Bot,
    placeholder: 'sk-...',
    helpText: 'API Key von https://platform.openai.com/api-keys'
  },
  {
    id: 'gemini_api_key', 
    name: 'Google Gemini',
    description: 'Gemini Pro, Gemini Flash',
    icon: Bot,
    placeholder: 'AI...',
    helpText: 'API Key von https://makersuite.google.com/app/apikey'
  },
  {
    id: 'claude_api_key',
    name: 'Anthropic Claude',
    description: 'Claude 4 Sonnet, Claude 4 Opus',
    icon: Bot,
    placeholder: 'sk-ant-...',
    helpText: 'API Key von https://console.anthropic.com/'
  }
];

const OTHER_APIS = [
  // Resend is handled globally, not per tenant
];

export default function VendorApiManager() {
  const { vendor } = useVendor();
  const [apiKeys, setApiKeys] = useState<VendorApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<VendorApiKey | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    api_key_name: '',
    api_provider: '',
    description: '',
    encrypted_value: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (vendor?.id) {
      loadApiKeys();
    }
  }, [vendor?.id]);

  const loadApiKeys = async () => {
    if (!vendor?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('vendor_api_keys')
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast({
        title: "Fehler",
        description: "API Keys konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddApiKey = async () => {
    if (!vendor?.id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht angemeldet');

      // Use upsert to update existing record or insert new one
      const { error } = await supabase
        .from('vendor_api_keys')
        .upsert({
          vendor_id: vendor.id,
          api_provider: formData.api_provider,
          api_key_name: formData.api_key_name,
          encrypted_value: formData.encrypted_value,
          description: formData.description,
          is_active: true,
          created_by: user.id
        }, {
          onConflict: 'vendor_id,api_key_name'
        });

      if (error) throw error;

      await loadApiKeys();
      setIsAddDialogOpen(false);
      resetForm();
      
      toast({
        title: "API Key hinzugefügt",
        description: `${getProviderInfo(formData.api_key_name)?.name} wurde erfolgreich gespeichert.`
      });
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "API Key konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateApiKey = async () => {
    if (!selectedApiKey) return;

    try {
      const { error } = await supabase
        .from('vendor_api_keys')
        .update({
          encrypted_value: formData.encrypted_value,
          description: formData.description
        })
        .eq('id', selectedApiKey.id);

      if (error) throw error;

      await loadApiKeys();
      setIsEditDialogOpen(false);
      setSelectedApiKey(null);
      resetForm();
      
      toast({
        title: "API Key aktualisiert",
        description: "Die Änderungen wurden gespeichert."
      });
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "API Key konnte nicht aktualisiert werden.",
        variant: "destructive"
      });
    }
  };


  const resetForm = () => {
    setFormData({
      api_key_name: '',
      api_provider: '',
      description: '',
      encrypted_value: ''
    });
  };

  const openEditDialog = (apiKey: VendorApiKey) => {
    setSelectedApiKey(apiKey);
    setFormData({
      api_key_name: apiKey.api_key_name,
      api_provider: apiKey.api_provider,
      description: apiKey.description,
      encrypted_value: ''
    });
    setIsEditDialogOpen(true);
  };

  const toggleKeyVisibility = (apiKeyId: string) => {
    setShowKeys(prev => ({
      ...prev,
      [apiKeyId]: !prev[apiKeyId]
    }));
  };

  const getProviderInfo = (apiKeyName: string) => {
    return [...AI_PROVIDERS, ...OTHER_APIS].find(p => p.id === apiKeyName);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Only show API keys that have been configured (have values)
  const configuredAiKeys = apiKeys.filter(k => 
    (k.api_provider === 'openai' || k.api_provider === 'gemini' || k.api_provider === 'claude') && 
    k.encrypted_value && k.encrypted_value.trim() !== ''
  );
  const configuredOtherKeys = apiKeys.filter(k => 
    k.api_provider !== 'openai' && k.api_provider !== 'gemini' && k.api_provider !== 'claude' &&
    k.encrypted_value && k.encrypted_value.trim() !== ''
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">API Management</h2>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre API-Schlüssel sicher für Ihren Tenant
          </p>
        </div>
      </div>

      {/* AI APIs Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            KI API-Schlüssel
          </CardTitle>
          <CardDescription>
            Konfigurieren Sie Ihre bevorzugten KI-Anbieter für die Berichtserstellung
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {/* Add buttons for providers that haven't been configured */}
            {AI_PROVIDERS.map((provider) => {
              const existingKey = apiKeys.find(k => k.api_key_name === provider.id);
              const hasValue = existingKey && existingKey.encrypted_value && existingKey.encrypted_value.trim() !== '';
              
              if (hasValue) return null; // Don't show if already configured
              
              const IconComponent = provider.icon;
              
              return (
                <div key={provider.id} className="border rounded-lg p-4 border-dashed">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium text-muted-foreground">{provider.name}</h3>
                        <p className="text-sm text-muted-foreground">Noch nicht konfiguriert - {provider.description}</p>
                      </div>
                    </div>
                    
                    <Button 
                      size="sm"
                      onClick={() => {
                        setFormData({
                          api_key_name: provider.id,
                          api_provider: provider.id === 'openai_api_key' ? 'openai' : provider.id === 'gemini_api_key' ? 'gemini' : 'claude',
                          description: provider.description,
                          encrypted_value: ''
                        });
                        setIsAddDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Hinzufügen
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {/* Show configured keys */}
            {configuredAiKeys.map((apiKey) => {
              const provider = AI_PROVIDERS.find(p => p.id === apiKey.api_key_name);
              if (!provider) return null;
              
              const IconComponent = provider.icon;
              
              return (
                <div key={apiKey.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-medium">{provider.name}</h3>
                        <p className="text-sm text-muted-foreground">{provider.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={apiKey.is_active ? "default" : "secondary"}>
                        {apiKey.is_active ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(apiKey)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-muted-foreground">
                    Hinzugefügt: {formatDate(apiKey.created_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Only show Other APIs section if there are any */}
      {OTHER_APIS.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Weitere API-Schlüssel
            </CardTitle>
            <CardDescription>
              Weitere Integrationen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {/* Add buttons for providers that haven't been configured */}
              {OTHER_APIS.map((provider) => {
                const existingKey = apiKeys.find(k => k.api_key_name === provider.id);
                const hasValue = existingKey && existingKey.encrypted_value && existingKey.encrypted_value.trim() !== '';
                
                if (hasValue) return null; // Don't show if already configured
                
                const IconComponent = provider.icon;
                
                return (
                  <div key={provider.id} className="border rounded-lg p-4 border-dashed">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium text-muted-foreground">{provider.name}</h3>
                          <p className="text-sm text-muted-foreground">{provider.description}</p>
                        </div>
                      </div>
                      
                      <Button 
                        size="sm"
                        onClick={() => {
                          setFormData({
                            api_key_name: provider.id,
                            api_provider: 'resend',
                            description: provider.description,
                            encrypted_value: ''
                          });
                          setIsAddDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Hinzufügen
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              {/* Show configured keys */}
              {configuredOtherKeys.map((apiKey) => {
                const provider = OTHER_APIS.find(p => p.id === apiKey.api_key_name);
                if (!provider) return null;
                
                const IconComponent = provider.icon;
                
                return (
                  <div key={apiKey.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-5 w-5 text-primary" />
                        <div>
                          <h3 className="font-medium">{provider.name}</h3>
                          <p className="text-sm text-muted-foreground">{provider.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={apiKey.is_active ? "default" : "secondary"}>
                          {apiKey.is_active ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(apiKey)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-3 text-xs text-muted-foreground">
                      Hinzugefügt: {formatDate(apiKey.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>API Key hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie einen sicheren API-Schlüssel für {getProviderInfo(formData.api_key_name)?.name} hinzu.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="encrypted_value">API Schlüssel</Label>
              <Input
                id="encrypted_value"
                type="password"
                value={formData.encrypted_value}
                onChange={(e) => setFormData(prev => ({ ...prev, encrypted_value: e.target.value }))}
                placeholder={getProviderInfo(formData.api_key_name)?.placeholder}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {getProviderInfo(formData.api_key_name)?.helpText}
              </p>
            </div>

            <div>
              <Label htmlFor="description">Beschreibung (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Zusätzliche Notizen zu diesem API Key..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleAddApiKey}
              disabled={!formData.encrypted_value.trim()}
            >
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>API Key bearbeiten</DialogTitle>
            <DialogDescription>
              Aktualisieren Sie den API-Schlüssel für {getProviderInfo(formData.api_key_name)?.name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_encrypted_value">Neuer API Schlüssel</Label>
              <Input
                id="edit_encrypted_value"
                type="password"
                value={formData.encrypted_value}
                onChange={(e) => setFormData(prev => ({ ...prev, encrypted_value: e.target.value }))}
                placeholder="Neuen API Key eingeben..."
              />
            </div>

            <div>
              <Label htmlFor="edit_description">Beschreibung</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleUpdateApiKey}
              disabled={!formData.encrypted_value.trim()}
            >
              Aktualisieren
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
