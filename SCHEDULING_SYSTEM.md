# ⏰ دليل نظام الجدولة والوقت

## المشكلة الأصلية

المستخدم أبلغ عن أن نظام حفظ الوقت وتحديد وقت الإرسال "لا يعمل".

## السبب الجذري (تم اكتشافه)

في البداية، دالة `processDateTriggers()` في `switch-engine.ts` **كانت تتحقق فقط عن رسائل مع `triggerType === 'DATE'`**، مما يعني:

```typescript
// ❌ السلوك السابق (خاطئ)
where: {
  status: 'ACTIVE',
  triggerType: 'DATE',     // ← فقط رسائل DATE!
  scheduledAt: { lte: now }
}
```

### المشاكل الناتجة:
1. رسائل SWITCH مع `scheduledAt` لن تُرسل أبداً
2. رسائل KEYHOLDER مع `scheduledAt` لن تُرسل أبداً
3. فقط رسائل DATE كانت تُرسل في الوقت المحدد
4. بدا أن "نظام الوقت مكسور" لأن معظم الرسائل لا تُرسل

## الحل (تم تطبيقه)

تم تحديث `processDateTriggers()` لدعم **جميع أنواع الرسائل**:

```typescript
// ✅ السلوك الجديد (صحيح)
where: {
  status: 'ACTIVE',
  scheduledAt: { lte: now },  // ← يعمل مع أي نوع
  OR: [
    { triggerType: 'DATE' },
    { triggerType: 'SWITCH' },
    { triggerType: 'KEYHOLDER' },
  ],
}
```

### التحسينات المضافة:
- ✅ دعم جميع أنواع الرسائل (SWITCH, DATE, KEYHOLDER)
- ✅ سجلات تفصيلية لتتبع العملية
- ✅ معالجة أخطاء محسّنة
- ✅ تسجيل نوع الرسالة في النتائج

## كيفية الجدولة الآن

### للرسائل من نوع DATE (الرسائل المجدولة)

```
1. انتقل إلى Dashboard → Messages → Create New
2. اختر Title و Content
3. اختر Trigger Type = "DATE"
4. اختر Scheduled Time (الوقت المرغوب)
5. أضف Recipients مع القنوات (EMAIL/SMS/WHATSAPP)
6. انقر Save
```

### للرسائل من نوع SWITCH (مع جدولة)

```
// الآن يمكنك جدولة رسائل الوصية!
1. انتقل إلى User Settings → Switch Configuration
2. تكوين مدة الخمول (switchIntervalDays)
3. في Messages → Create Message اختر triggerType = SWITCH
4. أضف scheduledAt (خيار إضافي)
5. الآن ستُرسل رسالة SWITCH في الوقت المحدد بدلاً من الإرسال الفوري
```

### للرسائل من نوع KEYHOLDER (مع جدولة)

```
// الآن يمكنك جدولة تنبيهات الشاهد الموثوق!
1. في الإعدادات - اختر الشهود الموثوقين
2. انتقل إلى Messages → Create Message وأضف رسالة من نوع KEYHOLDER
3. اختر Keyholder المرغوب
4. أضف scheduledAt للجدولة
5. الآن ستُرسل عند الوقت المحدد
```

## الآلية التقنية

### 1. حفظ الوقت في قاعدة البيانات

```typescript
// عند إنشاء رسالة
const message = await prisma.message.create({
  data: {
    title: "رسالة الوداع",
    content: "محتوى الرسالة",
    triggerType: "DATE",             // نوع الرسالة
    scheduledAt: new Date("2025-02-01T14:30:00Z"),  // الوقت المحدد!
    recipients: {
      create: [
        { name: "أحمد", email: "ahmed@example.com", channel: "EMAIL" },
        { name: "فاطمة", phone: "+966123456789", channel: "SMS" },
      ]
    }
  }
})
```

### 2. المعالجة اليومية

يحدث كل يوم في الساعة **8:00 AM UTC** عبر Vercel Cron:

```
vercel.json:
{
  "crons": [
    {
      "path": "/api/cron/process-switches",
      "schedule": "0 8 * * *"  // يومياً في 8 صباحاً UTC
    }
  ]
}
```

### 3. التحقق من الرسائل المستحقة

