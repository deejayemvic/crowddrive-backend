// CrowdDrive Backend Server v2.0
// Mit Datenbank-Caching für kosteneffiziente Event-Verwaltung
// Fokus: KLEINE Events für Taxifahrer

const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const cron = require('node-cron');
require('dotenv').config();

const db = require('./database');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'ngrok-skip-browser-warning']
}));
app.use(express.json());

// ngrok browser warning bypass
app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    next();
});

// Anthropic Client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('🚀 CrowdDrive Backend v2.0 startet...');
console.log(`🔑 Anthropic API Key: ${process.env.ANTHROPIC_API_KEY ? '✅ Gesetzt' : '❌ FEHLT!'}`);

// ========================================
// EVENT-SUCHE MIT CLAUDE
// ========================================

async function findEventsWithClaude(searchType = 'weekly') {
    console.log(`🔍 Claude ${searchType} Suche gestartet...`);
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const timeStr = now.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
    });

    let prompt = '';
    
    if (searchType === 'weekly') {
        prompt = `Du bist Event-Scout für Taxifahrer in München.

HEUTE: ${dateStr}, ${timeStr}

🎯 MISSION: Finde Events für die NÄCHSTEN 7 TAGE mit FOKUS auf KLEINE VENUES!

⭐ WARUM KLEINE EVENTS WICHTIG SIND:
Taxifahrer kennen FC Bayern & Messen bereits. Der ECHTE Wert sind kleine Events die niemand kennt!
An einem ruhigen Dienstag macht eine Comedy Show mit 80 Leuten den Unterschied!

🔥 PRIORITÄT 1 - KLEINE VENUES (30-500 Besucher):
- Comedy Shows in Bars/Cafés (Vereinsheim, Lustspielhaus, etc.)
- Poetry Slams
- Jazz/Blues Sessions (Unterfahrt, Jazzbar Vogler)
- Live-Musik in Bars (Atomic Cafe, Strom, etc.)
- Open Mic Nights
- Pub Quiz Events
- Underground Club Nights (kleine Clubs!)
- Vernissagen & Kunstevents
- Lesungen in Buchläden
- Food Pop-Ups mit Events

⚡ PRIORITÄT 2 - MITTELGROSSE (500-5000):
- Backstage, Muffatwerk, Ampere
- Circus Krone, GOP Varieté
- Volkstheater, Deutsches Theater

💼 PRIORITÄT 3 - GROSSE (nur kurz):
- FC Bayern (nur erwähnen)
- Messen (nur erwähnen)

🌐 WO SUCHEN:
Facebook Events München, Instagram #MucEvents, muenchen.de, Eventbrite

WICHTIG - KOSTEN-OPTIMIERUNG:
- Maximal 5-7 strategische Web-Searches!
- Fokus auf Quellen mit vielen kleinen Events
- Ziel: 30-50 Events (davon 60% kleine Venues!)

AUSGABE (JSON):
[
  {
    "name": "Event Name",
    "location": "Venue",
    "address": "Straße, München",
    "lat": 48.xxxx,
    "lng": 11.xxxx,
    "date": "2025-02-01",
    "time": "20:00",
    "endTime": "23:00",
    "capacity": 80,
    "type": "Comedy/Jazz/Club/Poetry/etc",
    "demand": "high/medium/low",
    "description": "Kurz"
  }
]

DEMAND BEWERTUNG (zeitbasiert!):
- Event endet in <2h → HIGH (egal wie klein!)
- Event läuft gerade → MEDIUM/HIGH
- Event heute später → MEDIUM
- Event morgen+ → LOW (außer sehr groß)
- Kleine Events <500 die spät enden (>22 Uhr) → +1 Stufe

NUR JSON zurückgeben, keine Erklärungen!`;
        
    } else {
        // TÄGLICHES UPDATE - nur spontane neue Events
        prompt = `Du bist Event-Scout für Taxifahrer in München.

HEUTE: ${dateStr}, ${timeStr}

🎯 MISSION: Finde NEUE/SPONTANE Events für HEUTE die seit gestern dazugekommen sind!

🔥 FOKUS: Kurzfristige kleine Events!
- Gerade auf Instagram/Facebook gepostet
- Last-Minute Ankündigungen
- Spontane DJ-Sets
- Private Partys in Bars
- Pop-Up Events

WICHTIG:
- Nur 2-3 Web-Searches (Kosten sparen!)
- Nur Events die NEU sind (nicht von gestern)
- Fokus: kleine Venues (<500 Leute)

AUSGABE: Gleiche JSON-Struktur wie oben.
Falls NICHTS NEUES: Leeres Array [] zurückgeben.

NUR JSON, keine Erklärungen!`;
    }

    try {
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            tools: [{
                type: "web_search_20250305",
                name: "web_search"
            }],
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        // Verarbeite alle Content-Blöcke
        let responseText = '';
        for (const block of message.content) {
            if (block.type === 'text') {
                responseText += block.text;
            }
        }
        
        console.log('📥 Claude Antwort erhalten');
        
        // Extrahiere JSON
        let jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            jsonMatch = [responseText];
        }
        
        const events = JSON.parse(jsonMatch[0]);
        console.log(`✅ ${events.length} Events gefunden (${searchType})`);
        
        return events;
        
    } catch (error) {
        console.error('❌ Claude API Fehler:', error.message);
        throw error;
    }
}

