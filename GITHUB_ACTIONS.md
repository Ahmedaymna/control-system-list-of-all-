# 🚀 GitHub Actions Build Guide

## Workflows المتاحة

| Workflow | الملف | متى يشتغل |
|----------|-------|-----------|
| **Build APK via EAS** | `build-android.yml` | Push على main/master أو يدوياً |
| **Build APK Locally (No EAS)** | `build-apk-local.yml` | يدوياً فقط |

---

## إعداد EAS Build (الطريقة الأسهل)

### 1. أنشئ حساب على expo.dev
```
https://expo.dev/signup
```

### 2. احصل على EXPO_TOKEN
- افتح: https://expo.dev/accounts/[username]/settings/access-tokens
- اضغط **Create Token**
- انسخ الـ token

### 3. أضفه كـ GitHub Secret
```
GitHub Repo → Settings → Secrets and variables → Actions → New repository secret
Name:  EXPO_TOKEN
Value: [الـ token الذي نسخته]
```

### 4. شغّل الـ Workflow
- افتح **Actions** في GitHub
- اختر **Build Android APK**
- اضغط **Run workflow**
- اختر `preview` للـ APK أو `production` للـ AAB

---

## Build محلي بدون EAS (No Account Needed)

يحتاج فقط أن تشغّله يدوياً:

```
GitHub → Actions → Build APK Locally (No EAS) → Run workflow
```

بعد الانتهاء، APK يظهر في **Artifacts** بنفس الصفحة.

---

## ملاحظات

- **preview** → ينتج APK قابل للتثبيت مباشرة
- **production** → ينتج AAB للرفع على Play Store
- الـ EAS build يحفظ الـ APK على خوادم Expo لمدة 30 يوم
- الـ Local build يحفظ الـ APK كـ GitHub Artifact لمدة 7 أيام

---

## الأصوات في التطبيق

الأصوات مدمجة عبر `utils/SoundManager.ts` وتعمل تلقائياً:

| الصوت | متى يُشغَّل |
|-------|-------------|
| `click` | الضغط على التبويبات، الفلاتر، CPU Governor |
| `confirm` | إتمام Action بنجاح، Clear Cache، Force Doze |
| `danger` | Kill Process، Block Connection، Reboot، Block Internet |
| `swipe` | فتح Globe، إغلاق Drawer، قلب البطاقة |

لا تحتاج ملفات صوت خارجية — الأصوات مولّدة برمجياً كـ PCM داخل الـ bundle.