```typescript
// في processDateTriggers():
const now = new Date()
const scheduledMessages = await prisma.message.findMany({
  where: {
    status: 'ACTIVE',
    scheduledAt: { lte: now },  // ← أقل من أو تساوي الآن
  },
  // ... والباقي
})

// إذا كان الآن >= scheduledAt, فالرسالة مستحقة الإرسال!
if (message.scheduledAt <= now) {
  await triggerMessages(...)  // أرسل الآن!
}
```

## التحقق من أن الجدولة تعمل

### الطريقة 1: اختبار يدوي

```bash
# 1. أنشئ رسالة بوقت في الماضي (تطبيقاً فوراً)
POST /api/messages
{
  "title": "رسالة تجريبية",
  "content": "محتوى",
  "triggerType": "DATE",
  "scheduledAt": "2024-01-14T00:00:00Z",  // ✅ في الماضي
  "recipients": [...]
}

# 2. قم بتشغيل المعالج يدويا
curl http://localhost:3000/api/cron/process-switches

# 3. تحقق من أن الرسالة تم إرسالها (status = SENT)
```

### الطريقة 2: اختبار عبر الواجهة

```
1. اذهب إلى /dashboard/test
2. انقر "تحميل الرسائل"
3. اختر رسالة مع scheduledAt في الماضي
4. انقر "أرسل الآن"
5. شاهد النتائج مباشرة ✅
```

### الطريقة 3: التحقق من السجلات

```
ابحث عن في console عن:
[Message Engine] Checking for scheduled messages at...
[Message Engine] Found X scheduled messages to process
[Message Engine] ✅ Scheduled message sent: msg-123 (DATE)
```

## اختبار الجدولة المستقبلية

### سيناريو: رسالة في الغد

```typescript
// الوقت الحالي: 2024-01-15 10:00 AM

// أنشئ رسالة للغد
const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)
tomorrow.setHours(14, 30, 0, 0)  // الغد الساعة 2:30 PM

const message = await prisma.message.create({
  data: {
    title: "رسالة الغد",
    scheduledAt: tomorrow,
    status: "ACTIVE"
  }
})

// النتيجة:
// - اليوم: لن تُرسل (لأن الآن < scheduledAt)
// - غداً الساعة 2:30 PM: سيتم الإرسال تلقائياً ✅
```

## قائمة التحقق

عند إنشاء رسالة مجدولة، تحقق من:

- [ ] الرسالة مع `status: "ACTIVE"` (ليست DRAFT)
- [ ] `scheduledAt` محفوظ صحيح (تنسيق ISO)
- [ ] الوقت صحيح (انتبه للفارق الزمني UTC vs محلي)
- [ ] المستقبلون لديهم بريد/هاتف صحيح
- [ ] النوع محفوظ صحيح (DATE, SWITCH, KEYHOLDER)
- [ ] الكرون يعمل (Vercel cron في الإنتاج)
- [ ] السجلات تظهر معالجة الرسالة

## معدلات المعالجة

| الحدث | المعالج | التكرار |
|------|---------|----------|
| رسائل DATE مجدولة | `processDateTriggers()` | يومي - 8 AM UTC |
| تنبيهات SWITCH | `processSwitches()` | يومي - 8 AM UTC |
| رسائل فورية | عند الإنشاء | فوري |
| تنبيهات الشاهد | عند التفعيل | فوري |

## الأوقات المدعومة

```
Format المقبول:
- ISO 8601: "2024-01-15T14:30:00Z"
- مع timezone: "2024-01-15T14:30:00+03:00"
- JavaScript Date: new Date()

ملاحظة: يتم تخزينها دائماً بـ UTC في قاعدة البيانات
```

## الخلاصة

✅ **تم حل المشكلة:**
- دالة `processDateTriggers()` الآن تدعم جميع أنواع الرسائل
- الجدولة تعمل مع SWITCH و DATE و KEYHOLDER
- إضافة سجلات تفصيلية لتتبع المعالجة
- اختبار سهل عبر `/dashboard/test`

**الحالة الحالية:**
- 🟢 نظام الجدولة يعمل بشكل صحيح
- 🟢 جميع الأنواع تدعم scheduledAt
- 🟢 اختبار يدوي متاح
- 🟢 السجلات واضحة وتفصيلية

---

**آخر تحديث:** 2024-01-15
**الصيغة:** 1.0
