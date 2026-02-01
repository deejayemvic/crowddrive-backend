// CrowdDrive Backend Server
// Verwendet Claude API um Events in München zu finden
// Mit Datenbank für kosteneffiziente Event-Verwaltung

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

// Anthropic Client initialisieren
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Event-Suche mit Claude (mit Fokus auf KLEINE Events!)
async function findMunichEvents(searchType = 'weekly') {
    console.log(`🔍 Starte ${searchType} Event-Suche mit Claude...`);
    
    const currentDate = new Date().toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const currentTime = new Date().toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
    });

    let prompt;
    
    if (searchType === 'weekly') {
        // WÖCHENTLICHE SUCHE - Fokus auf KLEINE Events
        prompt = `Du bist ein Event-Recherche-Assistent für Taxifahrer in München.

HEUTE: ${currentDate}, ${currentTime}

AUFGABE: Finde ALLE Events in München für die NÄCHSTEN 7 TAGE (heute bis nächste Woche).

⭐ WICHTIGSTER FOKUS: KLEINE EVENTS! ⭐

WARUM: Taxifahrer kennen große Events (Bayern, Messe) schon. 
Der ECHTE Wert sind KLEINE Events die niemand kennt!

PRIORITÄT 1 - KLEINE VENUES (50-500 Besucher):
🎭 Comedy Shows in kleinen Bars/Cafés
🎤 Poetry Slams
🎵 Jazz/Blues Sessions in Clubs
🎸 Live-Musik in Bars
🎪 Open Mic Nights
🍺 Pub Quiz Events
🎨 Vernissagen / Kunstausstellungen
🎬 Independent Kino Events
📖 Lesungen in Buchläden
🎭 Theater in kleinen Häusern (nicht Staatstheater)
🎉 Underground Club Nights
🍴 Food Pop-Ups mit Events

PRIORITÄT 2 - MITTELGROSSE VENUES (500-5000):
🎵 Konzerte in Backstage, Muffatwerk, etc.
🎭 Volkstheater, Deutsches Theater
🎪 Circus Krone Shows
🎵 Jazz-Clubs (Unterfahrt)

PRIORITÄT 3 - GROSSE EVENTS (nur kurz erwähnen):
⚽ FC Bayern Spiele (nur erwähnen)
🏟️ Messen (nur erwähnen)
🎵 Arena-Konzerte (nur erwähnen)

AUFGABE: Finde ALLE aktuellen Events und Veranstaltungen in München für HEUTE und die nächsten 3 Tage.
Heutiges Datum: ${currentDate}

DURCHSUCHE ALLE MÖGLICHEN QUELLEN (nutze Web-Search intensiv):

🎭 GROSSE VENUES & OFFIZIELLE SEITEN:
- muenchen.de/veranstaltungen
- Gasteig HP8 (Konzerte, Klassik, Events)
- Messe München (Messen, Kongresse)
- Allianz Arena (FC Bayern Spiele, Konzerte)
- Olympiapark München (Olympiahalle, Olympiastadion)
- Zenith München (Konzerte)
- Circus Krone (Shows, Konzerte)

🎪 THEATER & KULTUR:
- Residenztheater
- Volkstheater
- Deutsches Theater
- Kammerspiele München
- GOP Varieté Theater
- Staatsoper München
- Prinzregententheater

🎵 CLUBS & NACHTLEBEN:
- P1 Club
- Harry Klein
- Blitz Club
- Rote Sonne
- Pacha München
- Neuraum
- Backstage München
- Strom München
- Muffatwerk

🍺 BARS & KLEINE VENUES:
- Comedy Clubs (Vereinsheim, Schlachthof, Lustspielhaus)
- Jazz-Bars (Unterfahrt, Jazzbar Vogler)
- Live-Musik Bars (Atomic Cafe, Ampere)
- Irish Pubs mit Live-Musik
- Hofbräuhaus Events
- Augustiner Bräustuben

📱 SOCIAL MEDIA & EVENT-PLATTFORMEN:
- Facebook Events München (sehr wichtig!)
- Instagram Events & Stories (#München, #MünchenEvents)
- Eventbrite München
- Meetup München
- Resident Advisor München (für Club-Events)
- Songkick München (Konzerte)
- Dice.fm München

🎨 SPEZIELLE EVENTS:
- Poetry Slams
- Stand-Up Comedy Shows
- Open Mic Nights
- Pub Quiz Events
- Karaoke Nights
- DJ Sets in kleinen Clubs
- Underground Partys
- Pop-up Events
- Food Festivals
- Märkte (Viktualienmarkt Events)

⚽ SPORT:
- FC Bayern München (Allianz Arena)
- TSV 1860 München (Grünwalder Stadion)
- EHC Red Bull München (Eishockey)
- FC Bayern Basketball
- Andere Sportevents

🎪 SONSTIGE:
- Christkindlmarkt (saisonal)
- Volksfeste (Frühlingsfest, Oktoberfest)
- Straßenfeste
- Konzerte im Englischen Garten
- Open-Air Kino
- Flohmärkte mit Events

WICHTIG - KOSTEN-OPTIMIERUNG:
- Nutze Web-Search GEZIELT (nicht für jede einzelne Quelle!)
- Mache MAXIMAL 5-7 strategische Searches:
  * 1-2 Searches: "München events heute" + aktuelle Uhrzeit
  * 1-2 Searches: Große Venues (Allianz Arena, Messe München, Gasteig)
  * 1-2 Searches: Nachtleben/Clubs (falls Abend/Nacht)
  * 1 Search: Facebook Events München (falls verfügbar)
- NICHT jede Location einzeln durchsuchen!
- Fokus auf hochwertige Quellen mit vielen Events
- Ziel: 10-15 Events mit wenigen, effizienten Searches finden

PRIORITÄT auf Events mit VIELEN Besuchern (= mehr Taxi-Bedarf):
- Fußballspiele (Allianz Arena)
- Große Konzerte (10.000+ Besucher)
- Messen und Kongresse
- Theater und Opern
- Sportveranstaltungen
- Volksfeste
- Club-Events (besonders Freitag/Samstag)

AUSGABE-FORMAT (JSON Array):
Gib mir ein JSON Array mit Events zurück. Jedes Event sollte folgende Struktur haben:

[
  {
    "name": "Event Name",
    "location": "Venue Name",
    "address": "Vollständige Adresse in München",
    "lat": 48.1234,
    "lng": 11.5678,
    "date": "2025-01-30",
    "time": "20:00",
    "endTime": "23:00",
    "capacity": 50000,
    "type": "Sport/Konzert/Theater/Messe/Club/Comedy/Bar/Jazz/Klassik/Oper/Volksfest/Party/Festival/Poetry-Slam/Open-Mic/Sonstiges",
    "demand": "high/medium/low",
    "description": "Kurze Beschreibung"
  }
]

DEMAND BEWERTUNG (wie viele Taxi-Fahrgäste zu erwarten sind):

ZEITBASIERTE GEWICHTUNG:
- Event endet in der NÄCHSTEN STUNDE → Automatisch HIGH (egal wie groß!)
- Event läuft GERADE → MEDIUM bis HIGH
- Event startet BALD (1-2h) → MEDIUM
- Event ist HEUTE SPÄTER → LOW bis MEDIUM
- Event ist MORGEN → LOW (außer sehr groß)

GRÖSSENBEWERTUNG:
- "high": 
  * 10.000+ Besucher ODER
  * Fußballspiele/große Konzerte/Messen ODER
  * Events die JETZT GERADE ENDEN (500+ Leute)
  
- "medium": 
  * 500-10.000 Besucher ODER
  * Beliebte Clubs/Bars/Comedy Shows/Theater ODER
  * Events die in 2-4 Stunden enden
  
- "low": 
  * Unter 500 Besucher ODER
  * Events später heute/morgen ODER
  * Tagesveranstaltungen die nicht bald enden

WICHTIG: 
- Ein 200-Personen Event das JETZT endet = HIGH DEMAND
- Ein 50.000-Personen Event MORGEN = MEDIUM/LOW DEMAND (nicht zeitkritisch)
- Unter der Woche: Auch kleine Events sind wertvoll!

TAXI-FAKTOREN (erhöhen Demand):
✅ Event endet spät (nach 22:00) → +1 Stufe
✅ Alkohol-Event (Clubs, Bars, Volksfeste) → +1 Stufe
✅ Zentrale Location (Innenstadt) → bessere Anschlussfahrten
✅ Schlechtes Wetter → mehr Taxi-Bedarf (wenn bekannt)

TAXI-RELEVANZ (wichtig für Taxifahrer):
- Events die SPÄT ENDEN (22:00+) = mehr Taxi-Bedarf → höhere Demand
- Zentrale Locations (Innenstadt, Schwabing) = mehr Taxi-Bedarf
- Alkohol-Events (Clubs, Bars, Oktoberfest) = deutlich mehr Taxi-Bedarf
- Schlechtes Wetter = generell mehr Taxi-Bedarf (berücksichtige aktuelles Wetter wenn möglich)

KOORDINATEN: Nutze echte GPS-Koordinaten für München. Beispiele:
- Allianz Arena: 48.2188, 11.6247
- Olympiastadion: 48.1744, 11.5522
- Gasteig HP8: 48.1308, 11.5891
- Marienplatz: 48.1374, 11.5755

Antworte NUR mit dem JSON Array, keine zusätzlichen Erklärungen.`;

    try {
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            tools: [
                {
                    type: "web_search_20250305",
                    name: "web_search"
                }
            ],
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        // Verarbeite alle Content-Blöcke (bei Web-Search gibt es mehrere)
        let responseText = '';
        for (const block of message.content) {
            if (block.type === 'text') {
                responseText += block.text;
            }
        }
        
        console.log('📥 Claude Antwort erhalten (mit Web-Search)');
        
        // Extrahiere JSON aus der Antwort
        let jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            // Fallback: Versuche die gesamte Antwort als JSON zu parsen
            jsonMatch = [responseText];
        }
        
        const events = JSON.parse(jsonMatch[0]);
        console.log(`✅ ${events.length} Events gefunden`);
        
        return events;
    } catch (error) {
        console.error('❌ Fehler bei Event-Suche:', error.message);
        throw error;
    }
}

