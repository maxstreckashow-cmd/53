import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

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

async function fetchAndExtractFlats(feedUrl: string): Promise<{ flats: FlatItem[]; error?: string; rawData?: any }> {
  try {
    // Add cache busting parameter to feedUrl to bypass any CDN or intermediary cache
    let finalUrl = feedUrl;
    try {
      const parsedUrl = new URL(feedUrl);
      parsedUrl.searchParams.set("_t", String(Date.now()));
      finalUrl = parsedUrl.toString();
    } catch (e) {
      if (feedUrl.includes("?")) {
        finalUrl = `${feedUrl}&_t=${Date.now()}`;
      } else {
        finalUrl = `${feedUrl}?_t=${Date.now()}`;
      }
    }

    const response = await fetch(finalUrl, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    if (!response.ok) {
      return { flats: [], error: `Ошибка загрузки фида: ${response.status} ${response.statusText}` };
    }
    const data = await response.json();
    if (!data || typeof data !== 'object') {
      return { flats: [], error: "Получен некорректный JSON фид" };
    }

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

    return { flats: extracted, rawData: data };
  } catch (err: any) {
    return { flats: [], error: `Исключение при получении фида: ${err.message}` };
  }
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

  res.json({
    totalCount: flats.length,
    freeCount: flats.filter(f => f.status === 0).length,
    projects: projectStats,
    houses: houseStats,
    types: typeStats,
    sample: flats.slice(0, 20),
    feedUrl
  });
});

