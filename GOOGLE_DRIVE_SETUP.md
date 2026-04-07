# Google Drive API - دليل الإعداد الكامل

## 🎯 الهدف
تفعيل Google Drive API وربط تطبيق Wasiyati مع Google Drive لحفظ الرسائل تلقائياً.

---

## ✅ المتطلبات المسبقة

- حساب Google Cloud (مجاني)
- وصول إلى Google Cloud Console
- بيانات اعتماد OAuth 2.0

---

## 📋 خطوات الإعداد الكاملة

### الخطوة 1: إنشاء مشروع Google Cloud

1. **اذهب إلى Google Cloud Console**:
   - https://console.cloud.google.com/

2. **اختر أو أنشئ مشروع**:
   - في الأعلى، اضغط على dropdown "Select a Project"
   - اضغط "NEW PROJECT"
   - أدخل الاسم: `Wasiyati` أو أي اسم تريده
   - اضغط "CREATE"

3. **انتظر إنشاء المشروع** (قد يستغرق دقيقة)

### الخطوة 2: تفعيل Google Drive API

1. **افتح مكتبة الـ APIs**:
   - على اليسار، اضغط "APIs & Services" → "Library"

2. **ابحث عن Google Drive API**:
   - في شريط البحث، اكتب: `Google Drive API`
   - اضغط على "Google Drive API" من النتائج

3. **فعّل الـ API**:
   - اضغط الزر الأزرق "ENABLE"
   - انتظر 10-30 ثانية

### الخطوة 3: إنشاء OAuth 2.0 Credentials

1. **اذهب إلى Credentials**:
   - على اليسار، اضغط "Credentials"

2. **أنشئ OAuth 2.0 Client ID**:
   - اضغط الزر الأزرق "+ CREATE CREDENTIALS"
   - اختر "OAuth 2.0 Client ID"
   - **قد تحتاج أولاً إلى** "OAuth consent screen":
     - إذا طلب منك، اضغط "Configure Consent Screen"
     - اختر "External" للاختبار
     - ملأ المعلومات الأساسية (الاسم كافي)
     - اضغط "SAVE AND CONTINUE" عدة مرات
     - ارجع إلى Credentials

3. **اختر نوع التطبيق**:
   - اختر "Web application"

4. **أضف Authorized Redirect URIs**:
   تحت "Authorized redirect URIs"، أضف:
   - `https://yourdomain.vercel.app/api/auth/callback/google` (للـ Production)
   - `http://localhost:3000/api/auth/callback/google` (للـ Development)

5. **اضغط CREATE**

### الخطوة 4: نسخ الـ Credentials

1. **انسخ Client ID و Secret**:
   - سيظهر نافذة بـ Client ID و Client Secret
   - انسخ كلاهما (سيحتاجهما بعد قليل)
   - يمكنك أيضاً تحميل JSON

---

## 🔑 إضافة Credentials لـ التطبيق

### للـ Development المحلي:

