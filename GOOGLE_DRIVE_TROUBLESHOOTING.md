# حل مشكلة "Access token missing"

## 🔴 المشكلة
رسالة "Access token missing" تظهر حتى بعد ربط Google Drive

## 🔧 الحلول

### السبب الرئيسي
قاعدة البيانات لم تحفظ الـ access token بشكل صحيح أثناء المصادقة

### الحل 1: إعادة المصادقة (الأسرع)

1. **اذهب للصفحة**:
   ```
   https://wasiyati.vercel.app/dashboard/drive
   ```

2. **اضغط "ربط Google Drive الآن"**

3. **في نافذة Google**:
   - اختر حسابك
   - **اقرأ الرسائل بعناية**
   - اضغط "Allow" على جميع الصلاحيات

4. **عد للموقع تلقائياً**

> **ملاحظة مهمة**: تأكد من:
> - تقبلك للصلاحيات (Allow)
> - عدم رفضك لها (Deny)
> - عدم الضغط على "الخروج" في نافذة Google

### الحل 2: التحقق من الحالة (للمسؤول)

#### خطوات الفحص:

1. **استخدم debug endpoint**:
   ```
   GET /api/admin/debug/auth-accounts
   ```
   
   يعطيك معلومات عن جميع الحسابات:
   - ✅ يوجد access token؟
   - ✅ يوجد Drive scope؟
   - ✅ هل انتهت صلاحية التوكن؟

2. **أو استخدم script**:
   ```bash
   npx ts-node scripts/check-accounts.ts
   ```
   
   سيطبع تقرير شامل عن جميع الحسابات

#### ماذا تفعل مع دعم المستخدم من النتائج؟

**إذا كان الناتج**:
```
Access Token: ❌
Refresh Token: ❌
Scope: ❌
```

**اطلب منه**:
- تسجيل خروج كامل
- مسح cookies من المتصفح (اختياري)
- تسجيل دخول جديد
- ربط Google Drive

---

## 🐛 Debugging (للمطورين)

### معرفة سبب الفشل
تحقق من console logs:

```
[Auth] signIn callback - Google account: {
  hasAccessToken: ? 
  hasRefreshToken: ?
  hasScope: ?
}

[Auth] Account saved successfully: {
  hasAccessToken: ?
  hasRefreshToken: ?
}
```

### إذا كان `hasAccessToken: false`:
1. تحقق من Google Console settings
2. تأكد من GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET
3. تحقق من response من Google OAuth

### إذا كان `hasAccessToken: true` لكن لا يعمل:
1. قد تكون صلاحية expired
2. استخدم debug endpoint للتحقق من `expiresAt`
3. اختبر refresh token mechanism

---

## 📋 Checklist للحل

- [ ] إعادة محاولة ربط Google Drive
- [ ] التأكد من رقم المسموح "Allow"
- [ ] فحص debug endpoint
- [ ] التحقق من Google Console credentials
- [ ] التحقق من SERVER environment variables
- [ ] إذا استمرت: اتصل بالمسؤول التقني

---

## جديد في الكود

### تحسينات مضافة:
1. **auth.ts**: استخدام `upsert` بدلاً من `update` لضمان حفظ الـ account
2. **google-drive.ts**: logging تفصيلي لكل خطوة
3. **/api/admin/debug/auth-accounts**: endpoint للفحص الشامل
4. **scripts/check-accounts.ts**: script التشخيص

---

## استكشاف الأخطاء

### رسالة: "No access token found"
```
Account details: {
  scope: "user@gmail.com openid profile email",
  refresh_token: true,
  tokenType: "Bearer"
}
```
✅ **الحل**: المشكلة في حفظ access token، أعد المحاولة

### رسالة: "Drive scope not granted"
```
Account details: {
  access_token: true,
  scope: null,
  refresh_token: true
}
```
✅ **الحل**: لم تُمنح صلاحية Drive، أعد الربط مع Click "Allow"

### رسالة: "Token has been expired"
```
expiresAt: "2026-04-05T10:30:00Z"
```
✅ **الحل**: استخدم refresh token تلقائياً (يتم هذا في الخلفية)
