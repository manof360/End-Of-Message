# Google Drive المشاكل الشائعة والحلول

## 🔴 خطأ: "Google Drive API has not been used in project XXX"

### الرسالة الكاملة:
```
Google Drive API has not been used in project 138381515471 before or it is disabled.
Enable it by visiting https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=138381515471 
then retry. If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry.
```

### 🎯 الحل الفوري:

**الطريقة 1: من الرابط المباشر** (الأسهل)
1. انسخ الرابط من الخطأ: `https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=138381515471`
2. الصقه في المتصفح
3. اضغط الزر الأزرق "ENABLE"
4. انتظر 30 ثانية لـ 2 دقيقة
5. عد إلى التطبيق وحاول مرة أخرى

**الطريقة 2: من Google Cloud Console**
1. اذهب إلى: https://console.cloud.google.com/
2. أعلى الصفحة، تأكد أن اسم المشروع صحيح (الرقم 138381515471 أو أي رقم يظهر في الخطأ)
3. على اليسار: "APIs & Services" → "Library"
4. ابحث عن: `Google Drive API`
5. اضغط عليها
6. اضغط الزر الأزرق "ENABLE"
7. انتظر التأكيد (checkpoint أزرق)

---

## 🔴 خطأ: "API Key not valid"

### السبب:
GOOGLE_CLIENT_ID أو GOOGLE_CLIENT_SECRET خطأ

### الحل:
1. تحقق من `.env.local` (للـ local testing)
   - تأكد أن GOOGLE_CLIENT_ID صحيح (يجب أن ينتهي بـ `.apps.googleusercontent.com`)
   - تأكد أن ليس `"placeholder"`

2. للـ Production (Vercel):
   - اذهب إلى Vercel → Settings → Environment Variables
   - تحقق من القيم
   - إذا كانت خطأ، عدّلها وأعد الـ deploy

3. انسخ القيم من Google Console:
   - https://console.cloud.google.com/apis/credentials
   - اعثر على "OAuth 2.0 Client ID"
   - انسخ القيم بالضبط

---

## 🔴 خطأ: "Redirect URI mismatch"

### السبب:
الـ Redirect URI في Google Console لا يطابق تطبيقك

### الحل:
1. اذهب إلى: https://console.cloud.google.com/apis/credentials
2. اضغط على OAuth 2.0 Client ID
3. تحقق من "Authorized redirect URIs"
4. أضف:
   - للـ Local: `http://localhost:3000/api/auth/callback/google`
   - للـ Production: `https://yourdomain.vercel.app/api/auth/callback/google`
5. اضغط "SAVE"

---

## 🔴 خطأ: "Insufficient Permissions"

### السبب:
المستخدم لم يمنح صلاحية Drive

### الحل:
1. **اضغط "ربط Google Drive الآن"** من Dashboard
2. **في نافذة Google**، اضغط "Allow" إذا ظهرت شاشة الموافقة
3. إذا لم تظهر شاشة الموافقة:
   - تحقق من التطبيق يستخدم `prompt=consent` (مُفعل بالفعل)
   - جرب Sign Out و Sign In مرة أخرى

---

## 🔴 خطأ: "Invalid Grant" أو "Token has expired"

### السبب:
Google refresh token انتهى

### الحل:
1. **Sign Out** من التطبيق
2. **Clear Cookies** (اختياري):
   - في المتصفح Ctrl+Shift+Delete
   - اختر "Cookies"
   - حذف cookies من wasiyati.vercel.app

3. **Sign In مرة أخرى**
4. **ربط Google Drive**

---

## 🟡 تحذير: "Waiting for Drive scope"

### السبب:
API مفعلة لكن الـ scope لم تحفظ بعد

### الحل:
- انتظر 1-2 دقيقة
- حاول من private/incognito window
- أعد تحميل الصفحة (Ctrl+Shift+R)

---

## 🔍 كيفية الفحص والتشخيص

### استخدم Debug Endpoints:

#### 1. فحص الـ Google API Status:
```
GET /api/admin/debug/google-api
```
سيخبرك:
- ✅ هل الـ credentials موجودة؟
- ✅ هل مكتملة؟
- ✅ هل API مفعلة؟

#### 2. فحص حسابات المستخدمين:
```
GET /api/admin/debug/auth-accounts
```
سيخبرك:
- ✅ كم حساب Google موجود؟
- ✅ كم منهم عندهم access token؟
- ✅ كم منهم عندهم Drive scope؟

#### 3. فحص حالة Drive:
```
GET /api/admin/debug/drive
```
سيخبرك:
- ✅ هل يمكن الوصول إلى Drive؟
- ✅ هل يمكن إنشاء folder؟
- ✅ تفاصيل العطل إن وجد

---

## 📊 Checklist للإصلاح الكامل

### الخطوة الأولى: التحقق من الإعداد
- [ ] اذهب إلى `/api/admin/debug/google-api`
- [ ] اقرأ النتيجة بعناية
- [ ] تابع الخطوات المقترحة

### الخطوة الثانية: تفعيل API
- [ ] اذهب إلى Google Cloud Console
- [ ] اختر المشروع الصحيح (تحقق من الرقم)
- [ ] فعّل Google Drive API
- [ ] انتظر 1-2 دقيقة

### الخطوة الثالثة: تحديث Credentials
- [ ] انسخ GOOGLE_CLIENT_ID
- [ ] انسخ GOOGLE_CLIENT_SECRET
- [ ] حدّث في `.env.local` (local) أو Vercel (production)

### الخطوة الرابعة: اختبار الربط
- [ ] Sign Out من التطبيق
- [ ] Sign In مرة أخرى
- [ ] اضغط "ربط Google Drive الآن"
- [ ] تأكد من النقر "Allow"

### الخطوة الخامسة: التحقق النهائي
- [ ] يجب أن ترى ملفاتك من Drive
- [ ] اختبر إنشاء رسالة جديدة
- [ ] يجب أن تظهر في Drive folder

---

## 💡 نصائح إضافية

### 1. استخدم Private Window للاختبار
```
- تمنع tTثير Cache
- تمنع تأثير cookies قديمة
- أفضل لاختبار OAuth flow
```

### 2. استخدم Google OAuth Playground (للخبراء)
```
- اذهب: https://developers.google.com/oauthplayground
- جرب الـ flow يدويًا
- اقبض على الأخطاء بسهولة
```

### 3. فعّل Billing (إذا احتجت)
```
- بعض المشاريع تحتاج billing account
- حتى لو كنت في الـ free tier
- اذهب: https://console.cloud.google.com/billing
```

---

## 🚀 الحل الجذري (إذا فشل كل شيء)

1. **حذف المشروع القديم**:
   - https://console.cloud.google.com/
   - اضغط ثلاث نقاط → Delete
   - اكتب اسم المشروع للتأكيد

2. **إنشاء مشروع جديد من الصفر**:
   - اتبع: [GOOGLE_DRIVE_SETUP.md](GOOGLE_DRIVE_SETUP.md)

3. **استنساخ الـ Credentials**:
   - انسخ Client ID و Secret الجديد
   - حدّث في `.env.local` و Vercel

---

## 📞 الدعم

إذا استمرت المشاكل:

1. **خذ Screenshots من**:
   - Error message الكامل من التطبيق
   - Google Cloud Console (APIs page)
   - نتيجة `/api/admin/debug/google-api`

2. **شغّل Script**:
   ```bash
   npm run check-accounts
   ```
   - أرسل النتيجة

3. **اتصل بفريق الدعم** مع:
   - Screenshots
   - Script output
   - خطوات ما فعلته حتى الآن