في `.env.local` في جذر المشروع:
```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

### للـ Production (Vercel):

1. **اذهب إلى Vercel**:
   - https://vercel.com/dashboard

2. **اختر المشروع**:
   - اضغط على `wasiyati` أو اسم المشروع

3. **اذهب إلى Settings → Environment Variables**

4. **أضف المتغيرات**:
   ```
   GOOGLE_CLIENT_ID = your_client_id_here
   GOOGLE_CLIENT_SECRET = your_client_secret_here
   ```

5. **اضغط "Save"**

6. **تحديث التطبيق** (Redeploy):
   - في Deployments، اضغط على الثلاث نقاط للـ latest deployment
   - اختر "Redeploy"

---

## 🧪 التحقق من الإعداد

### طريقة 1: استخدام Debug Endpoint (الأسهل)

```
GET /api/admin/debug/google-api
```

يعطيك:
- ✅ إذا كانت الـ credentials موجودة
- ❌ اذا كانت مفقودة أو placeholder
- خطوات الإصلاح

### طريقة 2: اختبر الربط

1. **اذهب إلى التطبيق**:
   - https://wasiyati.vercel.app/dashboard/drive

2. **اضغط "ربط Google Drive الآن"**

3. **في النافذة**:
   - اختر حسابك
   - اضغط "Allow" على جميع الصلاحيات

4. **يجب أن ترى**: ملفاتك من Drive

---

## 🚨 حل رسالة الخطأ

### الخطأ: "Google Drive API has not been used in project XXX before"

**السبب الأول**: API لم تُفعّل بعد
```
الحل:
1. اذهب: https://console.cloud.google.com/apis/library/drive.googleapis.com
2. اضغط "ENABLE"
3. انتظر 1-2 دقيقة
4. جرب الربط مرة أخرى
```

**السبب الثاني**: Credentials من مشروع مختلف
```
الحل:
1. تحقق من أن Client ID و Secret من نفس المشروع
2. تحقق من أن Drive API مفعلة في نفس المشروع
3. استخدم Debug Endpoint للتحقق: /api/admin/debug/google-api
```

**السبب الثالث**: لم تنتشر التغييرات بعد
```
الحل:
1. انتظر 1-2 دقيقة
2. جرب من متصفح مختلف (أو Private Window)
3. أعد تحميل الصفحة (Ctrl+Shift+R)
```

**السبب الرابع**: لا يوجد Billing Account
```
الحل:
1. اذهب: https://console.cloud.google.com/billing
2. تحقق من وجود billing account مرتبط
3. إذا لم يكن موجود، أضف بطاقة ائتمان (مجاني للـ free tier)
```

---

## 📊 Checklist للتحقق

- [ ] مشروع Google Cloud موجود
- [ ] Google Drive API **مفعلة** (تحقق من الـ enabled APIs list)
- [ ] OAuth 2.0 Client ID و Secret تم إنشاؤهما
- [ ] Redirect URIs تمت إضافتها بشكل صحيح
- [ ] Credentials تم وضعها في `.env.local` (dev) أو Vercel (production)
- [ ] التطبيق تم تحديثه (npm run dev أو redeploy)
- [ ] اختبار الربط نجح

---

## 🔗 روابط مهمة

| الوصول | الرابط |
|--------|--------|
| Google Cloud Console | https://console.cloud.google.com/ |
| APIs Library | https://console.cloud.google.com/apis/library |
| Google Drive API | https://console.cloud.google.com/apis/library/drive.googleapis.com |
| Credentials | https://console.cloud.google.com/apis/credentials |
| Billing | https://console.cloud.google.com/billing |
| Vercel Dashboard | https://vercel.com/dashboard |
| OAuth Playground (اختياري) | https://developers.google.com/oauthplayground |

---

## 💡 نصائح

1. **استخدم Scopes صحيحة**: التطبيق يستخدم:
   ```
   - openid
   - email
   - profile
   - https://www.googleapis.com/auth/drive.file
   ```
   (لا تغير هذه)

2. **access_type=offline**: يُطلب لـ Refresh Tokens
   - تم تكوينه بالفعل

3. **prompt=consent**: يفرض ظهور شاشة الموافقة كل مرة
   - مفيد أثناء التطوير

4. **معلومات OAuth اختيارية**:
   - Application name و Logo اختياريان في OAuth Screen

---

## 🐛 Debugging مُتقدم

### إذا استمرت المشكلة:

1. **فعّل Logging مفصل**:
   ```
   GET /api/admin/debug/google-api
   ```
   - يخبرك بالضبط ما الذي قد يكون خطأ

2. **اختبر في OAuth Playground** (للخبراء):
   - https://developers.google.com/oauthplayground
   - استخدم نفس ClientID و Secret
   - جرب OAuth flow يدويًا

3. **تحقق من Logs**:
   - في Vercel: "Deployments" → "Function Logs"
   - ابحث عن رسائل `[Auth]` و `[Drive]`

---

## ❓ الأسئلة الشائعة

**س**: هل استخدام Google Drive مجاني؟
**ج**: نعم، تماماً مجاني (حتى 15 GB مجانية من Google Drive)

**س**: هل بحاجة بطاقة ائتمان؟
**ج**: لا، ما لم تتجاوز حدود الـ free tier

**س**: هل يمكن خزن الرسائل بدون Drive؟
**ج**: نعم، الرسائل تُخزن في قاعدة البيانات دائماً. Drive اختياري للنسخ الاحتياطية

**س**: كم الملفات التي يمكن تخزينها؟
**ج**: 15 GB مجاني، ثم الدفع (أو زيادة الـ storage)

---

## 📞 الدعم

إذا استمرت المشاكل:

1. استخدم Debug Endpoints:
   - `/api/admin/debug/google-api`
   - `/api/admin/debug/drive`
   - `/api/admin/debug/auth-accounts`

2. تحقق من الـ Server Logs

3. جرب في متصفح مختلف أو Private Window

4. إذا بقيت المشكلة، تواصل مع فريق الدعم مع:
   - رسالة الخطأ الكاملة
   - نتيجة Debug Endpoints
   - Screenshot من Google Console
