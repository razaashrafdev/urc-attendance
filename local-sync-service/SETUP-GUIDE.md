# 🚀 URC Attendance Sync - آسان سیٹ اپ گائیڈ

## مرحلہ 1: Python انسٹال کریں (صرف ایک بار)

1. **Python ڈاؤنلوڈ کریں:**
   - جائیں: https://www.python.org/downloads/
   - "Download Python 3.x.x" بٹن پر کلک کریں

2. **انسٹال کریں:**
   - ڈاؤنلوڈ کی ہوئی فائل چلائیں
   - ⚠️ **ضروری:** "Add Python to PATH" کو ✅ چیک کریں
   - "Install Now" پر کلک کریں

3. **چیک کریں:**
   - Command Prompt کھولیں (Win+R, type `cmd`, Enter)
   - لکھیں: `python --version`
   - اگر "Python 3.x.x" آئے تو سب ٹھیک ہے

---

## مرحلہ 2: .env فائل بنائیں

1. **فائل کاپی کریں:**
   - `.env.example` فائل کو کاپی کریں
   - نام بدلیں `.env` (بغیر .example کے)

2. **نوٹ پیڈ میں کھولیں اور ایڈٹ کریں:**

```
# ZKTeco Device کی IP (اپنے ڈیوائس کی IP ڈالیں)
ZKTECO_DEVICE_IP=192.168.1.201

# پورٹ (عام طور پر 4370)
ZKTECO_DEVICE_PORT=4370

# یہ نہ بدلیں - Supabase سیٹنگز
SUPABASE_URL=https://kabarbvtphzaicarelun.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYmFyYnZ0cGh6YWljYXJlbHVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTAxNTUsImV4cCI6MjA4MzUyNjE1NX0.e9e8ekS0_OdYWfmmGoBJK5FM6cQ5wcfXcG05v-V23bs

# ہر کتنی منٹ میں سنک ہو
SYNC_INTERVAL_MINUTES=15
```

3. **فائل سیو کریں** (Ctrl+S)

---

## مرحلہ 3: پہلی بار چلائیں

1. **Dependencies انسٹال کریں:**
   - `INSTALL-FIRST.bat` پر ڈبل کلک کریں
   - انتظار کریں جب تک سب انسٹال نہ ہو جائے

2. **سروس چلائیں:**
   - `RUN-SYNC.bat` پر ڈبل کلک کریں
   - اب ہر 15 منٹ بعد ڈیٹا خود بخود سنک ہوگا

---

## مرحلہ 4: Windows Task Scheduler (خودکار شروع)

1. **Task Scheduler کھولیں:**
   - Win+R دبائیں
   - لکھیں: `taskschd.msc`
   - Enter دبائیں

2. **نیا ٹاسک بنائیں:**
   - دائیں طرف "Create Basic Task" پر کلک کریں
   - نام: `URC Attendance Sync`
   - Next دبائیں

3. **کب چلے:**
   - "When the computer starts" منتخب کریں
   - Next دبائیں

4. **کیا چلے:**
   - "Start a program" منتخب کریں
   - Browse کریں اور `RUN-SYNC.bat` فائل منتخب کریں
   - "Start in" میں folder path ڈالیں
   - Finish دبائیں

✅ اب ہر بار کمپیوٹر شروع ہونے پر سنک خودکار شروع ہوگا!

---

## ⚠️ اہم نوٹس

1. **کمپیوٹر آن رہنا ضروری ہے** - جب تک سنک چلتا رہے
2. **ایک ہی نیٹورک** - کمپیوٹر اور ZKTeco ڈیوائس ایک ہی نیٹورک پر ہونے چاہئیں
3. **Static IP** - ڈیوائس کی IP ایڈریس فکس ہونی چاہیے

---

## 🔧 مسائل اور حل

| مسئلہ | حل |
|-------|-----|
| Python not found | Python دوبارہ انسٹال کریں اور "Add to PATH" چیک کریں |
| Connection refused | ڈیوائس کی IP چیک کریں، نیٹورک چیک کریں |
| No data syncing | ڈیوائس میں یوزرز رجسٹرڈ ہیں؟ |
