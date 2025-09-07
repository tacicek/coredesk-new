import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building2, ArrowLeft, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValidReset, setIsValidReset] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  console.log('=== ResetPasswordPage mounted ===');

  useEffect(() => {
    const handlePasswordReset = async () => {
      console.log('=== Password Reset Debug Info ===');
      console.log('Full URL:', window.location.href);
      console.log('Search params:', window.location.search);
      console.log('Hash params:', window.location.hash);
      
      // Check URL for reset tokens first
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Try to get tokens from different sources
      const accessToken = urlParams.get('access_token') || 
                         urlParams.get('token') || 
                         hashParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token') || 
                          hashParams.get('refresh_token');
      const type = urlParams.get('type') || hashParams.get('type');
      const error = urlParams.get('error') || hashParams.get('error');
      const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
      
      console.log('Parsed tokens:', { 
        accessToken: accessToken ? accessToken.substring(0, 20) + '...' : null,
        hasRefreshToken: !!refreshToken, 
        type,
        error,
        errorDescription
      });

      // Check if there's an error in the URL first
      if (error) {
        console.error('URL contains error:', error, errorDescription);
        toast({
          title: t('common.error'),
          description: errorDescription || 'Şifre sıfırlama linkinde hata oluştu. Lütfen yeni bir link talep edin.',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      if (accessToken && type === 'recovery') {
        try {
          console.log('Attempting to set session with tokens...');
          
          // Set the session using the tokens from the URL
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          console.log('Session result:', { 
            hasSession: !!session, 
            hasUser: !!session?.user,
            error: error?.message 
          });

          if (error) {
            console.error('Session error:', error);
            toast({
              title: t('common.error'),
              description: 'Şifre sıfırlama linkinin süresi dolmuş olabilir. Lütfen yeni bir link talep edin.',
              variant: 'destructive',
            });
            navigate('/login');
            return;
          }

          if (session?.user) {
            console.log('Password reset session established for:', session.user.email);
            setIsValidReset(true);
            // Clear URL parameters to clean up the address bar
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            throw new Error('No session established');
          }
        } catch (error) {
          console.error('Error setting session:', error);
          toast({
            title: t('common.error'),
            description: 'Şifre sıfırlama linkinde sorun oluştu. Lütfen yeni bir link talep edin.',
            variant: 'destructive',
          });
          navigate('/login');
        }
      } else {
        console.log('No valid reset tokens found, checking existing session...');
        
        // Check if user is already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Existing session check:', { hasSession: !!session, hasUser: !!session?.user });
        
        if (!session?.user) {
          console.log('No existing session found - invalid reset link');
          toast({
            title: t('common.error'),
            description: 'Geçersiz şifre sıfırlama bağlantısı',
            variant: 'destructive',
          });
          navigate('/login');
        } else {
          console.log('Found existing session for password reset');
          setIsValidReset(true);
        }
      }
    };

    handlePasswordReset();
  }, [navigate, toast, t]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: t('common.error'),
        description: t('auth.fillAllFields'),
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: t('common.error'),
        description: t('auth.passwordMinLength'),
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: t('common.error'),
        description: 'Şifreler eşleşmiyor',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast({
          title: t('common.error'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Başarılı!',
          description: 'Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz.',
        });
        
        // Sign out to ensure clean state and redirect to login
        await supabase.auth.signOut();
        navigate('/login');
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: 'Şifre güncellenirken bir hata oluştu',
        variant: 'destructive',
      });
    }
    
    setLoading(false);
  };

  // Don't render the form until we validate the reset token
  if (!isValidReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-primary/10 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Şifre sıfırlama bağlantısı kontrol ediliyor...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/login')}
            className="absolute left-4 top-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri
          </Button>
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Şifre Sıfırlama</CardTitle>
          <CardDescription>
            Yeni şifrenizi belirleyin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Yeni Şifre</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <p className="text-sm text-muted-foreground">
                En az 6 karakter olmalı
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Şifre Tekrarı</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}