// Endpoint 3: Convert feed (YML or CSV)
app.get("/api/feed-convert", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const feedUrl = (req.query.feedUrl as string) || "https://domoplaner.ru/dc-api/feeds/311-mTA43T5ivZbLiORunzQVnjsGdtjVuFDFQzFr466CDXX78Kz206M0ZaQjWLnO1soT/";
  const format = (req.query.format as string) || "yml"; // "yml" or "csv"
  const statusFilter = (req.query.statusFilter as string) || "free"; // "free" (0) or "all"
  const typeFilter = (req.query.typeFilter as string) || "0,1,3"; // comma-separated list of types
  const categoryType = (req.query.categoryType as string) || "property_type"; // "project", "project_house", "property_type", "combined"
  const priceFormat = (req.query.priceFormat as string) || "full"; // "million" (e.g. 11.99 млн) or "full"
  const includeLayout = (req.query.includeLayout as string) || "yes"; // "yes" or "no"

  const result = await fetchAndExtractFlats(feedUrl);
  if (result.error) {
    res.status(400).send(`Ошибка: ${result.error}`);
    return;
  }

  // Parse type filters
  const allowedTypes = typeFilter.split(',').map(t => parseInt(t.trim(), 10)).filter(t => !isNaN(t));

  // Filter flats
  let filteredFlats = result.flats;
  if (statusFilter === "free") {
    filteredFlats = filteredFlats.filter(f => f.status === 0);
  }
  filteredFlats = filteredFlats.filter(f => allowedTypes.includes(f.type));

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

    // Exact Tilda CSV columns as per user's example with added Properties for range slider filtering
    const headerRow = `"Tilda UID";Brand;SKU;Mark;Category;Title;Description;Text;Photo;Price;Quantity;"Price Old";Editions;Modifications;"External ID";"Parent UID";Characteristics:Проект;Characteristics:Секция;Characteristics:Этаж;"Characteristics:Тип объекта";Characteristics:Площадь;Characteristics:Отделка;"Characteristics:Номер на этаже";"Characteristics:ID объекта";Properties:Площадь;Properties:Этаж;Weight;Length;Width;Height;"SEO title";"SEO descr";"SEO keywords";"FB title";"FB descr"`;
    let csvContent = "\ufeff" + headerRow + "\n"; // Include UTF-8 BOM for Excel support

    filteredFlats.forEach(f => {
      const flatIdNum = typeof f.id === 'number' ? f.id : parseInt(String(f.id), 10) || 0;
      const tildaUid = String(300000000000 + flatIdNum);
      const sku = String(f.id); // SKU = Id объекта
      const category = getCategoryName(f);
      const title = getFlatName(f);
      
      const description = "";
      
      const text = ""; // Empty as in user's example, characteristics are separate
      const photo = f.images.map(img => img.src).join(",");
      const price = f.price || "";
      const quantity = f.status === 0 ? "1" : "0";
      const extId = String(f.id);

      // Characteristics & Properties
      const sectionValue = f.sectionTitle ? f.sectionTitle.replace(/^Секция\s+/i, "") : "";
      const projectValue = f.projectTitle;
      const floorValue = String(f.floorNumber);
      const typeLabel = f.type === 0 ? "Квартира" : f.type === 1 ? "Машиноместо" : f.type === 3 ? "Коммерция" : "Другое";
      const areaValue = String(f.area);
      const decorationValue = f.decoration_name || "Без отделки";
      const numberOnFloorValue = String(f.number);

      // Dynamic SEO strings matching your style
      const seoTitle = `${title}. Жилой комплекс "${f.projectTitle}"`;
      
      let roomsWord = "Помещение";
      if (f.type === 0) {
        roomsWord = f.is_studio ? "Студия" : f.rooms === 1 ? "Однокомнатная квартира" : f.rooms === 2 ? "Двухкомнатная квартира" : f.rooms === 3 ? "Трехкомнатная квартира" : `${f.rooms}-комнатная квартира`;
      } else if (f.type === 1) {
        roomsWord = "Машиноместо";
      } else if (f.type === 3) {
        roomsWord = "Коммерческое помещение";
      }
      
      const seoDescr = `${roomsWord} №${f.number}, ${f.area} м². Жилой комплекс "${f.projectTitle}". Новостройка. Ипотека. Рассрочка. Наличные`;
      const roomsKeyword = f.type === 0 && f.rooms ? `${f.rooms}, комнатная, ` : "";
      const seoKeywords = `ЖК ${f.projectTitle}, новостройка, ${roomsKeyword}ипотека, рассрочка, застройщик`;

      const row = [
        tildaUid, // Tilda UID (Product ID)
        "", // Brand
        sku, // SKU (Id объекта)
        "", // Mark
        category, // Category
        title, // Title
        description, // Description
        text, // Text
        photo, // Photo
        price, // Price
        quantity, // Quantity
        "", // Price Old
        "", // Editions
        "", // Modifications
        extId, // External ID
        "", // Parent UID
        projectValue, // Characteristics:Проект
        sectionValue, // Characteristics:Секция
        floorValue, // Characteristics:Этаж
        typeLabel, // Characteristics:Тип объекта
        areaValue, // Characteristics:Площадь
        decorationValue, // Characteristics:Отделка
        numberOnFloorValue, // Characteristics:Номер на этаже
        extId, // Characteristics:ID объекта
        areaValue, // Properties:Площадь (Numeric range filter slider support)
        floorValue, // Properties:Этаж (Numeric range filter slider support)
        "0", // Weight
        "0", // Length
        "0", // Width
        "0", // Height
        seoTitle, // SEO title
        seoDescr, // SEO descr
        seoKeywords, // SEO keywords
        "", // FB title
        ""  // FB descr
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

      yml += `        <param name="Проект">${escapeXML(f.projectTitle)}</param>\n`;
      yml += `        <param name="Секция">${escapeXML(sectionValue)}</param>\n`;
      yml += `        <param name="Этаж">${f.floorNumber}</param>\n`;
      yml += `        <param name="Тип объекта">${escapeXML(typeLabel)}</param>\n`;
      yml += `        <param name="Площадь">${f.area}</param>\n`;
      yml += `        <param name="Отделка">${escapeXML(f.decoration_name || "Без отделки")}</param>\n`;
      yml += `        <param name="Номер на этаже">${escapeXML(String(f.number))}</param>\n`;
      yml += `        <param name="ID объекта">${f.id}</param>\n`;
      yml += `      </offer>\n`;
    });

    yml += `    </offers>\n`;
    yml += `  </shop>\n`;
    yml += `</yml_catalog>\n`;

    res.send(yml);
  }
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
app.get("/api/feed-json", async (req, res) => {
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

  const feedUrl = (req.query.feedUrl as string) || "https://domoplaner.ru/dc-api/feeds/311-mTA43T5ivZbLiORunzQVnjsGdtjVuFDFQzFr466CDXX78Kz206M0ZaQjWLnO1soT/";
  const statusFilter = (req.query.statusFilter as string) || "free"; 
  const typeFilter = (req.query.typeFilter as string) || "0,1,3";
  const categoryType = (req.query.categoryType as string) || "combined";
  const priceFormat = (req.query.priceFormat as string) || "full";
  const includeLayout = (req.query.includeLayout as string) || "yes";

  const result = await fetchAndExtractFlats(feedUrl);
  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }

  const allowedTypes = typeFilter.split(',').map(t => parseInt(t.trim(), 10)).filter(t => !isNaN(t));

  let filteredFlats = result.flats;
  if (statusFilter === "free") {
    filteredFlats = filteredFlats.filter(f => f.status === 0);
  }
  filteredFlats = filteredFlats.filter(f => allowedTypes.includes(f.type));

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
      images: f.images.map(img => img.src)
    };
  });

  res.json(formatted);
});

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
