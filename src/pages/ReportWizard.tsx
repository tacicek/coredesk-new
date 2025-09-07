import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useVendor } from '@/contexts/VendorContext';
import { ArrowLeft, Send, Bot, User, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  client_name: string;
  service_type: 'web' | 'seo' | 'other';
  status: 'active' | 'completed' | 'paused';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ReportWizard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { vendor } = useVendor();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'prompt' | 'chat' | 'generating'>('prompt');
  const [prompt, setPrompt] = useState('');
  const [aiModel, setAiModel] = useState<'openai' | 'gemini' | 'claude'>('openai');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isWaitingResponse, setIsWaitingResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProject = async () => {
      if (!id || !vendor?.id) return;

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .eq('vendor_id', vendor.id)
          .single();

        if (error) throw error;
        setProject(data as Project);
      } catch (error) {
        console.error('Error loading project:', error);
        toast({
          title: "Fehler",
          description: "Projekt konnte nicht geladen werden",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [id, vendor?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startConversation = async () => {
    if (!prompt.trim() || !project?.id) return;

    setStep('chat');
    setIsWaitingResponse(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-business-report', {
        body: {
          projectId: project.id,
          prompt: prompt.trim(),
          action: 'start_conversation',
          language: 'de',
          aiModel: aiModel
        }
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages([assistantMessage]);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Fehler",
        description: "Gespräch konnte nicht gestartet werden",
        variant: "destructive"
      });
      setStep('prompt');
    } finally {
      setIsWaitingResponse(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isWaitingResponse || !project?.id) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsWaitingResponse(true);

    try {
      // Format conversation for the edge function
      const conversationHistory = messages.concat([userMessage]).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      console.log('Sending conversation:', conversationHistory);

      const { data, error } = await supabase.functions.invoke('generate-business-report', {
        body: {
          projectId: project.id,
          prompt,
          conversation: conversationHistory,
          action: 'continue_conversation',
          language: 'de',
          aiModel: aiModel
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('Edge function response:', data);

      if (data.finished) {
        setStep('generating');
        toast({
          title: "Erfolg",
          description: "Bericht wird erstellt...",
        });
        
        // Navigate to reports after a short delay to show the generated report
        setTimeout(() => {
          navigate(`/dashboard/reports?projectId=${project.id}`);
        }, 2000);
      } else {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Fehler",
        description: error.message || "Nachricht konnte nicht gesendet werden",
        variant: "destructive"
      });
      
      // Remove the user message that failed to process
      setMessages(prev => prev.slice(0, -1));
      setCurrentMessage(userMessage.content);
    } finally {
      setIsWaitingResponse(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-bold mb-4">Bericht wird geladen...</h1>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-bold mb-4">Projekt nicht gefunden</h1>
        <Button onClick={() => navigate('/dashboard/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zu Projekten
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(`/dashboard/projects/${project.id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zum Projekt
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Interaktiver KI-Bericht</h1>
          <p className="text-muted-foreground">{project.name}</p>
        </div>
      </div>

      {step === 'prompt' && (
        <Card>
          <CardHeader>
            <CardTitle>Berichtanfrage stellen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                KI-Modell auswählen
              </label>
              <Select value={aiModel} onValueChange={(value: 'openai' | 'gemini' | 'claude') => setAiModel(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="KI-Modell wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI GPT-5</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="claude">Anthropic Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Was für einen Bericht möchten Sie erstellen?
              </label>
              <Textarea
                placeholder="z.B. Erstelle einen monatlichen SEO-Bericht für den Kunden mit Fortschritten bei Keywords, technischen Optimierungen und nächsten Schritten..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
              />
            </div>
            <Button 
              onClick={startConversation} 
              disabled={!prompt.trim()}
              className="w-full"
            >
              Gespräch starten
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'chat' && (
        <Card className="h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle>Berichtdetails sammeln</CardTitle>
            <p className="text-sm text-muted-foreground">
              Beantworten Sie die Fragen der KI, um einen detaillierten Bericht zu erstellen
            </p>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.map((message, index) => (
                <div 
                  key={index}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div 
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground ml-auto' 
                        : 'bg-muted'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <span className="text-xs opacity-70 mt-2 block">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              
              {isWaitingResponse && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Ihre Antwort..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                disabled={isWaitingResponse}
              />
              <Button 
                onClick={sendMessage} 
                disabled={!currentMessage.trim() || isWaitingResponse}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'generating' && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Bericht wird erstellt</h3>
            <p className="text-muted-foreground mb-4">
              Die KI erstellt basierend auf Ihren Antworten einen detaillierten Bericht...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}