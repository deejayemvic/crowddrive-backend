# 🚂 CrowdDrive Railway Deployment Guide

## 🎯 In 10 Minuten online!

---

## ✅ Was du brauchst:

- ✅ Railway Account (hast du schon!)
- ✅ Anthropic API Key (hast du schon!)
- ✅ Diese Backend-Dateien

---

## 🚀 Deployment Schritte:

### **Schritt 1: Neues Projekt erstellen**

1. Gehe zu: https://railway.app/new
2. Klicke **"Deploy from GitHub repo"**
3. ODER klicke **"Empty Project"** (wenn du kein GitHub nutzen willst)

---

### **Schritt 2A: Mit GitHub (empfohlen)**

**Falls du GitHub nutzt:**

1. **Repository erstellen:**
   - Gehe zu https://github.com/new
   - Name: `crowddrive-backend`
   - Public oder Private (egal)
   - Create repository

2. **Code hochladen:**
   ```bash
   cd backend
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/DEIN-USERNAME/crowddrive-backend.git
   git push -u origin main
   ```

3. **Railway verbinden:**
   - Railway: "Deploy from GitHub repo"
   - Wähle dein Repository
   - Deploy!

---

### **Schritt 2B: Ohne GitHub (einfacher!)**

**Falls du KEIN GitHub nutzen willst:**

1. **Railway CLI installieren:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Projekt initialisieren:**
   ```bash
   cd backend
   railway init
   ```

4. **Deployen:**
   ```bash
   railway up
   ```

---

### **Schritt 3: Environment Variables setzen**

**WICHTIG:** API Keys müssen auf Railway gesetzt werden!

1. **Im Railway Dashboard:**
   - Klicke auf dein Projekt
   - Tab **"Variables"**
   - Klicke **"+ New Variable"**

2. **Füge hinzu:**
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-dein-key-hier
   PORT=3000
   NODE_ENV=production
   ```

   ⚠️ **WICHTIG:** Nutze deinen echten Anthropic API Key!

3. **Save** klicken

---

### **Schritt 4: Deploy starten**

**Railway deployed automatisch nach dem Speichern der Variables!**

Du siehst:
```
🚀 Building...
📦 Installing dependencies...
✅ Build successful!
🌐 Deploying...
✅ Deployed!
```

**Dauer:** 2-3 Minuten

---

### **Schritt 5: URL kopieren**

**Nach dem Deployment:**

1. Railway zeigt deine URL:
   ```
   https://crowddrive-backend-production-xxxx.railway.app
   ```

2. **Kopiere diese URL!** Du brauchst sie für die App!

---

### **Schritt 6: Testen**

**Öffne im Browser:**
```
https://deine-railway-url.railway.app/api/health
```

**Sollte zeigen:**
```json
{
  "status": "ok",
  "message": "CrowdDrive Backend v2.0 läuft!",
  "stats": {
    "totalEvents": 0,
    ...
  }
}
```

✅ **Backend läuft!**

---

## 🔧 App-Frontend aktualisieren:

### **Neue Backend-URL in HTML eintragen:**

**Öffne:** `CrowdDrive-APP-FERTIG.html`

**Finde (Strg+F):**
```javascript
const API_URL = 'https://kiyoko-rushiest-wilburn.ngrok-free.dev/api';
```

**Ersetze mit deiner Railway URL:**
```javascript
const API_URL = 'https://deine-railway-url.railway.app/api';
```

**Speichern!**

---

## 🌐 Frontend auf Netlify hochladen:

### **Schritt 1: Zu Netlify**

1. Gehe zu: https://app.netlify.com/
2. **Sign up** (mit GitHub, Google oder Email)
3. Kostenlos!

### **Schritt 2: Site deployen**

1. **"Add new site"** → **"Deploy manually"**
2. **Drag & Drop** deine `CrowdDrive-APP-FERTIG.html` 
3. Netlify gibt dir eine URL:
   ```
   https://crowddrive-xyz123.netlify.app
   ```

### **Schritt 3: Custom Domain (optional)**

Falls du eine eigene Domain hast:
- Settings → Domain management
- Add custom domain

---

## ✅ **FERTIG!**

### **Jetzt läuft:**

✅ **Backend:** Railway (24/7)
```
https://crowddrive-backend-production-xxxx.railway.app
```

✅ **Frontend:** Netlify (24/7)
```
https://crowddrive-xyz123.netlify.app
```

✅ **Datenbank:** SQLite auf Railway

✅ **Automatische Updates:** 
- Montags 06:00: Wöchentliche Suche
- Täglich 09:00: Updates

---

## 💰 **Kosten:**

```
Railway: ~5$/Monat (500h gratis, dann 5$)
Netlify: Kostenlos
Claude API: ~7$/Monat
─────────────────────────────
TOTAL: ~12$/Monat
```

---

## 🔄 **Updates deployen:**

**Wenn du Code änderst:**

**Mit GitHub:**
```bash
git add .
git commit -m "Update"
git push
```
→ Railway deployed automatisch!

**Ohne GitHub (Railway CLI):**
```bash
railway up
```

---

## 📊 **Monitoring:**

**Railway Dashboard zeigt:**
- ✅ CPU/RAM Nutzung
- ✅ Requests pro Minute
- ✅ Logs (Backend-Output)
- ✅ Kosten

**Zugriff:**
```
https://railway.app/project/dein-projekt
```

---

## 🐛 **Troubleshooting:**

### **"Module not found"**

→ Check `package.json` ist mit hochgeladen
→ Railway installiert Pakete automatisch

### **"API Key fehlt"**

→ Check Environment Variables in Railway
→ Müssen GENAU so heißen: `ANTHROPIC_API_KEY`

### **"Database locked"**

→ Restart Service in Railway
→ Settings → Restart

### **"Port already in use"**

→ Railway setzt Port automatisch
→ Dein Code nutzt `process.env.PORT` ✅

---

## 🎉 **Ready!**

Deine App läuft jetzt 24/7 ohne deinen PC!

**URL an Kollegen schicken → Er kann jederzeit nutzen!** 🚕💰

---

## 📞 **Support:**

Railway Docs: https://docs.railway.app/
Netlify Docs: https://docs.netlify.com/

**Viel Erfolg!** 🚀
