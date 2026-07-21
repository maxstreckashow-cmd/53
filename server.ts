import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

// Path to settings file
const SETTINGS_FILE = path.join(process.cwd(), "feed_settings.json");

interface FeedSettings {
  feedUrl: string;
  statusFilter: string;
  allowedTypes: number[];
  categoryType: string;
  priceFormat: string;
  includeLayout: string;
  customDomain?: string;
}

const defaultSettings: FeedSettings = {
  feedUrl: "https://domoplaner.ru/dc-api/feeds/311-mTA43T5ivZbLiORunzQVnjsGdtjVuFDFQzFr466CDXX78Kz206M0ZaQjWLnO1soT/",
  statusFilter: "free",
  allowedTypes: [0, 1, 3],
  categoryType: "property_type",
  priceFormat: "full",
  includeLayout: "yes",
  customDomain: "https://catalog.residence-tula.ru"
};

function getSavedSettings(): FeedSettings {
  let settings = { ...defaultSettings };
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      settings = { ...settings, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error("Error reading settings file:", e);
  }

  // Override with environment variables if present (especially useful for cloud hosting like Render)
  if (process.env.FEED_URL) {
    settings.feedUrl = process.env.FEED_URL;
  }
  if (process.env.STATUS_FILTER) {
    settings.statusFilter = process.env.STATUS_FILTER;
  }
  if (process.env.ALLOWED_TYPES) {
    settings.allowedTypes = process.env.ALLOWED_TYPES.split(",").map(t => parseInt(t.trim(), 10)).filter(t => !isNaN(t));
  }
  if (process.env.CATEGORY_TYPE) {
    settings.categoryType = process.env.CATEGORY_TYPE;
  }
  if (process.env.PRICE_FORMAT) {
    settings.priceFormat = process.env.PRICE_FORMAT;
  }
  if (process.env.INCLUDE_LAYOUT) {
    settings.includeLayout = process.env.INCLUDE_LAYOUT;
  }
  if (process.env.CUSTOM_DOMAIN) {
    settings.customDomain = process.env.CUSTOM_DOMAIN;
  }

  return settings;
}

function saveSettings(settings: Partial<FeedSettings>) {
  try {
    const current = getSavedSettings();
    const updated = { ...current, ...settings };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing settings file:", e);
  }
}

// Enable JSON request body parsing
app.use(express.json());

