# 📧 دليل نظام الرسائل والتسليم

## نظرة عامة

نظام الرسائل في وصيتي يدعم:
- ✅ **البريد الإلكتروني (EMAIL)** - عبر Resend (مُفعَّل بالكامل)
- 🔄 **الرسائل النصية (SMS)** - معدة للتكامل (Twilio/AWS SNS)
- 🔄 **WhatsApp** - معدة للتكامل (Twilio WhatsApp API)

## أنواع الرسائل (Trigger Types)

| النوع | الوصف | التفعيل |
|------|-------|--------|
| **SWITCH** | رسائل الوصية - تُرسل عند انقضاء مدة عدم التسجيل | آلي حسب مدة الخمول |
| **DATE** | رسائل مجدولة - تُرسل في وقت محدد | في الوقت المحدد |
| **KEYHOLDER** | رسائل الشاهد الموثوق - للإخطارات | نأ† من مؤشرات معينة |

## سير العمل الكامل

### 1. إنشاء الرسالة
```
عبر Dashboard → Messages → New Message
- عنوان الرسالة
- محتوى الرسالة
- نوع التفعيل (SWITCH/DATE/KEYHOLDER)
- المستقبلون والقوانات المراد الإرسال عليها
```

### 2. تحديد الوقت (للرسائل المجدولة)
```
اختر triggerType = DATE أو أضف scheduledAt لأي نوع:
- الوقت المحلي أو UTC
- يمكن تحديد وقت واحد أو متعدد
```

### 3. الحفظ في الدرايف
```
كل رسالة تُحفظ تلقائيا في Google Drive
- المجلد: Wasiyati Backups/Messages/
- اسم الملف: message-{id}-{timestamp}.json
```

### 4. معالجة الرسائل
```
يحدث كل يوم في الساعة 8 صباحاً UTC:
- processDateTriggers(): يتحقق من الوقت المجدول
- triggerMessages(): يرسل الرسائل عبر جميع القوانات
```

### 5. تتبع الحالة
```
كل مستقبل له حالة:
- PENDING = لم يتم الإرسال بعد
- SENT = تم الإرسال
- DELIVERED = تم التسليم
- FAILED = فشل الإرسال
```

## اختبار الرسائل

### الطريقة 1: عبر واجهة الاختبار (الأسهل)

```
اذهب إلى: /dashboard/test

خطوات الاختبار:
1. انقر "تحميل الرسائل" - سيتم جلب جميع الرسائل النشطة
2. اختر رسالة من القائمة
3. (اختياري) حدد قناة محددة للاختبار
4. انقر "أرسل الآن" 
5. شاهد النتائج مباشرة
```

### الطريقة 2: عبر API

```bash
# تحميل الرسائل المتاحة
curl -H "Cookie: <session-cookie>" \
  "http://localhost:3000/api/admin/test/send-message?isActive=true"

# إرسال رسالة محددة
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{
    "messageId": "message-uuid",
    "channelFilter": "EMAIL"  // اختياري
  }' \
  "http://localhost:3000/api/admin/test/send-message"
```

### الطريقة 3: تشغيل المعالج اليدوي

```bash
# يمكن استدعاء المعالج يدويا عبر:
curl "http://localhost:3000/api/cron/process-switches"
```

## الاستجابة والنتائج

```json
{
  "success": true,
  "messagesFound": 1,
  "messagesTriggered": 1,
  "details": [
    {
      "messageId": "msg-123",
      "title": "رسالة الوداع",
      "triggerType": "DATE",
      "recipientCount": 2,
      "channels": ["EMAIL", "SMS"],
      "success": true,
      "deliveryStatus": [
        {
          "channel": "EMAIL",
          "count": 2,
          "status": "SENT"
        },
        {
          "channel": "SMS",
          "count": 2,
          "status": "SENT"  // مُعدة للتكامل
        }
      ]
    }
  ],
  "summary": {
    "total": 1,
    "succeeded": 1,
    "failed": 0,
    "tested_at": "2024-01-15T10:30:00Z"
  }
}
```

## معلومات التكامل

