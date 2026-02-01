// CrowdDrive Datenbank Management
// Speichert Events für effiziente, kostengünstige Abfragen

const Database = require('better-sqlite3');
const path = require('path');

// Datenbank initialisieren
const dbPath = path.join(__dirname, 'crowddrive.db');
const db = new Database(dbPath);

// Tabelle für Events erstellen
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    address TEXT,
    lat REAL,
    lng REAL,
    time TEXT,
    endTime TEXT,
    capacity INTEGER,
    type TEXT,
    demand TEXT,
    description TEXT,
    is_small_venue BOOLEAN DEFAULT 0,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source TEXT DEFAULT 'weekly'
  )
`);

// Index für schnelle Suche
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_date ON events(date);
  CREATE INDEX IF NOT EXISTS idx_time ON events(time);
  CREATE INDEX IF NOT EXISTS idx_demand ON events(demand);
  CREATE INDEX IF NOT EXISTS idx_small_venue ON events(is_small_venue);
`);

// Metadaten Tabelle (wann wurde zuletzt gesucht?)
db.exec(`
  CREATE TABLE IF NOT EXISTS search_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_type TEXT NOT NULL,
    last_search TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    events_found INTEGER,
    cost_estimate REAL
  )
`);

console.log('✅ Datenbank initialisiert:', dbPath);

// Events speichern
function saveEvents(events, source = 'weekly') {
    const insert = db.prepare(`
        INSERT INTO events (
            date, name, location, address, lat, lng, time, endTime,
            capacity, type, demand, description, is_small_venue, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((eventList) => {
        for (const event of eventList) {
            // Kleine Venues erkennen (< 500 Kapazität)
            const isSmallVenue = event.capacity < 500 ? 1 : 0;
            
            insert.run(
                event.date,
                event.name,
                event.location,
                event.address || '',
                event.lat,
                event.lng,
                event.time,
                event.endTime,
                event.capacity,
                event.type,
                event.demand,
                event.description || '',
                isSmallVenue,
                source
            );
        }
    });

    insertMany(events);
    console.log(`💾 ${events.length} Events gespeichert (${source})`);
}

// Events abrufen mit Filter
function getEvents(options = {}) {
    const { date, minTime, maxTime, includeSmallOnly, includeLarge } = options;
    
    let query = 'SELECT * FROM events WHERE 1=1';
    const params = [];

    if (date) {
        query += ' AND date = ?';
        params.push(date);
    }

    if (minTime && maxTime) {
        query += ' AND (time >= ? OR endTime >= ?)';
        params.push(minTime, minTime);
    }

    if (includeSmallOnly) {
        query += ' AND is_small_venue = 1';
    }

    // Sortierung: Kleine Events zuerst, dann nach Demand, dann nach Zeit
    query += ` 
        ORDER BY 
            is_small_venue DESC,
            CASE demand 
                WHEN 'high' THEN 1 
                WHEN 'medium' THEN 2 
                WHEN 'low' THEN 3 
            END,
            time ASC
    `;

    const stmt = db.prepare(query);
    return stmt.all(...params);
}

// Alte Events löschen (älter als 2 Tage)
function cleanOldEvents() {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const dateStr = twoDaysAgo.toISOString().split('T')[0];

    const result = db.prepare('DELETE FROM events WHERE date < ?').run(dateStr);
    console.log(`🗑️  ${result.changes} alte Events gelöscht`);
    return result.changes;
}

// Prüfen ob Events für bestimmtes Datum existieren
function hasEventsForDate(date) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM events WHERE date = ?');
    const result = stmt.get(date);
    return result.count > 0;
}

// Prüfen wann zuletzt gesucht wurde
function getLastSearch(searchType) {
    const stmt = db.prepare(`
        SELECT * FROM search_metadata 
        WHERE search_type = ? 
        ORDER BY last_search DESC 
        LIMIT 1
    `);
    return stmt.get(searchType);
}

// Such-Metadaten speichern
function saveSearchMetadata(searchType, eventsFound, costEstimate) {
    const stmt = db.prepare(`
        INSERT INTO search_metadata (search_type, events_found, cost_estimate)
        VALUES (?, ?, ?)
    `);
    stmt.run(searchType, eventsFound, costEstimate);
}

// Alle Events für einen Datumsbereich
function getEventsInRange(startDate, endDate) {
    const stmt = db.prepare('SELECT * FROM events WHERE date >= ? AND date <= ?');
    return stmt.all(startDate, endDate);
}

// Statistiken
function getStats() {
    try {
        const totalEvents = db.prepare('SELECT COUNT(*) as count FROM events').get();
        const smallVenues = db.prepare('SELECT COUNT(*) as count FROM events WHERE is_small_venue = 1').get();
        const largeVenues = db.prepare('SELECT COUNT(*) as count FROM events WHERE is_small_venue = 0').get();
        
        // Check if search_metadata table has any rows
        const hasMetadata = db.prepare('SELECT COUNT(*) as count FROM search_metadata').get();
        
        let weeklySearches = { count: 0 };
        let dailySearches = { count: 0 };
        let totalCost = { total: 0 };
        
        if (hasMetadata.count > 0) {
            weeklySearches = db.prepare('SELECT COUNT(*) as count FROM search_metadata WHERE search_type = ?').get('weekly');
            dailySearches = db.prepare('SELECT COUNT(*) as count FROM search_metadata WHERE search_type = ?').get('daily');
            totalCost = db.prepare('SELECT SUM(cost_estimate) as total FROM search_metadata').get();
        }

        return {
            totalEvents: totalEvents.count,
            smallVenues: smallVenues.count,
            largeVenues: largeVenues.count,
            weeklySearches: weeklySearches.count,
            dailySearches: dailySearches.count,
            totalCostUSD: totalCost.total || 0
        };
    } catch (error) {
        console.error('Error in getStats:', error.message);
        return {
            totalEvents: 0,
            smallVenues: 0,
            largeVenues: 0,
            weeklySearches: 0,
            dailySearches: 0,
            totalCostUSD: 0
        };
    }
}

module.exports = {
    db,
    saveEvents,
    getEvents,
    cleanOldEvents,
    hasEventsForDate,
    getLastSearch,
    saveSearchMetadata,
    getEventsInRange,
    getStats
};