// Enable CORS for all API endpoints to make external integrations completely reliable
app.use("/api", (req, res, next) => {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// Endpoint serving beautiful parking space SVG icon
app.get("/api/parking_space.svg", (req, res) => {
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <!-- Background -->
  <rect width="600" height="600" fill="#ffffff"/>
  
  <!-- Parking Sign Group -->
  <g transform="translate(40, 60)">
    <!-- Pole -->
    <rect x="110" y="220" width="16" height="260" fill="#2d3748" rx="4"/>
    <!-- Sign Box -->
    <rect x="20" y="40" width="196" height="196" rx="32" fill="#2d3748"/>
    <!-- P Letter -->
    <text x="118" y="184" font-family="system-ui, -apple-system, sans-serif" font-size="140" font-weight="800" fill="#ffffff" text-anchor="middle">P</text>
  </g>
  
  <!-- Car Group -->
  <g transform="translate(240, 160)">
    <!-- Car body & silhouette -->
    <!-- Roof and windshield -->
    <path d="M 120 140 L 220 140 Q 235 140 240 150 L 270 215 Q 275 225 260 225 L 80 225 Q 65 225 70 215 L 100 150 Q 105 140 120 140 Z" fill="#2d3748"/>
    <!-- Windshield cutout (inner shape) -->
    <path d="M 126 148 L 214 148 Q 224 148 227 155 L 253 212 Q 256 218 246 218 L 94 218 Q 84 218 87 212 L 113 155 Q 116 148 126 148 Z" fill="#ffffff"/>
    
    <!-- Lower Body -->
    <path d="M 40 220 C 40 200, 300 200, 300 220 L 310 260 C 312 275, 298 290, 280 290 L 60 290 C 42 290, 28 275, 30 260 Z" fill="#2d3748"/>
    
    <!-- Headlights (Left & Right) -->
    <path d="M 50 240 Q 80 230 95 250 Q 75 270 50 260 Z" fill="#ffffff"/>
    <path d="M 290 240 Q 260 230 245 250 Q 265 270 290 260 Z" fill="#ffffff"/>
    
    <!-- Grille -->
    <path d="M 120 252 Q 170 242 220 252 Q 215 272 170 272 Q 125 272 120 252 Z" fill="#ffffff"/>
    <path d="M 125 255 Q 170 248 215 255 Q 210 268 170 268 Q 130 268 125 255 Z" fill="#2d3748"/>
    
    <!-- Wheels/Tires underneath -->
    <rect x="52" y="286" width="36" height="24" rx="6" fill="#2d3748"/>
    <rect x="252" y="286" width="36" height="24" rx="6" fill="#2d3748"/>
    
    <!-- Side Mirrors -->
    <path d="M 40 225 Q 20 220 25 210 Q 35 210 42 220 Z" fill="#2d3748"/>
    <path d="M 300 225 Q 320 220 315 210 Q 305 210 298 220 Z" fill="#2d3748"/>
  </g>
</svg>`;
  res.send(svg);
});

// Helpers for escaping CSV and XML
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeXML(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Extract flats helper
interface FlatItem {
  id: number;
  number: string;
  type: number;
  status: number;
  price: number;
  area: number;
  is_studio: number;
  rooms: number | null;
  rooms_sign: string | null;
  decoration_name?: string;
  images: Array<{ type: string; src: string }>;
  projectTitle: string;
  houseTitle: string;
  sectionTitle: string;
  floorNumber: number;
}

function normalizeFeedUrl(input: string): string {
  if (!input) return "";
  const cleaned = input.trim();
  
  // If it's already a full URL, return as is
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }

  // Check if it is an API key with underscore like "311_H07j2kuqiaME..."
  const apiKeyRegex = /^(\d+)_(.+)$/;
  const match = cleaned.match(apiKeyRegex);
  if (match) {
    const id = match[1];
    const token = match[2];
    return `https://domoplaner.ru/dc-api/feeds/${id}-${token}/`;
  }

  // Check if it is a hyphenated API key like "311-H07j2kuqiaME..."
  const hyphenRegex = /^(\d+)-(.+)$/;
  const hyphenMatch = cleaned.match(hyphenRegex);
  if (hyphenMatch) {
    const id = hyphenMatch[1];
    const token = hyphenMatch[2];
    return `https://domoplaner.ru/dc-api/feeds/${id}-${token}/`;
  }

  return cleaned;
}

const CACHE_FILE = path.join(process.cwd(), "feed_cache.json");

// In-memory cache to avoid disk I/O when possible
let inMemoryCache: { [url: string]: { flats: FlatItem[]; rawData: any; timestamp: number } } = {};

function getCachedData(feedUrl: string): { flats: FlatItem[]; rawData: any; timestamp: number } | null {
  const normUrl = normalizeFeedUrl(feedUrl);
  // Check in-memory first
  if (inMemoryCache[normUrl]) {
    return inMemoryCache[normUrl];
  }
  // Try reading from file
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, "utf-8");
      const cache = JSON.parse(data);
      if (cache && cache[normUrl]) {
        // Hydrate in-memory cache
        inMemoryCache[normUrl] = cache[normUrl];
        return cache[normUrl];
      }
    }
  } catch (e) {
    console.error("Error reading cache file:", e);
  }
  return null;
}

function saveCachedData(feedUrl: string, flats: FlatItem[], rawData: any) {
  const normUrl = normalizeFeedUrl(feedUrl);
  const entry = {
    flats,
    rawData,
    timestamp: Date.now()
  };
  inMemoryCache[normUrl] = entry;

  try {
    let cache: any = {};
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const data = fs.readFileSync(CACHE_FILE, "utf-8");
        cache = JSON.parse(data);
      } catch (e) {
        // ignore malformed JSON
      }
    }
    cache[normUrl] = entry;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing cache file:", e);
  }
}

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(options.headers || {})
      },
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      throw new Error(`Превышено время ожидания ответа от фида (${Math.round(timeoutMs / 1000)} сек)`);
    }
    throw error;
  }
}

// In-flight background fetch tracker to prevent duplicate requests
const inFlightFetches: { [url: string]: Promise<any> } = {};

