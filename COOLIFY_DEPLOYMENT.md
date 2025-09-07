# Coolify Deployment Guide - Cozy Invoice

Bu rehber, Cozy Invoice uygulamasını Coolify platformuna deploy etmek için gerekli adımları içerir.

## Ön Gereksinimler

1. **Coolify Hesabı**: [Coolify.io](https://coolify.io) üzerinde hesap oluşturun
2. **Git Repository**: Projenizi GitHub, GitLab veya Bitbucket'te barındırın
3. **Supabase Projesi**: Supabase hesabınız ve projeniz hazır olmalı

## 1. Supabase Kurulumu

### Supabase Projesi Oluşturma
1. [Supabase Dashboard](https://supabase.com/dashboard)'a gidin
2. "New Project" butonuna tıklayın
3. Proje adınızı girin (örn: `cozy-invoice`)
4. Güçlü bir veritabanı şifresi belirleyin
5. Bölge seçin (Türkiye için `Europe West` önerilir)

### Supabase Konfigürasyonu
1. Proje oluşturulduktan sonra Settings > API'ye gidin
2. `Project URL` ve `anon public` anahtarını kopyalayın
3. Bu değerleri Coolify environment variables'da kullanacaksınız

## 2. Coolify'da Proje Oluşturma

### Yeni Uygulama Ekleme
1. Coolify dashboard'unuzda "New Application" butonuna tıklayın
2. "Docker Compose" seçeneğini seçin
3. Git repository URL'nizi girin
4. Branch'i seçin (genellikle `main` veya `master`)

### Environment Variables Ayarlama
Coolify'da aşağıdaki environment variables'ları ekleyin:

```bash
# Zorunlu
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_APP_URL=https://your-domain.com

# Opsiyonel
NODE_ENV=production
VITE_APP_NAME=Cozy Invoice
VITE_ENABLE_PWA=true
```

## 3. Domain ve SSL Ayarları

### Custom Domain Ekleme
1. Coolify'da uygulamanızın ayarlarına gidin
2. "Domains" sekmesine tıklayın
3. Domain'inizi ekleyin (örn: `invoice.yourdomain.com`)
4. DNS kayıtlarını domain sağlayıcınızda ayarlayın

### SSL Sertifikası
- Coolify otomatik olarak Let's Encrypt SSL sertifikası sağlar
- Domain doğrulandıktan sonra HTTPS otomatik olarak aktif olur

## 4. Deployment Ayarları

### Build Ayarları
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: `18`

### Port Ayarları
- **Port**: `80` (nginx default port)
- **Health Check**: `/health` endpoint'i kullanılır

## 5. Veritabanı Migrasyonları

### Supabase Migrasyonları
1. Supabase CLI'yi yükleyin:
```bash
npm install -g supabase
```

2. Projenizi link edin:
```bash
supabase link --project-ref your-project-ref
```

3. Migrasyonları çalıştırın:
```bash
supabase db push
```

## 6. Monitoring ve Logs

### Coolify Monitoring
- Coolify dashboard'da real-time logs görüntüleyebilirsiniz
- CPU, Memory ve Network kullanımını izleyebilirsiniz
- Health check durumunu kontrol edebilirsiniz

### Error Tracking
- Browser console'da hataları izleyin
- Supabase dashboard'da database hatalarını kontrol edin

## 7. Backup ve Güvenlik

### Veri Yedekleme
- Supabase otomatik backup sağlar
- Manuel backup için Supabase dashboard'u kullanın

### Güvenlik
- Environment variables'ları güvenli tutun
- Supabase RLS (Row Level Security) politikalarını aktif edin
- API anahtarlarını düzenli olarak rotate edin

## 8. Troubleshooting

### Yaygın Sorunlar

#### Build Hatası
```bash
# Logs'u kontrol edin
# Node version'ı kontrol edin
# Dependencies'leri kontrol edin
```

#### Supabase Bağlantı Hatası
```bash
# Environment variables'ları kontrol edin
# Supabase URL ve key'leri doğrulayın
# Network connectivity'yi test edin
```

#### Domain Erişim Sorunu
```bash
# DNS propagation'ı bekleyin (24-48 saat)
# SSL sertifikası durumunu kontrol edin
# Firewall ayarlarını kontrol edin
```

## 9. Performance Optimizasyonu

### Frontend Optimizasyonu
- Vite build optimizasyonları aktif
- Gzip compression aktif
- Static asset caching aktif
- Service Worker PWA desteği

### Backend Optimizasyonu
- Supabase connection pooling
- Database indexing
- Query optimization

## 10. Güncelleme Süreci

### Yeni Deployment
1. Kod değişikliklerinizi git'e push edin
2. Coolify otomatik olarak yeni build başlatır
3. Health check'ler geçtikten sonra yeni versiyon aktif olur

### Rollback
- Coolify'da önceki versiyona geri dönebilirsiniz
- "Deployments" sekmesinden istediğiniz versiyonu seçin

## Destek

Sorun yaşarsanız:
1. Coolify documentation'ını kontrol edin
2. Supabase documentation'ını kontrol edin
3. GitHub issues'da sorun bildirin

---

**Not**: Bu rehber genel bir kılavuzdur. Spesifik ihtiyaçlarınıza göre ayarlamalar yapmanız gerekebilir.
