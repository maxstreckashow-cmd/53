import { useState, useEffect } from "react";
import { 
  Database, 
  Settings, 
  Copy, 
  Check, 
  Save, 
  ExternalLink, 
  FileCode, 
  FileSpreadsheet, 
  Download, 
  RefreshCw, 
  Sliders, 
  HelpCircle, 
  Activity, 
  Building, 
  CheckCircle2, 
  Info,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  User,
  ShieldCheck,
  Code,
  Terminal,
  Trash2,
  Play,
  Plus,
  EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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

interface FeedStats {
  totalCount: number;
  freeCount: number;
  projects: { [key: string]: { total: number; free: number } };
  houses: { [key: string]: { total: number; free: number } };
  types: { [key: string]: { total: number; free: number } };
  sample?: FlatItem[];
}

export default function App() {
  const [feedUrl, setFeedUrl] = useState("https://domoplaner.ru/dc-api/feeds/311-mTA43T5ivZbLiORunzQVnjsGdtjVuFDFQzFr466CDXX78Kz206M0ZaQjWLnO1soT/");
  const [statusFilter, setStatusFilter] = useState("free"); // "free" | "all"
  const [allowedTypes, setAllowedTypes] = useState<number[]>([0, 1, 3]); // 0 = квартир, 1 = паркинг, 3 = коммерция
  const [categoryType, setCategoryType] = useState("property_type"); // "project", "project_house", "property_type", "combined"
  const [priceFormat, setPriceFormat] = useState("full"); // "full" | "million"
  const [includeLayout, setIncludeLayout] = useState("yes"); // "yes" | "no"
  const [customDomain, setCustomDomain] = useState("https://catalog.residence-tula.ru");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<FeedStats | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // States for Integrations and Webhooks
  const [activeTab, setActiveTab] = useState<"preview" | "widget" | "webhook">("preview");
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);

  const fetchWebhookLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/webhook-logs");
      if (res.ok) {
        const data = await res.json();
        setWebhookLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleClearWebhookLogs = async () => {
    try {
      await fetch("/api/webhook-logs/clear", { method: "POST" });
      setWebhookLogs([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateWebhook = async () => {
    setSimulatingWebhook(true);
    try {
      const res = await fetch("/api/webhook/domoplaner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "flat_status_changed",
          timestamp: new Date().toISOString(),
          data: {
            id: stats?.sample?.[0]?.id || 527181,
            number: stats?.sample?.[0]?.number || "42A",
            project: stats?.sample?.[0]?.projectTitle || "ЖК Легенда",
            old_status: 1,
            new_status: 0,
            price: stats?.sample?.[0]?.price || 8500000
          }
        })
      });
      if (res.ok) {
        await fetchWebhookLogs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulatingWebhook(false);
    }
  };

  // Load feed statistics
  const fetchStats = async (urlToFetch: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/feed-info?feedUrl=${encodeURIComponent(urlToFetch)}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error: ${response.status}`);
      }
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Не удалось загрузить или разобрать фид. Проверьте правильность ссылки.");
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initSettings = async () => {
      try {
        const response = await fetch("/api/get-settings");
        if (response.ok) {
          const settings = await response.json();
          if (settings.feedUrl) setFeedUrl(settings.feedUrl);
          if (settings.statusFilter) setStatusFilter(settings.statusFilter);
          if (settings.allowedTypes) setAllowedTypes(settings.allowedTypes);
          if (settings.categoryType) setCategoryType(settings.categoryType);
          if (settings.priceFormat) setPriceFormat(settings.priceFormat);
          if (settings.includeLayout) setIncludeLayout(settings.includeLayout);
          if (settings.customDomain) setCustomDomain(settings.customDomain);
          
          fetchStats(settings.feedUrl || feedUrl);
        } else {
          fetchStats(feedUrl);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
        fetchStats(feedUrl);
      }
    };
    initSettings();
  }, []);

  const handleRefreshStats = () => {
    fetchStats(feedUrl);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/save-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedUrl,
          statusFilter,
          allowedTypes,
          categoryType,
          priceFormat,
          includeLayout,
          customDomain
        })
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchStats(feedUrl);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleType = (type: number) => {
    if (allowedTypes.includes(type)) {
      if (allowedTypes.length > 1) {
        setAllowedTypes(allowedTypes.filter(t => t !== type));
      }
    } else {
      setAllowedTypes([...allowedTypes, type]);
    }
  };

  // Build the dynamic api converter links
  const appOrigin = window.location.origin;
  // Автоматически заменяем приватный -dev- домен на публичный -pre- (Shared App URL), чтобы все интеграции работали без авторизации в AI Studio
  const defaultPublicOrigin = appOrigin.replace("-dev-", "-pre-");
  const publicOrigin = customDomain.trim() ? customDomain.trim().replace(/\/$/, "") : defaultPublicOrigin;
  const buildQueryString = (format: "yml" | "csv") => {
    const params = new URLSearchParams();
    params.set("feedUrl", feedUrl);
    params.set("format", format);
    params.set("statusFilter", statusFilter);
    params.set("typeFilter", allowedTypes.join(","));
    params.set("categoryType", categoryType);
    params.set("priceFormat", priceFormat);
    params.set("includeLayout", includeLayout);
    return params.toString();
  };

  // New clean URLs ending with correct file extensions for direct Tilda compatibility!
  const cleanYmlLink = `${publicOrigin}/feed.yml`;
  const cleanYmlDownloadLink = `${cleanYmlLink}?download=true`;
  const cleanXmlLink = `${publicOrigin}/feed.xml`;
  const cleanCsvLink = `${publicOrigin}/feed.csv`;
  const cleanCsvDownloadLink = `${cleanCsvLink}?download=true`;

  const ymlLink = cleanYmlLink;
  const ymlDownloadLink = cleanYmlDownloadLink;
  const csvLink = cleanCsvLink;
  const jsonLink = `${publicOrigin}/api/feed-json`;

  const handleCopy = (link: string, type: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(type);
    setTimeout(() => {
      setCopiedLink(null);
    }, 2000);
  };

  const handleCopyCacheBusted = (baseLink: string, type: string) => {
    const buster = `&_t=${Date.now()}`;
    navigator.clipboard.writeText(baseLink + buster);
    setCopiedLink(type);
    setTimeout(() => {
      setCopiedLink(null);
    }, 2000);
  };

  // Live client-side rendering helper functions for preview table
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

  // Filter preview samples on client side dynamically
  const previewSample = stats?.sample ? stats.sample.filter(f => {
    if (statusFilter === "free" && f.status !== 0) return false;
    if (!allowedTypes.includes(f.type)) return false;
    return true;
  }).slice(0, 5) : [];

  const tildaSlidersCode = `<!-- Стиль и скрипт для превращения фильтров «Площадь» и «Этаж» в Tilda в красивые слайдеры -->
<style>
/* Скрытие кнопок "Показать все" в фильтрах Tilda */
.t-store__filter__showmore,
.t-store__filter__show-more,
.t-store__filter__btn-more,
.t-store__filter__more-btn,
.t-store__filter__more,
.t-store__filter__btn-showmore,
.t-store__filter__btn_showmore,
.t-store__filter__btn-more-wrapper,
.t-store__filter__item-more,
.t-store__filter__item_more,
.js-store-filter-showmore,
.js-store-filter-btn-more,
.t-store__filter__btn-all,
.t-store__filter__show-all,
.js-store-filter-item-more,
.t-store__filter__more-wrap {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  pointer-events: none !important;
}

/* Скрытие нижнего всплывающего поп-апа с выбранными вариантами (t-store__filter__chosen-bar) */
.t-store__filter__chosen-bar,
.js-store-filter-chosen-bar,
.t-store__filter__chosen-bar_show,
.t-store__filter__chosen-bar_active,
[class*="t-store__filter__chosen-bar"],
[class*="chosen-bar"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  transform: translateY(200%) !important;
  max-height: 0 !important;
  overflow: hidden !important;
}

/* Скрытие всплывающего поп-апа с ошибкой формы Tilda "Пожалуйста, заполните все обязательные поля" */
#tilda-popup-for-error,
.tilda-popup-for-error,
.t-popup#tilda-popup-for-error,
[id*="tilda-popup-for-error"],
.t-form__errorbox-text,
.t-form__errorbox-wrapper,
.t-form__errorbox-item,
.t-form__errorbox-middle,
.t-form__errorbox-bottom,
.js-errorbox-all,
.js-error-box-all,
[class*="t-form__errorbox"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  pointer-events: none !important;
  max-height: 0 !important;
  overflow: hidden !important;
}

.custom-range-slider-container {
  width: 100%;
  margin-top: 10px;
  margin-bottom: 22px;
  box-sizing: border-box;
}
.custom-slider-inputs {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}
.custom-input-field {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 6px 10px;
  width: 48%;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.custom-input-field:focus-within {
  border-color: #000000;
}
.custom-input-field span {
  color: #9ca3af;
  font-size: 12px;
  margin-right: 6px;
  user-select: none;
}
.custom-input-field input {
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  font-weight: 500;
  color: #111827;
  padding: 0;
  margin: 0;
  -moz-appearance: textfield;
}
.custom-input-field input::-webkit-outer-spin-button,
.custom-input-field input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.custom-slider-wrapper {
  position: relative;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  margin: 12px 0 6px 0;
}
.custom-slider-track {
  position: absolute;
  height: 100%;
  background: #000000; /* Цвет прогресс-бара */
  border-radius: 2px;
  left: 0%;
  width: 100%;
}
.custom-slider-wrapper input[type="range"] {
  position: absolute;
  width: 100%;
  height: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  pointer-events: none;
  -webkit-appearance: none;
  margin: 0;
  padding: 0;
  left: 0;
}
/* Стилизация круглых ручек ползунка в Chrome/Safari/Edge */
.custom-slider-wrapper input[type="range"]::-webkit-slider-thumb {
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid #000000;
  cursor: pointer;
  pointer-events: auto;
  -webkit-appearance: none;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  transition: transform 0.1s, background-color 0.1s;
}
.custom-slider-wrapper input[type="range"]::-webkit-slider-thumb:hover {
  background-color: #f3f4f6;
  transform: translateY(0%) scale(1.1);
}
/* Стилизация круглых ручек ползунка в Firefox */
.custom-slider-wrapper input[type="range"]::-moz-range-thumb {
  height: 12px;
  width: 12px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid #000000;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  transition: transform 0.1s, background-color 0.1s;
}
.custom-slider-wrapper input[type="range"]::-moz-range-thumb:hover {
  background-color: #f3f4f6;
  transform: scale(1.1);
}
</style>

<script>
(function() {
  function hideTildaFilterElements() {
    var chosenBars = document.querySelectorAll('.t-store__filter__chosen-bar, .js-store-filter-chosen-bar, [class*="t-store__filter__chosen-bar"], [class*="chosen-bar"]');
    chosenBars.forEach(function(bar) {
      bar.style.setProperty('display', 'none', 'important');
      bar.style.setProperty('visibility', 'hidden', 'important');
      bar.style.setProperty('opacity', '0', 'important');
      bar.style.setProperty('transform', 'translateY(200%)', 'important');
      bar.style.setProperty('pointer-events', 'none', 'important');
    });

    var showMoreBtns = document.querySelectorAll('.t-store__filter__showmore, .t-store__filter__show-more, .t-store__filter__btn-more, .t-store__filter__more-btn, .t-store__filter__more, .t-store__filter__btn-showmore, .t-store__filter__btn_showmore, .t-store__filter__btn-more-wrapper, .t-store__filter__item-more, .t-store__filter__item_more, .js-store-filter-showmore, .js-store-filter-btn-more, .t-store__filter__btn-all, .t-store__filter__show-all, .js-store-filter-item-more, .t-store__filter__more-wrap');
    showMoreBtns.forEach(function(btn) {
      btn.style.setProperty('display', 'none', 'important');
    });

    var filterEls = document.querySelectorAll('.t-store__filter *, .js-store-filter *');
    filterEls.forEach(function(el) {
      if (el.children.length === 0 && el.textContent) {
        var txt = el.textContent.trim().toLowerCase();
        if (txt === 'показать все' || txt === 'показать всё' || txt === 'показать еще' || txt === 'показать ещё') {
          var target = el;
          if (el.tagName !== 'BUTTON' && el.tagName !== 'A' && el.parentElement) {
            target = el.closest('button, a, .t-store__filter__btn-more, div') || el;
          }
          target.style.setProperty('display', 'none', 'important');
        }
      }
    });

    var errorBoxes = document.querySelectorAll('#tilda-popup-for-error, [id*="tilda-popup-for-error"], .tilda-popup-for-error, .t-form__errorbox-text, .t-form__errorbox-wrapper, .t-form__errorbox-item, .t-form__errorbox-middle, .t-form__errorbox-bottom, .js-errorbox-all, .js-error-box-all, [class*="t-form__errorbox"]');
    errorBoxes.forEach(function(box) {
      box.style.setProperty('display', 'none', 'important');
      box.style.setProperty('visibility', 'hidden', 'important');
      box.style.setProperty('opacity', '0', 'important');
      box.style.setProperty('height', '0', 'important');
      box.style.setProperty('padding', '0', 'important');
      box.style.setProperty('margin', '0', 'important');
      box.style.setProperty('pointer-events', 'none', 'important');
      if (box.classList.contains('t-popup_show')) {
        box.classList.remove('t-popup_show');
      }
    });
  }

  function initTildaCustomSliders() {
    hideTildaFilterElements();
    var filterItems = document.querySelectorAll('.js-store-filter-item, .t-store__filter__item, .t-store__filter-item, .t-store__filter__wrap');
    if (!filterItems.length) return;

    filterItems.forEach(function(item) {
      var titleEl = item.querySelector('.t-store__filter__title, .js-store-filter-title, .t-store__filter__name, .t-store__filter__item-title, .t-store__filter-item-title, h3, h4, h5, .t-descr');
      if (!titleEl) return;

      var titleText = titleEl.textContent.trim().toLowerCase();
      var isArea = titleText.indexOf('площадь') !== -1 || titleText.indexOf('area') !== -1 || titleText.indexOf('sq') !== -1;
      var isFloor = titleText.indexOf('этаж') !== -1 || titleText.indexOf('floor') !== -1;

      if (!isArea && !isFloor) return;
      if (item.querySelector('.custom-range-slider-container')) return;

      var checkboxes = item.querySelectorAll('input[type="checkbox"]');
      var nativeInputs = item.querySelectorAll('input.t-store__filter__input, input.js-store-filter-val, input.t-input, input[type="text"], input[type="number"]');

      var strategy = "";
      var itemsData = [];
      var defaultMin = isArea ? 30 : 1;
      var defaultMax = isArea ? 150 : 25;
      var currentMin = defaultMin;
      var currentMax = defaultMax;

      var nativeMinInput = null;
      var nativeMaxInput = null;

      if (checkboxes.length > 0) {
        strategy = "checkbox";
        checkboxes.forEach(function(cb) {
          var labelEl = cb.closest('label') || cb.parentElement;
          var labelText = labelEl ? labelEl.textContent.trim() : '';
          var valText = labelText || cb.value || '';
          var match = valText.match(/[0-9.,]+/);
          if (match) {
            var valNum = parseFloat(match[0].replace(',', '.'));
            if (!isNaN(valNum)) {
              itemsData.push({
                checkbox: cb,
                value: valNum,
                labelEl: labelEl
              });
            }
          }
        });

        if (itemsData.length === 0) return;

        var values = itemsData.map(function(d) { return d.value; });
        defaultMin = Math.min.apply(null, values);
        defaultMax = Math.max.apply(null, values);

        var checkedItems = itemsData.filter(function(d) { return d.checkbox.checked; });
        if (checkedItems.length > 0) {
          var checkedVals = checkedItems.map(function(d) { return d.value; });
          currentMin = Math.min.apply(null, checkedVals);
          currentMax = Math.max.apply(null, checkedVals);
        } else {
          currentMin = defaultMin;
          currentMax = defaultMax;
        }

        // Hide checkbox elements
        itemsData.forEach(function(d) {
          if (d.labelEl) {
            d.labelEl.style.display = 'none';
          } else {
            d.checkbox.style.display = 'none';
          }
        });

      } else if (nativeInputs.length >= 2) {
        strategy = "inputs";
        nativeMinInput = nativeInputs[0];
        nativeMaxInput = nativeInputs[1];

        if (nativeMinInput.placeholder) {
          var parsedMin = parseFloat(nativeMinInput.placeholder.replace(/[^0-9.]/g, ''));
          if (!isNaN(parsedMin)) defaultMin = parsedMin;
        }
        if (nativeMaxInput.placeholder) {
          var parsedMax = parseFloat(nativeMaxInput.placeholder.replace(/[^0-9.]/g, ''));
          if (!isNaN(parsedMax)) defaultMax = parsedMax;
        }

        currentMin = parseFloat(nativeMinInput.value);
        if (isNaN(currentMin)) currentMin = defaultMin;
        currentMax = parseFloat(nativeMaxInput.value);
        if (isNaN(currentMax)) currentMax = defaultMax;

        var nativeControlRange = item.querySelector('.t-store__filter__control_range, .t-store__filter__control');
        if (nativeControlRange) {
          nativeControlRange.style.display = 'none';
        } else {
          nativeMinInput.style.display = 'none';
          nativeMaxInput.style.display = 'none';
        }
      } else {
        return;
      }

      if (defaultMin === defaultMax) return;

      var sliderContainer = document.createElement('div');
      sliderContainer.className = 'custom-range-slider-container';

      var step = isArea ? 0.1 : 1;

      sliderContainer.innerHTML = [
        '<div class="custom-slider-inputs">',
          '<div class="custom-input-field">',
            '<span>от</span>',
            '<input type="number" class="custom-min-input" value="' + currentMin + '" min="' + defaultMin + '" max="' + defaultMax + '" step="' + step + '">',
            isArea ? '<span style="color:#9ca3af; margin-left:2px; font-size:11px;">м²</span>' : '',
          '</div>',
          '<div class="custom-input-field">',
            '<span>до</span>',
            '<input type="number" class="custom-max-input" value="' + currentMax + '" min="' + defaultMin + '" max="' + defaultMax + '" step="' + step + '">',
            isArea ? '<span style="color:#9ca3af; margin-left:2px; font-size:11px;">м²</span>' : '',
          '</div>',
        '</div>',
        '<div class="custom-slider-wrapper">',
          '<div class="custom-slider-track"></div>',
          '<input type="range" class="custom-range-min" min="' + defaultMin + '" max="' + defaultMax + '" value="' + currentMin + '" step="' + step + '">',
          '<input type="range" class="custom-range-max" min="' + defaultMin + '" max="' + defaultMax + '" value="' + currentMax + '" step="' + step + '">',
        '</div>'
      ].join('');

      titleEl.parentNode.insertBefore(sliderContainer, titleEl.nextSibling);

      var customMinInput = sliderContainer.querySelector('.custom-min-input');
      var customMaxInput = sliderContainer.querySelector('.custom-max-input');
      var customRangeMin = sliderContainer.querySelector('.custom-range-min');
      var customRangeMax = sliderContainer.querySelector('.custom-range-max');
      var sliderTrack = sliderContainer.querySelector('.custom-slider-track');

      var minGap = isArea ? 0.5 : 1;

      function updateTrack() {
        var minPercent = ((parseFloat(customRangeMin.value) - defaultMin) / (defaultMax - defaultMin)) * 100;
        var maxPercent = ((parseFloat(customRangeMax.value) - defaultMin) / (defaultMax - defaultMin)) * 100;
        sliderTrack.style.left = minPercent + '%';
        sliderTrack.style.width = (maxPercent - minPercent) + '%';
      }

      var debounceTimer;
      function applyFilter(userMin, userMax) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
          if (strategy === "checkbox") {
            var changedCount = 0;
            itemsData.forEach(function(d) {
              var shouldBeChecked = d.value >= userMin && d.value <= userMax;
              if (d.checkbox.checked !== shouldBeChecked) {
                // Set native property
                d.checkbox.checked = shouldBeChecked;

                // Sync styled visual wrappers (like iCheck or Tilda's custom styling)
                var labelEl = d.labelEl;
                if (labelEl) {
                  if (shouldBeChecked) {
                    labelEl.classList.add('t-active');
                    var checkDiv = labelEl.querySelector('.t-checkbox__control, .t-checkbox__indicator');
                    if (checkDiv) checkDiv.classList.add('t-active');
                  } else {
                    labelEl.classList.remove('t-active');
                    var checkDiv = labelEl.querySelector('.t-checkbox__control, .t-checkbox__indicator');
                    if (checkDiv) checkDiv.classList.remove('t-active');
                  }
                }

                // Trigger change event natively
                try {
                  var event = new Event('change', { bubbles: true });
                  d.checkbox.dispatchEvent(event);
                } catch (e) {
                  var htmlEvent = document.createEvent('HTMLEvents');
                  htmlEvent.initEvent('change', true, true);
                  d.checkbox.dispatchEvent(htmlEvent);
                }

                // Trigger change event via jQuery (Tilda's store script uses jQuery)
                if (window.jQuery) {
                  window.jQuery(d.checkbox).prop('checked', shouldBeChecked).trigger('change');
                }
                
                changedCount++;
              }
            });
            
            var form = item.closest('form') || document.querySelector('.js-store-filters, form');
            if (form) {
              // Trigger change event on form
              try {
                form.dispatchEvent(new Event('change', { bubbles: true }));
              } catch (e) {}
              if (window.jQuery) {
                window.jQuery(form).trigger('change');
              }
              
              // Trigger click on submit button if one exists
              var submitBtn = form.querySelector('.js-store-filter-submit, button[type="submit"]');
              if (submitBtn) {
                submitBtn.click();
              }
            }
          } else if (strategy === "inputs") {
            if (window.jQuery) {
              window.jQuery(nativeMinInput).val(userMin).trigger('input').trigger('change');
              window.jQuery(nativeMaxInput).val(userMax).trigger('input').trigger('change');
            } else {
              nativeMinInput.value = userMin;
              nativeMaxInput.value = userMax;
              
              try {
                var eventInput = new Event('input', { bubbles: true });
                var eventChange = new Event('change', { bubbles: true });
                nativeMinInput.dispatchEvent(eventInput);
                nativeMinInput.dispatchEvent(eventChange);
                nativeMaxInput.dispatchEvent(eventInput);
                nativeMaxInput.dispatchEvent(eventChange);
              } catch(e) {
                var eventMin = document.createEvent('HTMLEvents');
                eventMin.initEvent('input', true, true);
                nativeMinInput.dispatchEvent(eventMin);
                
                var eventMax = document.createEvent('HTMLEvents');
                eventMax.initEvent('input', true, true);
                nativeMaxInput.dispatchEvent(eventMax);

                var changeEventMin = document.createEvent('HTMLEvents');
                changeEventMin.initEvent('change', true, true);
                nativeMinInput.dispatchEvent(changeEventMin);
              }
            }

            var form = item.closest('form') || document.querySelector('.js-store-filters, form');
            if (form) {
              try {
                form.dispatchEvent(new Event('change', { bubbles: true }));
              } catch(e) {}
              if (window.jQuery) {
                window.jQuery(form).trigger('change');
              }
              var submitBtn = form.querySelector('.js-store-filter-submit, button[type="submit"]');
              if (submitBtn) {
                submitBtn.click();
              }
            }
          }
        }, 350);
      }

      customRangeMin.addEventListener('input', function() {
        var minVal = parseFloat(customRangeMin.value);
        var maxVal = parseFloat(customRangeMax.value);

        if (minVal > maxVal - minGap) {
          customRangeMin.value = maxVal - minGap;
          minVal = maxVal - minGap;
        }
        customMinInput.value = minVal;
        updateTrack();
        applyFilter(minVal, maxVal);
      });

      customRangeMax.addEventListener('input', function() {
        var minVal = parseFloat(customRangeMin.value);
        var maxVal = parseFloat(customRangeMax.value);

        if (maxVal < minVal + minGap) {
          customRangeMax.value = minVal + minGap;
          maxVal = minVal + minGap;
        }
        customMaxInput.value = maxVal;
        updateTrack();
        applyFilter(minVal, maxVal);
      });

      customMinInput.addEventListener('change', function() {
        var minVal = parseFloat(customMinInput.value);
        var maxVal = parseFloat(customMaxInput.value);

        if (isNaN(minVal) || minVal < defaultMin) minVal = defaultMin;
        if (minVal > maxVal - minGap) minVal = minVal - minGap;

        customMinInput.value = minVal;
        customRangeMin.value = minVal;
        updateTrack();
        applyFilter(minVal, maxVal);
      });

      customMaxInput.addEventListener('change', function() {
        var minVal = parseFloat(customMinInput.value);
        var maxVal = parseFloat(customMaxInput.value);

        if (isNaN(maxVal) || maxVal > defaultMax) maxVal = defaultMax;
        if (maxVal < minVal + minGap) maxVal = minVal + minGap;

        customMaxInput.value = maxVal;
        customRangeMax.value = maxVal;
        updateTrack();
        applyFilter(minVal, maxVal);
      });

      updateTrack();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      hideTildaFilterElements();
      initTildaCustomSliders();
    });
  } else {
    hideTildaFilterElements();
    initTildaCustomSliders();
  }
  
  var observer = new MutationObserver(function() {
    hideTildaFilterElements();
    initTildaCustomSliders();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(hideTildaFilterElements, 500);
})();
</script>`;

  const tildaLiveSyncCode = `<!-- Скрипт «Живой авто-синхронизатор» цен и бронирования на Tilda -->
<style>
.t-store__filter__showmore, .t-store__filter__show-more, .t-store__filter__btn-more,
.t-store__filter__more-btn, .t-store__filter__more, .t-store__filter__btn-showmore,
.t-store__filter__btn_showmore, .t-store__filter__btn-more-wrapper, .t-store__filter__item-more,
.t-store__filter__item_more, .js-store-filter-showmore, .js-store-filter-btn-more,
.t-store__filter__btn-all, .t-store__filter__show-all, .t-store__filter__chosen-bar,
.js-store-filter-chosen-bar, .t-store__filter__chosen-bar_show, .t-store__filter__chosen-bar_active,
[class*="t-store__filter__chosen-bar"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
.custom-sync-status-badge, .t-store__card__mark, .js-store-prod-mark {
  border-radius: 0 !important;
  font-family: Montserrat, Arial, sans-serif !important;
  border: none !important;
}
.custom-sync-status-badge {
  position: absolute !important;
  top: 10px !important;
  right: 10px !important;
  z-index: 10 !important;
  padding: 4px 8px !important;
  font-size: 10px !important;
  font-weight: bold !important;
  text-transform: uppercase !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
  border: none !important;
}
.custom-sync-status-badge.status-free {
  background-color: #ecfdf5 !important;
  color: #047857 !important;
}
.custom-sync-status-badge.status-booked {
  background-color: #fff7ed !important;
  color: #c2410c !important;
}
.custom-sync-status-badge.status-sold {
  background-color: #fef2f2 !important;
  color: #b91c1c !important;
}
</style>
<script>
(function() {
  const BASE_API_URL = "${jsonLink}";
  window._domoFeedCache = window._domoFeedCache || null;

  function hideTildaFilterElements() {
    try {
      const chosenBars = document.querySelectorAll('.t-store__filter__chosen-bar, .js-store-filter-chosen-bar, [class*="t-store__filter__chosen-bar"]');
      chosenBars.forEach(bar => {
        bar.style.setProperty('display', 'none', 'important');
        bar.style.setProperty('visibility', 'hidden', 'important');
        bar.style.setProperty('opacity', '0', 'important');
      });
      const showMoreBtns = document.querySelectorAll('.t-store__filter__showmore, .t-store__filter__show-more, .t-store__filter__btn-more, .t-store__filter__more-btn, .t-store__filter__more, .t-store__filter__btn-showmore, .t-store__filter__btn_showmore, .t-store__filter__btn-more-wrapper, .t-store__filter__item-more, .t-store__filter__item_more, .js-store-filter-showmore, .js-store-filter-btn-more, .t-store__filter__btn-all, .t-store__filter__show-all');
      showMoreBtns.forEach(btn => {
        btn.style.setProperty('display', 'none', 'important');
      });
      const errorBoxes = document.querySelectorAll('#tilda-popup-for-error, [id*="tilda-popup-for-error"], .tilda-popup-for-error, .t-form__errorbox-text, .t-form__errorbox-wrapper, .t-form__errorbox-item, .t-form__errorbox-middle, .t-form__errorbox-bottom, .js-errorbox-all, .js-error-box-all, [class*="t-form__errorbox"]');
      errorBoxes.forEach(box => {
        box.style.setProperty('display', 'none', 'important');
        box.style.setProperty('visibility', 'hidden', 'important');
        box.style.setProperty('opacity', '0', 'important');
        box.style.setProperty('pointer-events', 'none', 'important');
        if (box.classList.contains('t-popup_show')) {
          box.classList.remove('t-popup_show');
        }
      });
    } catch(e) {}
  }

  // Мгновенное синхронное обновление элементов DOM из памяти (<1мс)
  function applyDomoSyncToDOM() {
    hideTildaFilterElements();
    if (!window._domoFeedCache) return;

    const flatMap = window._domoFeedCache.flatMap;
    const flatByNumber = window._domoFeedCache.flatByNumber;

    const selectors = [
      '.js-product',
      '.js-store-prod',
      '.t-store__card',
      '.t-prod-card',
      '.js-store-product',
      '.t-store__card__wrapper',
      '.t-store__prod-popup',
      '.js-store-prod-popup',
      '.t-popup_show .js-product',
      '.t-popup_show .t-store__prod-popup',
      '[data-product-lid]',
      '[data-product-id]',
      '[data-product-sku]',
      '[data-product-gen-uid]'
    ];

    const productElements = document.querySelectorAll(selectors.join(', '));
    productElements.forEach(el => {
      try {
        let lid = el.getAttribute('data-product-lid') || 
                  el.getAttribute('data-product-id') || 
                  el.getAttribute('data-product-uid') || 
                  el.getAttribute('data-product-gen-uid') || 
                  el.getAttribute('data-product-external-id') || 
                  el.getAttribute('data-card-uid') || '';

        let sku = el.getAttribute('data-product-sku') || 
                  el.getAttribute('data-product-external-id') || 
                  el.getAttribute('data-sku') || 
                  el.getAttribute('data-product-code') || '';
        
        if (!sku) {
          const skuEl = el.querySelector('.js-store-prod-sku, .t-store__prod-popup__sku, .t-store__card__sku, .js-product-sku, [data-product-sku], input[name="sku"]');
          if (skuEl) {
            sku = skuEl.getAttribute('data-product-sku') || skuEl.value || skuEl.textContent.replace(/Артикул:\\s*/i, '').replace(/SKU:\\s*/i, '').trim();
          }
        }

        if (!lid) {
          const lidEl = el.querySelector('[data-product-lid], [data-product-id]');
          if (lidEl) {
            lid = lidEl.getAttribute('data-product-lid') || lidEl.getAttribute('data-product-id') || '';
          }
        }
        
        let flat = null;
        if (lid && flatMap[lid]) {
          flat = flatMap[lid];
        } else if (sku && flatMap[sku]) {
          flat = flatMap[sku];
        } else if (sku && flatMap[sku.toLowerCase()]) {
          flat = flatMap[sku.toLowerCase()];
        } else if (sku && flatMap[sku.replace(/^DOMO-/i, "")]) {
          flat = flatMap[sku.replace(/^DOMO-/i, "")];
        } else if (lid) {
          const parsedId = parseInt(lid, 10);
          if (!isNaN(parsedId) && parsedId > 300000000000) {
            const calculatedId = String(parsedId - 300000000000);
            if (flatMap[calculatedId]) flat = flatMap[calculatedId];
          }
        }

        if (!flat) {
          const txt = el.textContent || '';
          const domoMatch = txt.match(/DOMO-(\\d+)/i);
          if (domoMatch && flatMap[domoMatch[1]]) {
            flat = flatMap[domoMatch[1]];
          } else {
            const flatNumMatch = txt.match(/№\\s*(\\d+[А-Яа-яA-Za-z]?)/i);
            if (flatNumMatch && flatByNumber[flatNumMatch[1]]) {
              flat = flatByNumber[flatNumMatch[1]];
            }
          }
        }

        if (!flat) return;

        // 1. Обновляем цену
        if (flat.price && Number(flat.price) > 0) {
          const rawPrice = Number(flat.price);
          const formattedPrice = rawPrice.toLocaleString('ru-RU') + ' ₽';
          
          el.setAttribute('data-product-price', String(rawPrice));
          el.querySelectorAll('[data-product-price]').forEach(child => {
            child.setAttribute('data-product-price', String(rawPrice));
          });
          el.querySelectorAll('[data-product-price-def]').forEach(child => {
            child.setAttribute('data-product-price-def', rawPrice.toFixed(4));
          });
          el.querySelectorAll('[data-product-price-def-str]').forEach(child => {
            child.setAttribute('data-product-price-def-str', String(rawPrice) + ',00');
          });

          const priceElements = el.querySelectorAll('.js-store-prod-price, .js-product-price, .t-store__card__price, .t-store__prod-popup__price-new, .t-store__card__price-value, .t-store__card__price_val, .js-store-prod-price-val, .t-store__prod-popup__price-value, .t-store__prod-popup__price');
          priceElements.forEach(pe => {
            const isValueOnly = pe.classList.contains('js-store-prod-price-val') || 
                                pe.classList.contains('t-store__card__price-value') || 
                                pe.classList.contains('t-store__card__price_val') ||
                                pe.classList.contains('t-store__prod-popup__price-value');
            
            const valEl = isValueOnly ? pe : pe.querySelector('.t-store__card__price-value, .js-store-prod-price-val, .t-store__card__price_val, .t-store__prod-popup__price-value');
            if (valEl) {
              valEl.textContent = rawPrice.toLocaleString('ru-RU');
              if (valEl.hasAttribute('data-product-price-def')) {
                valEl.setAttribute('data-product-price-def', rawPrice.toFixed(4));
              }
              if (valEl.hasAttribute('data-product-price-def-str')) {
                valEl.setAttribute('data-product-price-def-str', String(rawPrice) + ',00');
              }
            } else {
              pe.textContent = formattedPrice;
            }
          });

          if (typeof window.product !== 'undefined' && window.product && (String(window.product.sku) === String(flat.id) || String(window.product.lid) === String(lid))) {
            window.product.price = String(rawPrice) + '.0000';
          } else if (typeof product !== 'undefined' && product && (String(product.sku) === String(flat.id) || String(product.lid) === String(lid))) {
            product.price = String(rawPrice) + '.0000';
          }
        }

        // 2. Обновляем статус бронирования и наличия
        const stNum = flat.status !== undefined && flat.status !== null ? Number(flat.status) : 0;
        const stStr = String(flat.status || '').toLowerCase();
        
        const isFree = stNum === 0 || stStr === '0' || stStr === 'free' || stStr === 'свободно';
        const isBooked = stNum === 1 || stStr === '1' || stStr === 'booked' || stStr === ' забронировано' || stStr === 'reserved';
        
        const btnElements = el.querySelectorAll('.js-store-prod-btn, .t-store__card__btn, .t-btn, .t-store__prod-popup__btn');
        
        let badge = el.querySelector('.custom-sync-status-badge');
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'custom-sync-status-badge';
          
          const imgWrapper = el.querySelector('.t-store__card__imgwrapper, .js-product-img, .t-bgimg, .t-store__prod-popup__slider, .t-slds__container');
          if (imgWrapper) {
            imgWrapper.style.position = 'relative';
            imgWrapper.appendChild(badge);
          } else {
            el.style.position = 'relative';
            el.appendChild(badge);
          }
        }

        if (isFree) {
          badge.textContent = 'Свободно';
          badge.className = 'custom-sync-status-badge status-free';
          btnElements.forEach(btn => {
            btn.style.display = '';
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
            if (btn.textContent.includes('Забронировано') || btn.textContent.includes('Продано')) {
              btn.textContent = 'Выбрать';
              btn.style.backgroundColor = '';
              btn.style.color = '';
              btn.style.borderColor = '';
            }
          });
        } else if (isBooked) {
          badge.textContent = 'Забронировано';
          badge.className = 'custom-sync-status-badge status-booked';
          btnElements.forEach(btn => {
            btn.textContent = 'Забронировано';
            btn.style.backgroundColor = '#fff7ed';
            btn.style.color = '#c2410c';
            btn.style.borderColor = '#fdba74';
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.85';
          });
        } else {
          badge.textContent = 'Продано';
          badge.className = 'custom-sync-status-badge status-sold';
          btnElements.forEach(btn => {
            btn.textContent = 'Продано';
            btn.style.backgroundColor = '#e2e8f0';
            btn.style.color = '#64748b';
            btn.style.borderColor = '#cbd5e1';
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.75';
          });
        }
      } catch (err) {}
    });
  }

  // Асинхронное фоновое обновление данных с сервера
  async function fetchFeedAndSync() {
    try {
      let baseUrl = BASE_API_URL;
      if (baseUrl && !baseUrl.endsWith('/feed.json') && !baseUrl.endsWith('/api/feed-json') && baseUrl.indexOf('?') === -1) {
        baseUrl = (baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl) + '/feed.json';
      }
      
      const separator = baseUrl.indexOf('?') !== -1 ? '&' : '?';
      const fetchUrl = baseUrl + separator + "_t=" + Date.now();
      
      let flats = [];
      try {
        const fetchOpts = fetchUrl.indexOf('-dev-') !== -1 ? { credentials: 'include' } : {};
        const response = await fetch(fetchUrl, fetchOpts);
        if (response.ok) {
          flats = await response.json();
        } else {
          const altResp = await fetch(fetchUrl);
          if (altResp.ok) flats = await altResp.json();
        }
      } catch (err) {
        try {
          const altResp = await fetch(fetchUrl);
          if (altResp.ok) flats = await altResp.json();
        } catch(e) {}
      }
      
      if (Array.isArray(flats) && flats.length > 0) {
        const flatMap = {};
        const flatByNumber = {};
        
        flats.forEach(f => {
          if (!f || f.id === undefined) return;
          const flatId = String(f.id);
          flatMap[flatId] = f;
          flatMap["DOMO-" + flatId] = f;
          flatMap["domo-" + flatId] = f;
          
          if (f.sku) {
            const skuStr = String(f.sku);
            flatMap[skuStr] = f;
            flatMap[skuStr.toLowerCase()] = f;
            flatMap[skuStr.toUpperCase()] = f;
            flatMap[skuStr.replace(/^DOMO-/i, "")] = f;
          }
          
          const tildaUid = String(300000000000 + Number(f.id));
          flatMap[tildaUid] = f;

          if (f.number) {
            flatByNumber[String(f.number).trim()] = f;
          }
        });

        window._domoFeedCache = { flatMap, flatByNumber };
        applyDomoSyncToDOM();
      }
    } catch (e) {}
  }

  // Первичный фоновый запрос
  fetchFeedAndSync();

  // Быстрый обработчик изменений DOM без сетевых вызовов
  let rafId;
  function scheduleDOMSync() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(function() {
      applyDomoSyncToDOM();
    });
  }

  const observer = new MutationObserver(scheduleDOMSync);
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Реактивные триггеры на клики и наведение
  document.addEventListener('click', scheduleDOMSync, true);
  document.addEventListener('mouseover', scheduleDOMSync, true);

  // Периодическое фоновое обновление данных каждые 10 секунд
  setInterval(fetchFeedAndSync, 10000);
  setInterval(applyDomoSyncToDOM, 1000);
})();
</script>`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col" id="app_root">
      
      {/* Top Navbar strictly inspired by Geometric Balance */}
      <nav className="h-16 flex items-center justify-between px-6 sm:px-8 bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs" id="nav_bar">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-xs">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight font-display text-slate-900">
            FeedBridge <span className="text-blue-600 font-normal">| Domoplaner to Tilda</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Сервер активен
          </div>
          <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-100 flex items-center gap-1 font-display">
            <Sparkles className="w-3.5 h-3.5" /> PRO
          </span>
        </div>
      </nav>

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0" id="main_container">
        
        {/* Left Side: Geometric Settings Panel */}
        <aside className="w-full lg:w-85 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-6 flex flex-col gap-6 shrink-0" id="aside_settings">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-2 font-display">
              Настройки фильтрации
            </label>
            
            {/* 1. Status selector */}
            <div className="mb-4">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Статус объектов</span>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setStatusFilter("free")}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all cursor-pointer ${statusFilter === "free" ? 'bg-white text-blue-700 font-semibold shadow-3xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Свободные
                </button>
                <button 
                  onClick={() => setStatusFilter("all")}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all cursor-pointer ${statusFilter === "all" ? 'bg-white text-blue-700 font-semibold shadow-3xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Все из CRM
                </button>
              </div>
            </div>

            {/* 2. Types Filter */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Типы недвижимости</span>
              <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input 
                    type="checkbox" 
                    checked={allowedTypes.includes(0)} 
                    onChange={() => toggleType(0)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  Квартиры и апартаменты (0)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input 
                    type="checkbox" 
                    checked={allowedTypes.includes(1)} 
                    onChange={() => toggleType(1)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  Машиноместа / Паркинг (1)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input 
                    type="checkbox" 
                    checked={allowedTypes.includes(3)} 
                    onChange={() => toggleType(3)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  Коммерция (3)
                </label>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-2 font-display">
              Форматирование каталога
            </label>

            {/* 3. Category Mapping */}
            <div className="mb-4">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Разделы (Категории)</span>
              <select 
                value={categoryType} 
                onChange={(e) => setCategoryType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-medium transition-all"
              >
                <option value="combined">ЖК / Тип объекта (Резиденция / Квартиры)</option>
                <option value="project">Только Жилой Комплекс (Резиденция)</option>
                <option value="project_house">ЖК / Корпус (Резиденция / Дом 1)</option>
                <option value="property_type">Только Тип объекта (Квартиры, Паркинг)</option>
              </select>
            </div>

            {/* 4. Price Format */}
            <div className="mb-4">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Цены в заголовке</span>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setPriceFormat("full")}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all cursor-pointer ${priceFormat === "full" ? 'bg-white text-blue-700 font-semibold shadow-3xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Обычный
                </button>
                <button 
                  onClick={() => setPriceFormat("million")}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all cursor-pointer ${priceFormat === "million" ? 'bg-white text-blue-700 font-semibold shadow-3xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  С ценой (млн ₽)
                </button>
              </div>
            </div>

            {/* 5. Include Layout */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Планировка в описании</span>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setIncludeLayout("yes")}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all cursor-pointer ${includeLayout === "yes" ? 'bg-white text-blue-700 font-semibold shadow-3xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Включить
                </button>
                <button 
                  onClick={() => setIncludeLayout("no")}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all cursor-pointer ${includeLayout === "no" ? 'bg-white text-blue-700 font-semibold shadow-3xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Без картинки
                </button>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100 space-y-2">
            <button 
              onClick={handleSaveSettings}
              disabled={savingSettings || loading}
              className={`w-full py-3 ${saveSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-lg font-bold text-xs tracking-wider uppercase shadow-xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50`}
            >
              {savingSettings ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Сохранение...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Сохранено в базу!
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Сохранить настройки моста
                </>
              )}
            </button>

            <button 
              onClick={handleRefreshStats}
              disabled={loading}
              className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Синхронизация...' : 'Обновить статистику'}
            </button>
          </div>
        </aside>

        {/* Right Side: Split View Dashboard */}
        <section className="flex-1 flex flex-col p-4 sm:p-8 overflow-y-auto" id="main_dashboard_stage">
          
          {/* Step 1: Input URL bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs mb-6" id="url_container">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block font-display">
                Источник импорта (Ввод URL-адреса фида или API-ключа)
              </label>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-150 px-2 py-0.5 rounded-full font-semibold">
                Поддерживает API-ключи
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="text" 
                value={feedUrl} 
                onChange={(e) => setFeedUrl(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:bg-white rounded-lg px-3.5 py-2.5 text-xs font-mono text-slate-700 focus:outline-none transition-all"
                placeholder="Вставьте ссылку на фид или API-ключ (например: 311_H07j2kuqia...)"
                id="url_field"
              />
              <button 
                onClick={handleRefreshStats}
                disabled={loading}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Анализ...' : 'Проверить'}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 leading-normal">
              💡 <strong>Совет:</strong> Вы можете вставить как полную ссылку на JSON-фид, так и скопированный из кабинета Domoplaner <strong>API-ключ</strong> (в формате <code>311_H07j2kuqiaME...</code>). Мост автоматически преобразует его в нужный адрес!
            </p>

            <AnimatePresence mode="wait">
              {loading && (
                <motion.div 
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-xs text-blue-600 flex items-center gap-2 bg-blue-50 border border-blue-100 p-2.5 rounded-lg"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Обработка структуры фида... Чтение проектов, корпусов и извлечение квартир.
                </motion.div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-xs text-rose-700 flex items-start gap-2 bg-rose-50 border border-rose-100 p-3 rounded-lg"
                >
                  <Info className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Не удалось распознать фид:</span> {error}
                  </div>
                </motion.div>
              )}

              {!loading && !error && stats && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center"
                >
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Всего в фиде</span>
                    <span className="text-sm font-bold text-slate-800 font-mono">{stats.totalCount} шт</span>
                  </div>
                  <div className="bg-blue-50/50 border border-blue-100 p-2.5 rounded-lg">
                    <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider block">Свободных (в продаже)</span>
                    <span className="text-sm font-bold text-blue-700 font-mono">{stats.freeCount} шт</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Жилых комплексов</span>
                    <span className="text-sm font-bold text-slate-800 font-mono">{Object.keys(stats.projects).length} ЖК</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Корпусов / Домов</span>
                    <span className="text-sm font-bold text-slate-800 font-mono">{Object.keys(stats.houses).length}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Важное предупреждение о песочнице AI Studio и Решение для Тильды */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-5 text-slate-900 shadow-3xs" id="sandbox_warning_block">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-blue-950 mb-1.5 font-display">🚀 Поддержка прямой синхронизации и импорта в Тильду исправлена!</h4>
                <p className="text-xs text-slate-700 leading-relaxed mb-3">
                  Поскольку Тильда требует, чтобы ссылка авто-обновления вела напрямую на файл с расширением <strong>.yml</strong> или <strong>.xml</strong> (и не принимает сложные ссылки с параметрами), мы добавили прямые файловые адреса. Теперь вы можете использовать чистую ссылку, которая выглядит как физический файл!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs">
                  <div className="bg-white/80 p-3.5 rounded-lg border border-blue-100">
                    <span className="font-bold block text-blue-950 mb-1">📦 Вариант 1: Загрузка готового файла (Ручной импорт)</span>
                    Нажмите кнопку <strong>«Скачать YML»</strong> или <strong>«Скачать свежий CSV»</strong> ниже. Вы получите файл <code>domoplaner_tilda_catalog.yml</code> (или <code>.csv</code>) на компьютер. В личном кабинете Tilda зайдите в <strong>Товары → Импорт товаров</strong> и перетащите скачанный файл.
                  </div>
                  <div className="bg-white/80 p-3.5 rounded-lg border border-blue-100">
                    <span className="font-bold block text-blue-950 mb-1">🔄 Вариант 2: Авто-обновление по ссылке (Каждые 24 часа)</span>
                    Скопируйте короткую ссылку типа <code>/feed.yml</code>. В панели Tilda зайдите в <strong>Товары → Настройки каталога → Синхронизация</strong>, выберите <strong>YML/XML</strong> и вставьте ссылку. Тильда сама будет обновлять цены и остатки по расписанию!
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Dynamic Conversion & Feed Links (Variant A & Variant B) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8" id="convert_cards">
            
            {/* YML dynamic link card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-xs hover:border-blue-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <FileCode className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-sm font-display text-slate-900">Вариант А: YML-ссылка / YML-файл (XML)</h3>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Прямой файл .yml
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Прямая ссылка для авто-обновления Тильды или файл для ручной загрузки. Принудительно отдает структуру Yandex Market YML.
                </p>

                <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg text-[11px] font-mono text-slate-600 break-all select-all mb-4 overflow-y-auto max-h-16 scrollbar-none">
                  {cleanYmlLink}
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleCopy(cleanYmlLink, "yml")}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                >
                  {copiedLink === "yml" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink === "yml" ? 'Скопировано!' : 'Копировать ссылку'}
                </button>
                <a 
                  href={cleanYmlDownloadLink}
                  download="domoplaner_tilda_catalog.yml"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs text-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  Скачать YML
                </a>
                <a 
                  href={cleanYmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-2 rounded-lg flex items-center justify-center transition-all shadow-3xs"
                  title="Открыть фид в новой вкладке"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* CSV manual file card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-xs hover:border-blue-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-sm font-display text-slate-900">Вариант Б: CSV Таблица</h3>
                  </div>
                  <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Прямой файл .csv
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                  Идеально подходит для ручного импорта в Tilda. Таблица закодирована в UTF-8 BOM и открывается без кракозябр в Excel.
                </p>

                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 mb-3 text-[11px] text-emerald-800 leading-relaxed">
                  <span className="font-bold">⚡ Обход кэша:</span> При каждом скачивании или запросе мы принудительно обходим кэш серверов. Вы гарантированно получаете 100% свежие цены из Domoplaner!
                </div>

                <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg text-[11px] font-mono text-slate-600 break-all select-all mb-4 overflow-y-auto max-h-16 scrollbar-none">
                  {cleanCsvLink}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleCopy(cleanCsvLink, "csv")}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                    title="Копировать прямую ссылку"
                  >
                    {copiedLink === "csv" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a 
                    href={cleanCsvDownloadLink}
                    download="domoplaner_tilda_catalog.csv"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Скачать свежий CSV
                  </a>
                </div>
              </div>
            </div>

          </div>

          {/* Majestic Integrations & Preview Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8" id="integrations_tabs_section">
            
            {/* Tab Swallower / Header with beautiful tabs */}
            <div className="border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between px-6 py-2 gap-3">
              <div className="flex -mb-2 overflow-x-auto gap-4 scrollbar-none">
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`py-3.5 font-display text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === "preview" ? "border-blue-600 text-blue-700 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                >
                  Предпросмотр данных ({previewSample.length})
                </button>
                <button
                  onClick={() => setActiveTab("widget")}
                  className={`py-3.5 font-display text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === "widget" ? "border-blue-600 text-blue-700 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                >
                  HTML / JS Виджет
                </button>
                <button
                  onClick={() => {
                    setActiveTab("webhook");
                    fetchWebhookLogs();
                  }}
                  className={`py-3.5 font-display text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === "webhook" ? "border-blue-600 text-blue-700 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                >
                  Webhook & Синхронизация
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 self-start md:self-center bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-3xs text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                <Sliders className="w-3 h-3 text-blue-600" />
                <span>Фильтры активны</span>
              </div>
            </div>

            {/* TAB CONTENT: PREVIEW */}
            {activeTab === "preview" && (
              <div className="overflow-x-auto">
                {previewSample.length === 0 ? (
                  <div className="px-6 py-12 text-center text-slate-400 text-xs">
                    {loading ? 'Загрузка семплов...' : 'Нет подходящих объектов для предпросмотра. Попробуйте изменить фильтры на левой панели.'}
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Артикул / SKU</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Название товара (Title)</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Категория на Tilda</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Цена</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Статус</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {previewSample.map((f, i) => {
                        const finalTitle = getFlatName(f);
                        const finalCategory = getCategoryName(f);
                        const finalSku = String(f.id);
                        
                        return (
                          <tr key={f.id || i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-xs font-mono text-slate-600">{finalSku}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {f.images && f.images.length > 0 ? (
                                  <img 
                                    src={f.images[0].src} 
                                    alt="Plan" 
                                    className="w-10 h-10 object-contain rounded bg-slate-50 border border-slate-100 p-0.5 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-slate-100 rounded border border-slate-150 flex items-center justify-center text-[10px] text-slate-400 font-mono shrink-0">
                                    N/A
                                  </div>
                                )}
                                <div>
                                  <span className="text-xs font-semibold text-slate-900 block">{finalTitle}</span>
                                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                                    ЖК {f.projectTitle} • Корпус {f.houseTitle} • Эт. {f.floorNumber} • Кол-во комнат: {f.type === 0 ? (f.is_studio ? 'Студия' : f.rooms !== null && f.rooms !== undefined ? f.rooms : '1') : f.type === 1 ? 'Паркинг' : f.type === 3 ? 'Коммерция' : 'Другое'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-700">{finalCategory}</td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-900 font-mono">
                              {f.price ? f.price.toLocaleString('ru-RU') + ' ₽' : 'Не указана'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold rounded-sm uppercase tracking-wide ${f.status === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : f.status === 1 ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                                {f.status === 0 ? 'Свободно' : f.status === 1 ? 'Забронировано' : 'Продано'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TAB CONTENT: WIDGET */}
            {activeTab === "widget" && (
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Code className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900 font-display">Синхронизация через HTML / JavaScript Виджет</h3>
                </div>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Не хотите использовать стандартный каталог Tilda? Вы можете вставить этот адаптивный JavaScript-виджет в любой HTML-блок (например, <strong>T123</strong>) на вашем сайте. Он будет в реальном времени подтягивать отфильтрованные квартиры прямо из вашего Domoplaner JSON-фида через наш мост-конвертер.
                </p>

                {/* Custom Domain Configuration Card */}
                <div className="mb-6 bg-indigo-50/40 border border-indigo-100 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">Адрес вашего развернутого моста (например, на Render)</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    Вы развернули этот проект на стороннем сервере (например, <strong>https://catalog.residence-tula.ru</strong>)? Введите его адрес ниже. Все сгенерированные коды T123 и ссылки на фиды автоматически перестроятся на ваш рабочий домен!
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      placeholder="https://your-app.onrender.com"
                      className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    {customDomain !== "https://catalog.residence-tula.ru" && (
                      <button
                        onClick={() => setCustomDomain("https://catalog.residence-tula.ru")}
                        className="px-3 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
                      >
                        Сбросить
                      </button>
                    )}
                    <button
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                    >
                      {savingSettings ? "Сохранение..." : saveSuccess ? "Сохранено!" : "Сохранить домен"}
                    </button>
                  </div>
                </div>

                {/* JSON Dynamic Link */}
                <div className="mb-6 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ваш чистый JSON фид</span>
                    <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">CORS включен</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Этот адрес отдает чистый массив квартир с вашими фильтрами и оптимизированной структурой.</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white border border-slate-150 px-3 py-2 rounded-lg text-xs font-mono text-slate-600 break-all select-all overflow-y-auto max-h-16 scrollbar-none">
                      {jsonLink}
                    </div>
                    <button
                      onClick={() => handleCopy(jsonLink, "json")}
                      className="px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs shrink-0"
                    >
                      {copiedLink === "json" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedLink === "json" ? 'Скопировано!' : 'Копировать'}
                    </button>
                  </div>
                </div>

                {/* Code Block */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Код для вставки в Tilda (блок T123)</span>
                    <button
                      onClick={() => handleCopy(
`<div id="domoplaner-widget-container" style="font-family:system-ui,-apple-system,sans-serif;max-width:1200px;margin:0 auto;padding:20px;">
  <div id="domoplaner-widget-filters" style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
    <select id="filter-project" style="padding:8px 12px;border-radius:6px;border:1px solid #ccc;font-size:14px;"><option value="">Все проекты</option></select>
    <select id="filter-rooms" style="padding:8px 12px;border-radius:6px;border:1px solid #ccc;font-size:14px;">
      <option value="">Все комнаты</option><option value="0">Студия</option><option value="1">1-комнатная</option><option value="2">2-комнатная</option><option value="3">3-комнатная</option>
    </select>
    <select id="filter-sort" style="padding:8px 12px;border-radius:6px;border:1px solid #ccc;font-size:14px;">
      <option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option><option value="area-desc">Сначала просторнее</option>
    </select>
  </div>
  <div id="domoplaner-widget-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;">
    <div style="grid-column:1/-1;text-align:center;padding:40px;color:#666;">Загрузка объектов...</div>
  </div>
</div>
<script>
(function(){
  const API_URL="${jsonLink}";
  let flats=[];
  async function load(){
    try{
      const r=await fetch(API_URL);
      if(!r.ok)throw new Error('Ошибка сети');
      flats=await r.json();
      init();render();
    }catch(e){
      document.getElementById('domoplaner-widget-grid').innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:#ef4444;">Ошибка: '+e.message+'</div>';
    }
  }
  function init(){
    const pSel=document.getElementById('filter-project');
    const projs=[...new Set(flats.map(f=>f.project))].filter(Boolean);
    projs.forEach(p=>{const o=document.createElement('option');o.value=p;o.textContent=p;pSel.appendChild(o);});
    document.getElementById('filter-project').addEventListener('change',render);
    document.getElementById('filter-rooms').addEventListener('change',render);
    document.getElementById('filter-sort').addEventListener('change',render);
  }
  function render(){
    const grid=document.getElementById('domoplaner-widget-grid');
    const pFil=document.getElementById('filter-project').value;
    const rFil=document.getElementById('filter-rooms').value;
    const sFil=document.getElementById('filter-sort').value;
    let filtered=flats.slice();
    if(pFil)filtered=filtered.filter(f=>f.project===pFil);
    if(rFil!==''){
      filtered=filtered.filter(f=>{
        if(rFil==='0')return f.isStudio;
        return f.rooms===parseInt(rFil,10);
      });
    }
    if(sFil==='price-asc')filtered.sort((a,b)=>a.price-b.price);
    else if(sFil==='price-desc')filtered.sort((a,b)=>b.price-a.price);
    else if(sFil==='area-desc')filtered.sort((a,b)=>b.area-a.area);
    if(filtered.length===0){
      grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:#666;">Нет квартир, подходящих под выбранные фильтры</div>';
      return;
    }
    grid.innerHTML=filtered.map(f=>\`
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.05);display:flex;flex-direction:column;justify-content:between;transition:transform 0.2s;cursor:pointer;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
        <div style="text-align:center;margin-bottom:15px;height:140px;display:flex;align-items:center;justify-content:center;background:#f8fafc;border-radius:8px;">
          \\\${f.images&&f.images.length>0 
            ? \\\`<img src="\\\${f.images[0]}" style="max-height:100%;max-width:100%;object-fit:contain;" />\`
            : \\\`<div style="color:#94a3b8;font-size:12px;">Нет планировки</div>\`
          }
        </div>
        <div style="font-weight:700;font-size:15px;color:#0f172a;margin-bottom:4px;">\\\${f.title}</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:6px;line-height:1.4;">\\\${f.description}</div>
        <div style="font-size:11px;color:#475569;margin-bottom:12px;font-weight:500;display:flex;align-items:center;gap:4px;">
          <span style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">Кол-во комнат: \\\${f.roomsCount || '—'}</span>
        </div>
        <div style="margin-top:auto;display:flex;align-items:center;justify-content:space-between;">
          <div style="font-weight:800;font-size:16px;color:#2563eb;">\\\${f.price?f.price.toLocaleString('ru-RU')+' ₽':'По запросу'}</div>
          <button style="background:#2563eb;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-weight:600;font-size:12px;cursor:pointer;">Выбрать</button>
        </div>
      </div>
    \`).join('');
  }
  load();
})();
</script>\n`, "widget")}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {copiedLink === "widget" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLink === "widget" ? 'Скопировано!' : 'Копировать HTML код виджета'}
                    </button>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 scrollbar-thin">
                    <pre className="whitespace-pre">{`<!-- Вставьте этот код в блок T123 в Tilda -->
<div id="domoplaner-widget-container">...</div>
<script>
  // Скрипт получает данные из:
  // ${jsonLink}
  // И в реальном времени строит сетку квартир с фильтрами.
</script>`}</pre>
                  </div>
                </div>

                {/* Invisible background synchronizer section */}
                <div className="mt-8 pt-8 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <EyeOff className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-900 font-display">Невидимый фоновый авто-синхронизатор</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Если вам нужно, чтобы при каждом визите пользователя на ваш сайт происходила тихая фоновая проверка / обновление кэша фида, вы можете установить этот невидимый скрипт. Он выполняется полностью асинхронно, никак не замедляет загрузку сайта для клиентов и визуально скрыт.
                  </p>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Невидимый скрипт для Tilda (блок T123)</span>
                      <button
                        onClick={() => handleCopy(
`<div style="display:none;" aria-hidden="true" id="domoplaner-silent-sync"></div>
<script>
(function(){
  // Тихое фоновое обновление кэша фида при визите пользователя
  const API_URL = "${ymlLink}";
  setTimeout(function() {
    fetch(API_URL, { mode: 'no-cors', cache: 'no-store' })
      .then(function() { console.log('Domoplaner Feed synced successfully.'); })
      .catch(function(e) { console.warn('Domoplaner Feed sync error:', e); });
  }, 3000); // Запуск через 3 секунды после загрузки страницы
})();
</script>\n`, "silentsync")}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        {copiedLink === "silentsync" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedLink === "silentsync" ? 'Скопировано!' : 'Копировать невидимый HTML код'}
                      </button>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-36 scrollbar-thin">
                      <pre className="whitespace-pre">{`<!-- Вставьте этот код в блок T123 в самом низу страницы или в footer -->
<div style="display:none;" aria-hidden="true" id="domoplaner-silent-sync"></div>
<script>
  // Безопасно пингует фид в фоне через 3 секунды после загрузки страницы
  // ${ymlLink}
</script>`}</pre>
                    </div>
                  </div>
                </div>

                {/* Live Store Synchronizer Section */}
                <div className="mt-8 pt-8 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
                    <h3 className="font-bold text-sm text-slate-900 font-display">Скрипт «Живой авто-синхронизатор» цен и бронирования (для CSV импорта)</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Если вы импортируете каталог через <strong>CSV таблицы в Tilda</strong>, товары на вашем сайте остаются статичными. Данный умный скрипт решает эту проблему! Вставьте его в блок <strong>T123 (HTML-код)</strong> на странице вашего каталога Tilda. Он будет на лету получать свежие цены и статусы из Domoplaner через наш мост, сопоставлять товары по ID и мгновенно обновлять цены, а также вывешивать цветные бэйджи <b>«Свободно»</b> / <b>«Забронировано»</b> / <b>«Продано»</b> прямо на карточках товаров.
                  </p>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Скрипт авто-обновления для Tilda (блок T123)</span>
                      <button
                        onClick={() => handleCopy(tildaLiveSyncCode, "livesync")}
                        className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                      >
                        {copiedLink === "livesync" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedLink === "livesync" ? 'Скопировано!' : 'Копировать скрипт'}
                      </button>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 scrollbar-thin">
                      <pre className="whitespace-pre">{tildaLiveSyncCode}</pre>
                    </div>
                  </div>
                </div>

                {/* Local Visual Mock Preview */}
                <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-3">Визуальный пример работы виджета на вашем сайте</span>
                  <div className="bg-white p-5 rounded-lg border border-slate-200">
                    <div className="flex gap-2 mb-4 flex-wrap">
                      <select disabled className="px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50 text-slate-500 font-medium">
                        <option>Все проекты</option>
                      </select>
                      <select disabled className="px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50 text-slate-500 font-medium">
                        <option>Все комнаты</option>
                      </select>
                      <select disabled className="px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50 text-slate-500 font-medium">
                        <option>Сначала дешевле</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {previewSample.slice(0, 3).map((f) => (
                        <div key={f.id} className="border border-slate-150 p-4 rounded-lg flex flex-col justify-between bg-white shadow-3xs">
                          <div className="h-28 flex items-center justify-center bg-slate-50 rounded mb-3 border border-slate-100 p-1">
                            {f.images && f.images.length > 0 ? (
                              <img src={f.images[0].src} className="max-h-full max-w-full object-contain" />
                            ) : (
                              <span className="text-[10px] text-slate-400">Нет планировки</span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-slate-900 block truncate">{getFlatName(f)}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                            ЖК {f.projectTitle} • Корпус {f.houseTitle} • Эт. {f.floorNumber}
                          </span>
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-extrabold text-blue-600 font-mono">
                              {f.price ? f.price.toLocaleString('ru-RU') + ' ₽' : 'По запросу'}
                            </span>
                            <span className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold cursor-pointer hover:bg-blue-700 transition-colors">
                              Выбрать
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: WEBHOOK */}
            {activeTab === "webhook" && (
              <div className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-900 font-display">Вебхуки для моментальной синхронизации</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSimulateWebhook}
                      disabled={simulatingWebhook}
                      className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {simulatingWebhook ? 'Отправка...' : 'Симулировать вебхук'}
                    </button>
                    <button
                      onClick={handleClearWebhookLogs}
                      className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Очистить логи
                    </button>
                    <button
                      onClick={fetchWebhookLogs}
                      disabled={loadingLogs}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                      Обновить логи
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Настройте вебхуки в Domoplaner CRM, чтобы наша система мгновенно получала уведомления об изменениях в квартирах (изменение цены, бронирование, продажа) и автоматически инвалидировала кэш.
                </p>

                {/* Target Webhook Link */}
                <div className="mb-6 bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Ваш URL адрес обработчика вебхуков (Webhook Target URL)</span>
                    <span className="bg-indigo-100 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">POST Метод</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Зарегистрируйте этот URL в личном кабинете Домопланера в разделе «Настройки Вебхуков».</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white border border-slate-150 px-3 py-2 rounded-lg text-xs font-mono text-slate-600 break-all select-all">
                      {`${appOrigin}/api/webhook/domoplaner`}
                    </div>
                    <button
                      onClick={() => handleCopy(`${appOrigin}/api/webhook/domoplaner`, "webhook")}
                      className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs shrink-0"
                    >
                      {copiedLink === "webhook" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedLink === "webhook" ? 'Скопировано!' : 'Копировать'}
                    </button>
                  </div>
                </div>

                {/* Logs terminal */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                      <span className="text-slate-400 text-[10px] font-mono font-bold uppercase tracking-wider ml-2">Вебхук Дебаггер Лог (В реальном времени)</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">{webhookLogs.length} событий</span>
                  </div>

                  <div className="bg-slate-950 p-4 font-mono text-xs text-slate-300 min-h-32 max-h-80 overflow-y-auto scrollbar-thin">
                    {webhookLogs.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs italic">
                        Лог пуст. Отправьте тестовый вебхук кнопкой выше или сделайте запрос к обработчику, чтобы увидеть логи в реальном времени.
                      </div>
                    ) : (
                      <div className="space-y-4 divide-y divide-slate-800">
                        {webhookLogs.map((log) => (
                          <div key={log.id} className="pt-3 first:pt-0">
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                              <span className="text-blue-400 font-bold">{log.method} /api/webhook/domoplaner</span>
                              <span>{new Date(log.timestamp).toLocaleTimeString()} ({log.ip})</span>
                            </div>
                            <pre className="bg-slate-900 p-2.5 rounded border border-slate-800 overflow-x-auto text-[10px] text-emerald-400 leading-normal scrollbar-none">
                              {JSON.stringify(log.body, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
          </div>

          {/* Setup manual steps strictly framed */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs" id="help_guide">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900 font-display">Настройка импорта в панели Tilda</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed text-slate-600">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-150">
                <span className="bg-blue-600 text-white font-bold w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] mb-2.5">1</span>
                <h4 className="font-bold text-slate-900 mb-1.5 text-xs">Автоматическая синхронизация по YML (Рекомендуется)</h4>
                <p className="mb-2">Tilda умеет автоматически скачивать и обновлять товары каждые 24 часа:</p>
                <ul className="list-disc pl-4 space-y-1 mb-3">
                  <li>Зайдите в каталог Tilda в раздел «Импорт товаров».</li>
                  <li>Выберите <b>Импорт YML</b>.</li>
                  <li>Скопируйте и вставьте <b>ссылку Варианта А</b> с нашего сервиса.</li>
                  <li>Поставьте галочку «Обновлять автоматически ежедневно».</li>
                </ul>
                <div className="bg-amber-50 border border-amber-100 p-2.5 rounded text-[11px] text-amber-800 leading-normal">
                  <b>⚠️ Важно для импорта характеристик из YML:</b><br />
                  В отличие от CSV, при импорте YML-файлов Tilda требует, чтобы свойства товаров были предварительно созданы в настройках магазина. Пожалуйста, перейдите в <b>Tilda &gt; Настройки магазина &gt; Свойства товаров</b> и создайте свойства со следующими названиями (регистр и пробелы важны):
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1.5 font-mono text-[10px] text-amber-900">
                    <div>• Проект</div>
                    <div>• Секция</div>
                    <div>• Этаж</div>
                    <div>• Тип объекта</div>
                    <div>• Площадь</div>
                    <div>• Отделка</div>
                    <div>• Номер на этаже</div>
                  </div>
                  Если эти свойства не будут созданы в настройках Tilda заранее, импортер проигнорирует соответствующие параметры из YML-файла.
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-150">
                <span className="bg-slate-900 text-white font-bold w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] mb-2.5">2</span>
                <h4 className="font-bold text-slate-900 mb-1.5 text-xs">Разовый ручной импорт через CSV</h4>
                <p className="mb-2">Для быстрого тестирования или ручного наполнения каталога:</p>
                <ul className="list-disc pl-4 space-y-1 mb-3">
                  <li>Нажмите кнопку «Скачать CSV Таблицу» на нашем сервисе.</li>
                  <li>В каталоге Tilda выберите раздел «Загрузить CSV-файл».</li>
                  <li>Перетащите скачанный файл таблицы.</li>
                  <li>Сопоставление колонок (SKU, Title, Price, Photo и др.) выполнится автоматически, так как наши поля идеально согласованы с Tilda.</li>
                  <li>Нажмите «Импортировать». Все квартиры будут созданы мгновенно.</li>
                </ul>
                <div className="bg-blue-50 border border-blue-100 p-2.5 rounded text-[11px] text-blue-800 leading-normal">
                  <b>📊 Фильтр-диапазон (Ползунок / Слайдер):</b><br />
                  Мы продублировали характеристики «Площадь» и «Этаж» в системные свойства (колонки <code className="bg-blue-100 px-1 rounded text-[10px]">Properties:Площадь</code> и <code className="bg-blue-100 px-1 rounded text-[10px]">Properties:Этаж</code>). Это позволит вам настроить в каталоге Tilda удобные фильтры-ползунки (диапазоны "от" и "до") для этих параметров.
                </div>
              </div>
            </div>

            {/* NEW FULL-WIDTH SECTION: Tilda Range Sliders Instruction */}
            <div className="mt-8 pt-8 border-t border-slate-150 col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Sliders className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-slate-900 text-sm font-display">
                  🎛️ Настройка слайдеров-диапазонов (ползунков) с ручным вводом в Tilda
                </h4>
              </div>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Вы можете заменить стандартные текстовые поля ввода фильтров «Площадь» и «Этаж» в каталоге Tilda на интерактивные, красивые ползунки (слайдеры) с возможностью ручного ввода пограничных значений. Для этого скопируйте код ниже и вставьте его в блок <b>T123 (HTML-код)</b> на той же странице, где расположен каталог.
              </p>
              
              <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 mb-4 leading-normal">
                <b>💡 Как это работает:</b> Скрипт автоматически найдет оригинальные фильтры Tilda по их названиям («Площадь» и «Этаж»), аккуратно скроет их стандартные поля ввода и на их месте отрисует премиальные двойные ползунки с прогресс-баром и полями ручного ввода, мгновенно синхронизируя их состояние с поисковым движком Tilda.
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Код для вставки в блок T123 на Tilda</span>
                  <button
                    onClick={() => handleCopy(tildaSlidersCode, "tildasliders")}
                    className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                  >
                    {copiedLink === "tildasliders" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink === "tildasliders" ? 'Скопировано!' : 'Копировать код'}
                  </button>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl text-[10px] font-mono text-slate-300 overflow-x-auto max-h-72 scrollbar-thin">
                  <pre className="whitespace-pre">{tildaSlidersCode}</pre>
                </div>
              </div>
            </div>
          </div>

        </section>
      </div>

      {/* Footer strictly matching Geometric Balance */}
      <footer className="h-12 bg-slate-900 text-slate-400 flex flex-col sm:flex-row items-center justify-between px-6 sm:px-8 text-[11px] font-medium uppercase tracking-widest shrink-0 border-t border-slate-800" id="main_footer">
        <div className="flex gap-4 sm:gap-6">
          <span>Спецификация Tilda: v1.3</span>
          <span>Domoplaner API: DC-FEED-2026</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>Система готова к интеграции</span>
        </div>
      </footer>

    </div>
  );
}