// ========================================
// INTELLIGENTE EVENT-VERWALTUNG
// ========================================

async function getRelevantEvents(currentTimeStr) {
    const today = new Date().toISOString().split('T')[0];
    
    // Prüfe ob Events in DB
    const hasEvents = db.hasEventsForDate(today);
    
    if (!hasEvents) {
        console.log('💾 Keine Events in DB - starte Suche...');
        await refreshEvents('weekly');
    }
    
    // Berechne Zeitfenster (2h vor bis 6h nach aktueller Zeit)
    const now = new Date();
    const minTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2h vorher
    const maxTime = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6h später
    
    const minTimeStr = minTime.toTimeString().slice(0, 5);
    const maxTimeStr = maxTime.toTimeString().slice(0, 5);
    
    // Hole Events aus DB mit Filter
    const allEvents = db.getEvents({
        date: today,
        minTime: minTimeStr,
        maxTime: maxTimeStr
    });
    
    console.log(`📊 ${allEvents.length} relevante Events geladen`);
    
    return allEvents;
}

async function refreshEvents(searchType) {
    try {
        const events = await findEventsWithClaude(searchType);
        
        if (events.length > 0) {
            // Speichere in DB
            db.saveEvents(events, searchType);
            
            // Speichere Metadaten
            const costEstimate = searchType === 'weekly' ? 0.75 : 0.15;
            db.saveSearchMetadata(searchType, events.length, costEstimate);
            
            console.log(`💰 Kosten geschätzt: $${costEstimate}`);
        }
        
        return events;
        
    } catch (error) {
        console.error('❌ Fehler beim Event-Refresh:', error);
        throw error;
    }
}

// ========================================
// API ENDPOINTS
// ========================================

// Health Check
app.get('/api/health', (req, res) => {
    const stats = db.getStats();
    res.json({ 
        status: 'ok', 
        message: 'CrowdDrive Backend v2.0 läuft!',
        stats: stats,
        timestamp: new Date().toISOString()
    });
});

// Events abrufen (nutzt DB!)
app.get('/api/events', async (req, res) => {
    try {
        console.log('📡 Event-Anfrage erhalten');
        
        const currentTime = new Date().toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const events = await getRelevantEvents(currentTime);
        
        res.json({
            success: true,
            count: events.length,
            events: events,
            fromCache: true,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Fehler beim Laden der Events',
            message: error.message
        });
    }
});

// Manueller Refresh
app.post('/api/refresh', async (req, res) => {
    try {
        const { type } = req.body;
        const searchType = type || 'weekly';
        
        console.log(`🔄 Manueller ${searchType} Refresh angefordert`);
        
        const events = await refreshEvents(searchType);
        
        res.json({
            success: true,
            count: events.length,
            searchType: searchType,
            message: `${events.length} Events gefunden und gespeichert`
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Statistiken
app.get('/api/stats', (req, res) => {
    const stats = db.getStats();
    res.json(stats);
});

// ========================================
// AUTOMATISCHE UPDATES (CRON JOBS)
// ========================================

// Wöchentliche Suche: Jeden Montag um 06:00
cron.schedule('0 6 * * 1', async () => {
    console.log('⏰ Wöchentliche Event-Suche (Montag 06:00)');
    try {
        // Lösche alte Events
        db.cleanOldEvents();
        // Neue Suche
        await refreshEvents('weekly');
        console.log('✅ Wöchentliche Suche abgeschlossen');
    } catch (error) {
        console.error('❌ Wöchentliche Suche fehlgeschlagen:', error);
    }
});

// Tägliches Update: Jeden Tag um 09:00 (außer Montag)
cron.schedule('0 9 * * 2-7', async () => {
    console.log('⏰ Tägliches Event-Update (09:00)');
    try {
        await refreshEvents('daily');
        console.log('✅ Tägliches Update abgeschlossen');
    } catch (error) {
        console.error('❌ Tägliches Update fehlgeschlagen:', error);
    }
});

// Cleanup: Jeden Tag um 03:00
cron.schedule('0 3 * * *', () => {
    console.log('🗑️  Cleanup alte Events (03:00)');
    db.cleanOldEvents();
});

// ========================================
// SERVER START
// ========================================

app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🚀 CrowdDrive Backend läuft auf Port ${PORT}`);
    console.log(`📍 API: http://localhost:${PORT}`);
    console.log(`========================================\n`);
    
    // Initiale Prüfung
    const stats = db.getStats();
    console.log(`📊 Datenbank-Status:`);
    console.log(`   - Events gespeichert: ${stats.totalEvents}`);
    console.log(`   - Kleine Venues: ${stats.smallVenues}`);
    console.log(`   - Große Venues: ${stats.largeVenues}`);
    console.log(`   - Gesamtkosten: $${stats.totalCostUSD.toFixed(2)}\n`);
    
    // Wenn keine Events, erste Suche
    if (stats.totalEvents === 0) {
        console.log('💡 Keine Events in DB - führe erste Suche durch...');
        refreshEvents('weekly').catch(err => {
            console.error('❌ Erste Suche fehlgeschlagen:', err.message);
        });
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 Server wird heruntergefahren...');
    db.db.close();
    process.exit(0);
});
