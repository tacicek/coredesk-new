import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeatureAccessDeniedProps {
  featureName: string;
  description?: string;
}

export default function FeatureAccessDenied({ featureName, description }: FeatureAccessDeniedProps) {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Zugriff verweigert</h2>
          <p className="text-muted-foreground mb-4">
            Sie haben keine Berechtigung für das Modul "{featureName}".
            {description && ` ${description}`}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Wenden Sie sich an Ihren Administrator, um diese Funktion zu aktivieren.
          </p>
          <Button onClick={handleGoBack} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zum Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}