// API Endpoints

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'CrowdDrive Backend läuft!',
        timestamp: new Date().toISOString()
    });
});

// Events abrufen
app.get('/api/events', async (req, res) => {
    try {
        console.log('📡 Event-Anfrage erhalten');
        const events = await findMunichEvents();
        
        res.json({
            success: true,
            count: events.length,
            events: events,
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

// Events mit Filterung abrufen
app.get('/api/events/filter', async (req, res) => {
    try {
        const { demand, type, minCapacity } = req.query;
        let events = await findMunichEvents();
        
        // Filter anwenden
        if (demand) {
            events = events.filter(e => e.demand === demand);
        }
        if (type) {
            events = events.filter(e => e.type.toLowerCase() === type.toLowerCase());
        }
        if (minCapacity) {
            events = events.filter(e => e.capacity >= parseInt(minCapacity));
        }
        
        res.json({
            success: true,
            count: events.length,
            filters: { demand, type, minCapacity },
            events: events
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Server starten
app.listen(PORT, () => {
    console.log(`🚀 CrowdDrive Backend läuft auf Port ${PORT}`);
    console.log(`📍 API erreichbar unter: http://localhost:${PORT}`);
    console.log(`🔑 Anthropic API Key: ${process.env.ANTHROPIC_API_KEY ? '✅ Gesetzt' : '❌ FEHLT!'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 Server wird heruntergefahren...');
    process.exit(0);
});