async function doBackgroundFetch(rawFeedUrl: string) {
  const feedUrl = normalizeFeedUrl(rawFeedUrl);
  if (inFlightFetches[feedUrl]) {
    return inFlightFetches[feedUrl];
  }

  const fetchPromise = (async () => {
    try {
      let finalUrl = feedUrl;
      try {
        const parsedUrl = new URL(feedUrl);
        // Round timestamp to nearest 10 seconds to allow CDN re-use while keeping content fresh
        const timeBucket = Math.floor(Date.now() / 10000) * 10;
        parsedUrl.searchParams.set("_t", String(timeBucket));
        finalUrl = parsedUrl.toString();
      } catch (e) {
        finalUrl = feedUrl;
      }

      console.log(`[BackgroundFetch] Fetching live feed data from ${finalUrl}...`);
      const response = await fetchWithTimeout(finalUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }, 30000);

      if (!response.ok) {
        console.warn(`[BackgroundFetch] Returned status ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      if (!data || typeof data !== 'object') return null;

      const extracted: FlatItem[] = [];
      if (data.projects && Array.isArray(data.projects)) {
        data.projects.forEach((project: any) => {
          const houses: any[] = [];
          if (project.houses_without_stage && Array.isArray(project.houses_without_stage)) {
            houses.push(...project.houses_without_stage);
          }
          if (project.stages && Array.isArray(project.stages)) {
            project.stages.forEach((stage: any) => {
              if (stage.houses && Array.isArray(stage.houses)) {
                houses.push(...stage.houses);
              }
            });
          }
          houses.forEach((house: any) => {
            if (house.sections && Array.isArray(house.sections)) {
              house.sections.forEach((section: any) => {
                if (section.floors && Array.isArray(section.floors)) {
                  section.floors.forEach((floor: any) => {
                    if (floor.flats && Array.isArray(floor.flats)) {
                      floor.flats.forEach((flat: any) => {
                        extracted.push({
                          id: flat.id,
                          number: flat.number,
                          type: flat.type,
                          status: flat.status,
                          price: flat.price,
                          area: flat.area,
                          is_studio: flat.is_studio || 0,
                          rooms: flat.rooms,
                          rooms_sign: flat.rooms_sign,
                          decoration_name: flat.decoration_name,
                          images: flat.images || [],
                          projectTitle: project.title,
                          houseTitle: house.title,
                          sectionTitle: section.title,
                          floorNumber: floor.number
                        });
                      });
                    }
                  });
                }
              });
            }
          });
        });
      }

      if (extracted.length > 0) {
        saveCachedData(feedUrl, extracted, data);
        console.log(`[BackgroundFetch] Successfully updated cache with ${extracted.length} items`);
      }
      return extracted;
    } catch (err: any) {
      console.warn(`[BackgroundFetch] Notice while fetching feed: ${err.message}`);
      return null;
    } finally {
      delete inFlightFetches[feedUrl];
    }
  })();

  inFlightFetches[feedUrl] = fetchPromise;
  return fetchPromise;
}

async function fetchAndExtractFlats(rawFeedUrl: string): Promise<{ flats: FlatItem[]; error?: string; rawData?: any }> {
  const feedUrl = normalizeFeedUrl(rawFeedUrl);
  const cached = getCachedData(feedUrl);
  const CACHE_FRESHNESS_LIMIT = 15 * 1000; // 15 seconds

  if (cached) {
    const ageMs = Date.now() - cached.timestamp;
    if (ageMs > CACHE_FRESHNESS_LIMIT) {
      doBackgroundFetch(feedUrl);
    }
    return { flats: cached.flats, rawData: cached.rawData };
  }

  const freshFlats = await doBackgroundFetch(feedUrl);
  if (freshFlats && freshFlats.length > 0) {
    return { flats: freshFlats };
  }

  const lastCached = getCachedData(feedUrl);
  if (lastCached && lastCached.flats.length > 0) {
    return { flats: lastCached.flats, rawData: lastCached.rawData };
  }

  return { flats: [], error: "Не удалось загрузить данный фид" };
}

// Endpoint 1: Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint 2: Get general feed info
app.get("/api/feed-info", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const feedUrl = (req.query.feedUrl as string) || "https://domoplaner.ru/dc-api/feeds/311-mTA43T5ivZbLiORunzQVnjsGdtjVuFDFQzFr466CDXX78Kz206M0ZaQjWLnO1soT/";
  const result = await fetchAndExtractFlats(feedUrl);
  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }

  const flats = result.flats;
  const projectStats: { [key: string]: { total: number; free: number } } = {};
  const houseStats: { [key: string]: { total: number; free: number } } = {};
  const typeStats: { [key: string]: { total: number; free: number } } = {};

  flats.forEach(f => {
    // Project
    if (!projectStats[f.projectTitle]) projectStats[f.projectTitle] = { total: 0, free: 0 };
    projectStats[f.projectTitle].total++;
    if (f.status === 0) projectStats[f.projectTitle].free++;

    // House
    const hKey = `${f.projectTitle} - ${f.houseTitle}`;
    if (!houseStats[hKey]) houseStats[hKey] = { total: 0, free: 0 };
    houseStats[hKey].total++;
    if (f.status === 0) houseStats[hKey].free++;

    // Type
    let typeName = "Другой тип";
    if (f.type === 0) typeName = "Квартира/Апартаменты";
    else if (f.type === 1) typeName = "Машиноместо";
    else if (f.type === 3) typeName = "Коммерческое помещение";

    if (!typeStats[typeName]) typeStats[typeName] = { total: 0, free: 0 };
    typeStats[typeName].total++;
    if (f.status === 0) typeStats[typeName].free++;
  });

  const appHost = req.get("host") || process.env.APP_URL || `localhost:${PORT}`;
  const appProto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
  const appUrl = `${appProto}://${appHost}`;

  const mappedSample = flats.slice(0, 20).map(f => {
    if (f.type === 1) {
      return {
        ...f,
        images: [{ type: "plan", src: `${appUrl}/api/parking_space.svg` }]
      };
    }
    return f;
  });

  res.json({
    totalCount: flats.length,
    freeCount: flats.filter(f => f.status === 0).length,
    projects: projectStats,
    houses: houseStats,
    types: typeStats,
    sample: mappedSample,
    feedUrl
  });
});

// Helper handler for feed conversion to support both API route and direct file routes
const feedConvertHandler = async (req: express.Request, res: express.Response) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const saved = getSavedSettings();
  const feedUrl = (req.query.feedUrl as string) || saved.feedUrl;
  
  // Resolve format based on route pathname or query parameter
  let format = "yml";
  if (req.path.endsWith(".csv")) {
    format = "csv";
  } else if (req.path.endsWith(".yml") || req.path.endsWith(".xml")) {
    format = "yml";
  } else {
    format = (req.query.format as string) || "yml";
  }

  const statusFilter = (req.query.statusFilter as string) || saved.statusFilter;
  
  // Parse type filters (either from query or saved settings)
  let allowedTypes: number[] = [];
  if (req.query.typeFilter) {
    allowedTypes = (req.query.typeFilter as string).split(',').map(t => parseInt(t.trim(), 10)).filter(t => !isNaN(t));
  } else {
    allowedTypes = saved.allowedTypes;
  }

  const categoryType = (req.query.categoryType as string) || saved.categoryType;
  const priceFormat = (req.query.priceFormat as string) || saved.priceFormat;
  const includeLayout = (req.query.includeLayout as string) || saved.includeLayout;

  const result = await fetchAndExtractFlats(feedUrl);
  if (result.error) {
    res.status(400).send(`Ошибка: ${result.error}`);
    return;
  }

  // Filter flats
  let filteredFlats = result.flats;
  if (statusFilter === "free") {
    filteredFlats = filteredFlats.filter(f => f.status === 0);
  }
  filteredFlats = filteredFlats.filter(f => allowedTypes.includes(f.type));

  // Dynamically resolve correct public host and protocol (supporting secure proxy environments)
  const appHost = req.get("host") || process.env.APP_URL || `localhost:${PORT}`;
  const appProto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
  const appUrl = `${appProto}://${appHost}`;

  // Override images for all parking spaces to use the custom SVG icon
  filteredFlats = filteredFlats.map(f => {
    if (f.type === 1) {
      return {
        ...f,
        images: [{ type: "plan", src: `${appUrl}/api/parking_space.svg` }]
      };
    }
    return f;
  });

  // Resolve category mapper
  const getCategoryName = (f: FlatItem) => {
    const typeName = f.type === 0 ? "Квартиры" : f.type === 1 ? "Паркинг" : f.type === 3 ? "Коммерция" : "Другие помещения";
    switch (categoryType) {
      case "project":
        return f.projectTitle;
      case "project_house":
        return `${f.projectTitle} / ${f.houseTitle}`;
      case "property_type":
        return typeName;
      case "combined":
      default:
        return `${f.projectTitle} / ${typeName}`;
    }
  };

  // Helper to format names nicely
  const getFlatName = (f: FlatItem) => {
    let typeLabel = "Помещение";
    if (f.type === 0) {
      typeLabel = f.is_studio ? "Студия" : "Квартира";
    } else if (f.type === 1) {
      typeLabel = "Машиноместо";
    } else if (f.type === 3) {
      typeLabel = "Коммерческое помещение";
    }

    let roomPrefix = "";
    if (f.type === 0 && !f.is_studio && f.rooms !== null) {
      roomPrefix = `${f.rooms}-комн. `;
    }

    const priceText = priceFormat === "million" && f.price 
      ? ` (${(f.price / 1000000).toFixed(2)} млн ₽)` 
      : "";

    return `${roomPrefix}${typeLabel} №${f.number}, ${f.area} м²${priceText}`;
  };

  const getFlatDescription = (f: FlatItem) => {
    const decoration = f.decoration_name ? `, отделка: ${f.decoration_name}` : "";
    return `Жилой комплекс "${f.projectTitle}", ${f.houseTitle}, секция ${f.sectionTitle}, этаж ${f.floorNumber}${decoration}`;
  };

  const getFlatText = (f: FlatItem) => {
    let html = `<h3>Характеристики объекта:</h3><ul>`;
    html += `<li><b>Проект:</b> ЖК "${f.projectTitle}"</li>`;
    html += `<li><b>Дом/Корпус:</b> ${f.houseTitle}</li>`;
    html += `<li><b>Секция:</b> ${f.sectionTitle}</li>`;
    html += `<li><b>Этаж:</b> ${f.floorNumber}</li>`;
    html += `<li><b>Номер на этаже:</b> ${f.number}</li>`;
    html += `<li><b>Площадь:</b> ${f.area} кв.м</li>`;

    if (f.type === 0) {
      if (f.rooms !== null) {
        html += `<li><b>Количество комнат:</b> ${f.rooms}</li>`;
      }
      html += `<li><b>Формат:</b> ${f.is_studio ? 'Студия' : 'Классическая планировка'}</li>`;
    }

    if (f.decoration_name) {
      html += `<li><b>Отделка:</b> ${f.decoration_name}</li>`;
    }

    const typeLabel = f.type === 0 ? "Квартира/Апартаменты" : f.type === 1 ? "Машиноместо" : f.type === 3 ? "Коммерческое помещение" : "Другое";
    html += `<li><b>Категория:</b> ${typeLabel}</li>`;
    html += `<li><b>ID объекта:</b> ${f.id}</li>`;
    html += `</ul>`;

    if (includeLayout === "yes" && f.images && f.images.length > 0) {
      html += `<p><br/><b>Планировка объекта:</b><br/><img src="${f.images[0].src}" style="max-width:100%; height:auto; margin-top:10px;" alt="Планировка"/></p>`;
    }

    return html;
  };

  if (format === "csv") {
    // CSV output
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=domoplaner_tilda_catalog.csv");

    // Exact Tilda CSV columns as per user's provided example with added rooms count
    const headerRow = "SKU;Category;Title;Description;Text;Photo;Price;Quantity;Price Old;Editions;Modifications;External ID;Parent UID;VAT;FFD1;FFD2;Characteristics: Кол-во комнат";
    let csvContent = "\ufeff" + headerRow + "\n"; // Include UTF-8 BOM for Excel support

    filteredFlats.forEach(f => {
      const sku = String(f.id); // SKU = Id объекта
      const category = getCategoryName(f);
      const title = getFlatName(f);
      const description = getFlatDescription(f);
      const text = getFlatText(f);
      const photo = f.images && f.images.length > 0 ? f.images.map(img => img.src).join(",") : "";
      const price = f.price ? f.price.toFixed(4) : "";
      const quantity = f.status === 0 ? "1" : "0";
      const priceOld = "";
      const editions = "";
      const modifications = "";
      const extId = String(f.id);
      const parentUid = "";
      const vat = "";
      const ffd1 = "commodity";
      const ffd2 = "full_payment";

      let roomsCountValue = "";
      if (f.type === 0) {
        if (f.is_studio || f.rooms === 0 || (f.rooms_sign && String(f.rooms_sign).toLowerCase().includes("студ"))) {
          roomsCountValue = "Студия";
        } else if (f.rooms !== null && f.rooms !== undefined) {
          roomsCountValue = String(f.rooms);
        } else if (f.rooms_sign) {
          const parsed = parseInt(String(f.rooms_sign), 10);
          roomsCountValue = !isNaN(parsed) ? String(parsed) : "1";
        } else {
          const areaNum = typeof f.area === 'number' ? f.area : parseFloat(String(f.area)) || 0;
          roomsCountValue = (areaNum > 0 && areaNum < 28) ? "Студия" : "1";
        }
      } else {
        roomsCountValue = "";
      }

      const row = [
        sku,
        category,
        title,
        description,
        text,
        photo,
        price,
        quantity,
        priceOld,
        editions,
        modifications,
        extId,
        parentUid,
        vat,
        ffd1,
        ffd2,
        roomsCountValue
      ];

      csvContent += row.map(val => escapeCSV(val)).join(";") + "\n";
    });

    res.send(csvContent);
  } else {
    // YML (XML) output
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    const disposition = req.query.download === "true" ? "attachment" : "inline";
    res.setHeader("Content-Disposition", `${disposition}; filename=domoplaner_tilda_catalog.yml`);

    // Dynamically resolve correct public host and protocol (supporting secure proxy environments)
    const appHost = req.get("host") || process.env.APP_URL || `localhost:${PORT}`;
    const appProto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
    const appUrl = `${appProto}://${appHost}`;

    // Safely format date as YYYY-MM-DD HH:mm for Tilda XML compatibility
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const ymlDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // Gather categories
    const categoriesSet = new Set<string>();
    filteredFlats.forEach(f => {
      categoriesSet.add(getCategoryName(f));
    });

    const categoryList = Array.from(categoriesSet);
    const categoryMap = new Map<string, number>();
    categoryList.forEach((catName, index) => {
      categoryMap.set(catName, index + 1);
    });

    let yml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    yml += `<yml_catalog date="${ymlDate}">\n`;
    yml += `  <shop>\n`;
    yml += `    <name>Domoplaner Feed</name>\n`;
    yml += `    <company>Domoplaner CRM Integration</company>\n`;
    yml += `    <url>${escapeXML(appUrl)}</url>\n`;
    yml += `    <currencies>\n`;
    yml += `      <currency id="RUB" rate="1"/>\n`;
    yml += `    </currencies>\n`;
    yml += `    <categories>\n`;
    
    categoryList.forEach((catName, index) => {
      const catId = index + 1;
      yml += `      <category id="${catId}">${escapeXML(catName)}</category>\n`;
    });
    
    yml += `    </categories>\n`;
    yml += `    <offers>\n`;

    filteredFlats.forEach(f => {
      const catName = getCategoryName(f);
      const catId = categoryMap.get(catName) || 1;
      const sku = String(f.id); // SKU = Id объекта
      const title = getFlatName(f);
      
      const description = "";
      
      const text = ""; // Clean plain characteristics as separate params
      const availableAttr = f.status === 0 ? "true" : "false";

      yml += `      <offer id="${f.id}" available="${availableAttr}">\n`;
      yml += `        <name>${escapeXML(title)}</name>\n`;
      yml += `        <url>${escapeXML(`${appUrl}/#sku=${sku}`)}</url>\n`;
      yml += `        <price>${f.price || 0}</price>\n`;
      yml += `        <currencyId>RUB</currencyId>\n`;
      yml += `        <categoryId>${catId}</categoryId>\n`;
      
      // Photos
      f.images.forEach(img => {
        yml += `        <picture>${escapeXML(img.src)}</picture>\n`;
      });

      // Description (Short plain-text description)
      yml += `        <description>${escapeXML(description)}</description>\n`;

      // Custom attributes for filtering / mapping in Tilda corresponding to CSV characteristics
      const sectionValue = f.sectionTitle ? f.sectionTitle.replace(/^Секция\s+/i, "") : "";
      const typeLabel = f.type === 0 ? "Квартира" : f.type === 1 ? "Машиноместо" : f.type === 3 ? "Коммерция" : "Другое";

      let roomsCountYml = "";
      if (f.type === 0) {
        if (f.is_studio || f.rooms === 0 || (f.rooms_sign && String(f.rooms_sign).toLowerCase().includes("студ"))) {
          roomsCountYml = "Студия";
        } else if (f.rooms !== null && f.rooms !== undefined) {
          roomsCountYml = String(f.rooms);
        } else if (f.rooms_sign) {
          const parsed = parseInt(String(f.rooms_sign), 10);
          if (!isNaN(parsed)) {
            roomsCountYml = String(parsed);
          } else {
            roomsCountYml = "1";
          }
        } else {
          const areaNum = typeof f.area === 'number' ? f.area : parseFloat(String(f.area)) || 0;
          roomsCountYml = (areaNum > 0 && areaNum < 28) ? "Студия" : "1";
        }
      } else if (f.type === 1) {
        roomsCountYml = "Паркинг";
      } else if (f.type === 3) {
        roomsCountYml = "Коммерция";
      } else {
        roomsCountYml = "Другое";
      }

      yml += `        <param name="Проект">${escapeXML(f.projectTitle)}</param>\n`;
      yml += `        <param name="Секция">${escapeXML(sectionValue)}</param>\n`;
      yml += `        <param name="Этаж">${f.floorNumber}</param>\n`;
      yml += `        <param name="Тип объекта">${escapeXML(typeLabel)}</param>\n`;
      yml += `        <param name="Площадь">${f.area}</param>\n`;
      yml += `        <param name="Отделка">${escapeXML(f.decoration_name || "Без отделки")}</param>\n`;
      yml += `        <param name="Номер на этаже">${escapeXML(String(f.number))}</param>\n`;
      yml += `        <param name="ID объекта">${f.id}</param>\n`;
      yml += `        <param name="Кол-во комнат">${escapeXML(roomsCountYml)}</param>\n`;
      yml += `        <param name="Characteristics: Кол-во комнат">${escapeXML(roomsCountYml)}</param>\n`;
      yml += `      </offer>\n`;
    });

    yml += `    </offers>\n`;
    yml += `  </shop>\n`;
    yml += `</yml_catalog>\n`;

    res.send(yml);
  }
};

// Bind feed convert routes
app.get("/api/feed-convert", feedConvertHandler);
app.get("/feed.yml", feedConvertHandler);
app.get("/feed.xml", feedConvertHandler);
app.get("/feed.csv", feedConvertHandler);

// Settings storage endpoints
app.get("/api/get-settings", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json(getSavedSettings());
});

app.post("/api/save-settings", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  saveSettings(req.body);
  res.json({ status: "ok", settings: getSavedSettings() });
});