### البريد الإلكتروني ✅ (مُفعَّل)
```
المزود: Resend API
الإعدادات:
  - API Key: RESEND_API_KEY
  - بريد الإرسال: EMAIL_FROM
  - القالب: HTML مخصص بـ RTL للعربية

الدالة: sendEmail() في lib/email.ts
الملف: src/lib/email.ts
```

### SMS 🔄 (معدة للتكامل)
```
المزود الموصى به: Twilio أو AWS SNS
خطوات التكامل:
  1. اشترك في المزود
  2. أضف credentials في متغيرات البيئة
  3. حدّث triggerMessages() في lib/switch-engine.ts
  
مثال مع Twilio:
const twilio = require('twilio')(accountSid, authToken);
await twilio.messages.create({
  body: messageContent,
  from: '+1234567890',
  to: recipientPhone
});
```

### WhatsApp 🔄 (معدة للتكامل)
```
المزود الموصى به: Twilio WhatsApp Business API
خطوات التكامل:
  1. قم بتكوين Twilio WhatsApp Business Account
  2. تحقق من أرقام الهاتف
  3. أنشئ template messages
  4. حدّث triggerMessages() لاستخدام Twilio API

ملاحظة: يتطلب موافقة من Meta/WhatsApp
```

## مراقبة وتشخيص

### عرض حالة الرسائل

```bash
# دخول admin dashboard
/admin

# عرض إحصائيات الرسائل
GET /api/admin/stats

# تصحيح الأخطاء
GET /api/admin/debug/messages?userId=user-id
```

### السجلات (Logs)

```
البحث عن:
- [Message Engine] = معالجة الرسائل
- [Switch Engine] = معالجة الخيار
- ✅ = نجح
- ❌ = فشل
- ⚠️ = تحذير
```

## حل المشاكل

### المشكلة: الرسائل لا تُرسل
```
✓ تحقق من حالة الرسالة (يجب أن تكون ACTIVE)
✓ تحقق من وقت scheduledAt (إن وجد)
✓ تحقق من أن المستقبلين لديهم بريد/هاتف صحيح
✓ شغّل /api/cron/process-switches يدويا
✓ اطّلع على السجلات في console
```

### المشكلة: بعض القوانات لا تعمل
```
EMAIL: تحقق من RESEND_API_KEY
SMS: لم يتم التكامل بعد - اتبع خطوات التكامل أعلاه
WhatsApp: لم يتم التكامل بعد - اتبع خطوات التكامل أعلاه
```

### المشكلة: الرسائل تُرسل مرتين
```
✓ تحقق من أن الرسالة لم تُعدّل بعد الإرسال
✓ تحقق من عدم استدعاء /api/cron/process-switches مرتين
✓ راجع getSwitchStatus() في switch-engine.ts
```

## قائمة الملفات ذات الصلة

```
lib/
  ├── switch-engine.ts      # محرك الخيار والرسائل
  ├── email.ts              # إرسال البريد
  └── google-drive.ts       # حفظ في الدرايف

app/api/
  ├── admin/test/send-message/route.ts  # اختبار الرسائل
  ├── cron/process-switches/route.ts     # المعالج اليومي
  └── messages/route.ts                  # إنشاء الرسائل

app/dashboard/
  └── test/page.tsx         # صفحة الاختبار
```

## متغيرات البيئة المطلوبة

```env
# البريد الإلكتروني (مطلوب)
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@example.com

# Google Drive (لحفظ الملفات)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
DATABASE_URL=postgresql://...

# SMS (عند التكامل)
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=xxx

# WhatsApp (عند التكامل)
TWILIO_WHATSAPP_FROM=whatsapp:+xxx
```

## الملخص

| الحالة | البريد | SMS | WhatsApp |
|-------|-------|-----|----------|
| التطوير | ✅ | 🔄 معدة | 🔄 معدة |
| الاختبار | ✅ | ✅ | ✅ |
| الإنتاج | ✅ | 🔄 تحتاج تكامل | 🔄 تحتاج تكامل |

---

**آخر تحديث:** 2024-01-15
**الإصدار:** 1.0