// Setup Webhook Log type and array
interface WebhookLog {
  id: string;
  timestamp: string;
  method: string;
  headers: any;
  body: any;
  ip: string;
}

const webhookLogs: WebhookLog[] = [];

// Endpoint 4: Get clean converted JSON (with CORS enabled for external widgets!)
const feedJsonHandler = async (req: express.Request, res: express.Response) => {
  // Enable CORS with Credentials support to bypass AI Studio development environment Cookie Check
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.sendStatus(200);
    return;
  }

  const saved = getSavedSettings();
  const feedUrl = (req.query.feedUrl as string) || saved.feedUrl;
  const statusFilter = (req.query.statusFilter as string) || saved.statusFilter;
  
  let allowedTypes: number[] = [];
  if (req.query.typeFilter) {
    allowedTypes = (req.query.typeFilter as string).split(',').map(t => parseInt(t.trim(), 10)).filter(t => !isNaN(t));
  } else {
    allowedTypes = saved.allowedTypes;
  }

  const categoryType = (req.query.categoryType as string) || saved.categoryType;
  const priceFormat = (req.query.priceFormat as string) || saved.priceFormat;
  const includeLayout = (req.query.includeLayout as string) || saved.includeLayout;

  const result = await fetchAndExtractFlats(feedUrl);
  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }

  let filteredFlats = result.flats;
  if (statusFilter === "free") {
    filteredFlats = filteredFlats.filter(f => f.status === 0);
  }
  filteredFlats = filteredFlats.filter(f => allowedTypes.includes(f.type));

  // Dynamically resolve correct public host and protocol (supporting secure proxy environments)
  const appHost = req.get("host") || process.env.APP_URL || `localhost:${PORT}`;
  const appProto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
  const appUrl = `${appProto}://${appHost}`;

  // Override images for all parking spaces to use the custom SVG icon
  filteredFlats = filteredFlats.map(f => {
    if (f.type === 1) {
      return {
        ...f,
        images: [{ type: "plan", src: `${appUrl}/api/parking_space.svg` }]
      };
    }
    return f;
  });

  const getCategoryName = (f: FlatItem) => {
    const typeName = f.type === 0 ? "Квартиры" : f.type === 1 ? "Паркинг" : f.type === 3 ? "Коммерция" : "Другие помещения";
    switch (categoryType) {
      case "project":
        return f.projectTitle;
      case "project_house":
        return `${f.projectTitle} / ${f.houseTitle}`;
      case "property_type":
        return typeName;
      case "combined":
      default:
        return `${f.projectTitle} / ${typeName}`;
    }
  };

  const getFlatName = (f: FlatItem) => {
    let typeLabel = "Помещение";
    if (f.type === 0) {
      typeLabel = f.is_studio ? "Студия" : "Квартира";
    } else if (f.type === 1) {
      typeLabel = "Машиноместо";
    } else if (f.type === 3) {
      typeLabel = "Коммерческое помещение";
    }

    let roomPrefix = "";
    if (f.type === 0 && !f.is_studio && f.rooms !== null) {
      roomPrefix = `${f.rooms}-комн. `;
    }

    const priceText = priceFormat === "million" && f.price 
      ? ` (${(f.price / 1000000).toFixed(2)} млн ₽)` 
      : "";

    return `${roomPrefix}${typeLabel} №${f.number}, ${f.area} м²${priceText}`;
  };

  const getFlatDescription = (f: FlatItem) => {
    const decoration = f.decoration_name ? `, отделка: ${f.decoration_name}` : "";
    return `Жилой комплекс "${f.projectTitle}", ${f.houseTitle}, секция ${f.sectionTitle}, этаж ${f.floorNumber}${decoration}`;
  };

  const formatted = filteredFlats.map(f => {
    let roomsCountValue = "";
    if (f.type === 0) {
      if (f.is_studio || f.rooms === 0 || (f.rooms_sign && String(f.rooms_sign).toLowerCase().includes("студ"))) {
        roomsCountValue = "Студия";
      } else if (f.rooms !== null && f.rooms !== undefined) {
        roomsCountValue = String(f.rooms);
      } else if (f.rooms_sign) {
        const parsed = parseInt(String(f.rooms_sign), 10);
        if (!isNaN(parsed)) {
          roomsCountValue = String(parsed);
        } else {
          roomsCountValue = "1";
        }
      } else {
        const areaNum = typeof f.area === 'number' ? f.area : parseFloat(String(f.area)) || 0;
        roomsCountValue = (areaNum > 0 && areaNum < 28) ? "Студия" : "1";
      }
    } else if (f.type === 1) {
      roomsCountValue = "Паркинг";
    } else if (f.type === 3) {
      roomsCountValue = "Коммерция";
    } else {
      roomsCountValue = "Другое";
    }

    return {
      id: f.id,
      sku: `DOMO-${f.id}`,
      category: getCategoryName(f),
      title: getFlatName(f),
      description: getFlatDescription(f),
      price: f.price || 0,
      area: f.area,
      floor: f.floorNumber,
      rooms: f.rooms,
      isStudio: f.is_studio === 1,
      type: f.type,
      status: f.status,
      house: f.houseTitle,
      project: f.projectTitle,
      section: f.sectionTitle,
      images: f.images.map(img => img.src),
      roomsCount: roomsCountValue,
      "Characteristics: Кол-во комнат": roomsCountValue
    };
  });

  res.json(formatted);
};

app.get("/api/feed-json", feedJsonHandler);
app.get("/feed.json", feedJsonHandler);

// Endpoint 5: Webhook receiver from Domoplaner
app.post("/api/webhook/domoplaner", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }

  const log: WebhookLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    method: req.method,
    headers: req.headers,
    body: req.body,
    ip: req.ip || (req.headers["x-forwarded-for"] as string) || "127.0.0.1"
  };

  webhookLogs.push(log);
  if (webhookLogs.length > 50) webhookLogs.shift(); // Keep last 50 entries

  console.log(`[Webhook] Received webhook from Domoplaner:`, req.body);
  res.json({ status: "ok", received: true, logId: log.id });
});

// Endpoint 6: Fetch webhook logs for debugger
app.get("/api/webhook-logs", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json(webhookLogs.slice().reverse());
});

// Endpoint 7: Clear webhook logs
app.post("/api/webhook-logs/clear", (req, res) => {
  webhookLogs.length = 0;
  res.json({ status: "ok" });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT} (Node Env: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer();
