import React, { useState, useMemo, useCallback } from 'react';
import api from '../services/api';


// ══════════════════════════════════════════════════════════════
//  📐 DXF Quantity Takeoff Engine — Phase 1 MVP
//  Extracts BOQ quantities from AutoCAD DXF drawings
//  Uses mathematical formulas (Shoelace, Euclidean) — zero AI
// ══════════════════════════════════════════════════════════════

// ── Layer Classification Patterns ────────────────────────────
const LAYER_CATEGORIES = {
  wall: {
    patterns: ['wall', 'walls', 'a-wall', 'حوائط', 'حائط', 'جدار', 'جدران', 'مباني', 'brickwork', 'masonry', 'partition'],
    icon: '🧱', label_ar: 'أعمال حوائط ومباني', label_en: 'Walls & Masonry',
    color: '#f97316', unit: 'م.ط', calcType: 'length'
  },
  floor: {
    patterns: ['floor', 'flor', 'a-flor', 'أرضي', 'أرضيات', 'ارضيات', 'area', 'room', 'غرف', 'rooms', 'slab'],
    icon: '🏠', label_ar: 'أعمال أرضيات', label_en: 'Flooring',
    color: '#06b6d4', unit: 'م²', calcType: 'area'
  },
  door: {
    patterns: ['door', 'doors', 'a-door', 'أبواب', 'باب', 'gate'],
    icon: '🚪', label_ar: 'أعمال أبواب', label_en: 'Doors',
    color: '#8b5cf6', unit: 'عدد', calcType: 'count'
  },
  window: {
    patterns: ['window', 'windows', 'a-wind', 'wind', 'شباك', 'شبابيك', 'نوافذ'],
    icon: '🪟', label_ar: 'أعمال شبابيك', label_en: 'Windows',
    color: '#3b82f6', unit: 'عدد', calcType: 'count'
  },
  ceiling: {
    patterns: ['ceil', 'ceiling', 'a-ceil', 'سقف', 'أسقف', 'اسقف', 'gypsum', 'جيبسوم'],
    icon: '⬜', label_ar: 'أعمال أسقف وجيبسوم', label_en: 'Ceiling & Gypsum',
    color: '#a855f7', unit: 'م²', calcType: 'area'
  },
  electrical: {
    patterns: ['elec', 'electric', 'e-powr', 'e-lite', 'كهرباء', 'كهربا', 'power', 'lighting', 'إنارة', 'انارة', 'socket', 'switch'],
    icon: '⚡', label_ar: 'أعمال كهرباء', label_en: 'Electrical',
    color: '#eab308', unit: 'نقطة', calcType: 'count'
  },
  plumbing: {
    patterns: ['plumb', 'sanit', 'p-sanr', 'صحي', 'سباكة', 'مواسير', 'pipe', 'drain', 'صرف', 'تغذية'],
    icon: '🔧', label_ar: 'أعمال صحي', label_en: 'Plumbing',
    color: '#14b8a6', unit: 'م.ط', calcType: 'length'
  },
  hvac: {
    patterns: ['hvac', 'ac', 'تكييف', 'تبريد', 'duct', 'مجرى'],
    icon: '❄️', label_ar: 'أعمال تكييف', label_en: 'HVAC',
    color: '#0ea5e9', unit: 'م.ط', calcType: 'length'
  },
  furniture: {
    patterns: ['furn', 'furniture', 'أثاث', 'مفروشات'],
    icon: '🛋️', label_ar: 'أثاث (مرجعي)', label_en: 'Furniture (ref)',
    color: '#78716c', unit: '-', calcType: 'ignore'
  },
  dimension: {
    patterns: ['dim', 'dimension', 'أبعاد', 'قياس'],
    icon: '📏', label_ar: 'أبعاد (مرجعي)', label_en: 'Dimensions (ref)',
    color: '#64748b', unit: '-', calcType: 'ignore'
  },
  text: {
    patterns: ['text', 'anno', 'label', 'نص', 'تسمية', 'note'],
    icon: '📝', label_ar: 'نصوص (مرجعي)', label_en: 'Text (ref)',
    color: '#94a3b8', unit: '-', calcType: 'ignore'
  },
  hatch: {
    patterns: ['hatch', 'fill', 'pattern', 'تظليل', 'هاتش'],
    icon: '🔲', label_ar: 'تظليل / حشو', label_en: 'Hatches',
    color: '#6b7280', unit: '-', calcType: 'ignore'
  }
};

// ── Geometric Utility Functions ──────────────────────────────

/** Shoelace formula — exact area of a closed polygon */
function polygonArea(vertices) {
  if (!vertices || vertices.length < 3) return 0;
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += (vertices[i].x || 0) * (vertices[j].y || 0);
    area -= (vertices[j].x || 0) * (vertices[i].y || 0);
  }
  return Math.abs(area) / 2;
}

/** Perimeter of a polygon */
function polygonPerimeter(vertices) {
  if (!vertices || vertices.length < 2) return 0;
  let perimeter = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = (vertices[j].x || 0) - (vertices[i].x || 0);
    const dy = (vertices[j].y || 0) - (vertices[i].y || 0);
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
}

/** Length of a single line segment */
function lineLength(start, end) {
  const dx = (end.x || 0) - (start.x || 0);
  const dy = (end.y || 0) - (start.y || 0);
  return Math.sqrt(dx * dx + dy * dy);
}

/** Total length of a polyline (open or closed) */
function polylineLength(vertices, closed = false) {
  if (!vertices || vertices.length < 2) return 0;
  let length = 0;
  const limit = closed ? vertices.length : vertices.length - 1;
  for (let i = 0; i < limit; i++) {
    const j = (i + 1) % vertices.length;
    const dx = (vertices[j].x || 0) - (vertices[i].x || 0);
    const dy = (vertices[j].y || 0) - (vertices[i].y || 0);
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

/** Check if a polyline is closed (first vertex ≈ last vertex) */
function isPolyClosed(vertices, explicitlyClosed) {
  if (explicitlyClosed) return true;
  if (!vertices || vertices.length < 3) return false;
  const first = vertices[0];
  const last = vertices[vertices.length - 1];
  const dx = Math.abs((first.x || 0) - (last.x || 0));
  const dy = Math.abs((first.y || 0) - (last.y || 0));
  return dx < 0.01 && dy < 0.01;
}

/** Convert raw units to meters */
function toMeters(value, unit) {
  switch (unit) {
    case 'mm': return value / 1000;
    case 'cm': return value / 100;
    case 'm': return value;
    case 'in': return value * 0.0254;
    case 'ft': return value * 0.3048;
    default: return value;
  }
}

// ── Inline DXF Parser (Fallback if npm package not installed) ─
// Handles the most common entities: LWPOLYLINE, LINE, CIRCLE, INSERT, TEXT

function parseDxfText(text) {
  const result = { entities: [], layers: {}, header: {} };

  // Parse header for $INSUNITS
  const headerMatch = text.match(/\$INSUNITS[\s\S]*?(?=\$|\s0\s)/);
  if (headerMatch) {
    const unitMatch = headerMatch[0].match(/\s70\s*\n\s*(\d+)/);
    if (unitMatch) result.header.insunits = parseInt(unitMatch[1]);
  }

  // Split into sections
  const entitySection = text.match(/\s0\sENTITIES[\s\S]*?(?=\s0\sENDSEC)/i);
  if (!entitySection) return result;

  const entityText = entitySection[0];
  // Split into individual entities
  const entityBlocks = entityText.split(/(?=\s0\s(?:LWPOLYLINE|LINE|CIRCLE|ARC|INSERT|TEXT|MTEXT|DIMENSION|POINT)\s)/i);

  for (const block of entityBlocks) {
    const lines = block.trim().split('\n').map(l => l.trim());
    if (lines.length < 2) continue;

    const typeMatch = block.match(/^\s*0\s*\n\s*(LWPOLYLINE|LINE|CIRCLE|ARC|INSERT|TEXT|MTEXT|DIMENSION|POINT)\s*$/mi);
    if (!typeMatch) continue;

    const type = typeMatch[1].toUpperCase();
    const entity = { type, layer: '0', vertices: [] };

    // Parse group codes
    for (let i = 0; i < lines.length - 1; i += 2) {
      const code = parseInt(lines[i]);
      const val = lines[i + 1];
      if (isNaN(code)) continue;

      switch (code) {
        case 8: entity.layer = val; break;
        case 2: entity.name = val; break; // Block name for INSERT
        case 10: entity.x = parseFloat(val); break;
        case 20: entity.y = parseFloat(val); break;
        case 11: entity.x2 = parseFloat(val); break;
        case 21: entity.y2 = parseFloat(val); break;
        case 40: entity.radius = parseFloat(val); break;
        case 70: entity.flags = parseInt(val); break;
        case 90: entity.vertexCount = parseInt(val); break;
        case 42: entity.bulge = parseFloat(val); break;
        case 1: entity.text = val; break;
      }
    }

    // For LWPOLYLINE, extract all vertex pairs
    if (type === 'LWPOLYLINE') {
      entity.vertices = [];
      entity.closed = !!(entity.flags & 1);
      let currentX = null;
      for (let i = 0; i < lines.length - 1; i += 2) {
        const code = parseInt(lines[i]);
        const val = parseFloat(lines[i + 1]);
        if (code === 10) currentX = val;
        if (code === 20 && currentX !== null) {
          entity.vertices.push({ x: currentX, y: val });
          currentX = null;
        }
      }
    }

    // For LINE
    if (type === 'LINE') {
      entity.start = { x: entity.x || 0, y: entity.y || 0 };
      entity.end = { x: entity.x2 || 0, y: entity.y2 || 0 };
    }

    // For INSERT (blocks like doors/windows)
    if (type === 'INSERT') {
      entity.position = { x: entity.x || 0, y: entity.y || 0 };
    }

    // Track layers
    if (entity.layer && !result.layers[entity.layer]) {
      result.layers[entity.layer] = { name: entity.layer, entities: [] };
    }
    if (entity.layer && result.layers[entity.layer]) {
      result.layers[entity.layer].entities.push(entity);
    }
    result.entities.push(entity);
  }

  return result;
}

// ── Main Component ───────────────────────────────────────────
export default function DXFQuantityTakeoff({
  projectFiles = [],
  boqItems = [],
  setBoqItems,
  activeProjectId,
  activeProject,
  language = 'ar'
}) {
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [layerMap, setLayerMap] = useState({});
  const [enabledLayers, setEnabledLayers] = useState({});
  const [settings, setSettings] = useState({
    ceilingHeight: 2.80,
    wallThickness: 0.25,
    unit: 'mm',
    floors: 1,
    deductOpenings: true,
    avgDoorArea: 1.89, // 0.9m × 2.1m
    avgWindowArea: 1.80, // 1.2m × 1.5m
  });
  const [results, setResults] = useState(null);
  const [adjustments, setAdjustments] = useState({});
  const [parseError, setParseError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [boqGenerated, setBoqGenerated] = useState(false);

  // Filter DXF and DWG files from project files
  const dxfFiles = useMemo(() =>
    projectFiles.filter(f => {
      const name = (f.name || '').toLowerCase();
      return (name.endsWith('.dxf') || name.endsWith('.dwg')) &&
             String(f.projectId) === String(activeProjectId);
    }), [projectFiles, activeProjectId]);

  // ── Auto-classify a layer name ──
  const classifyLayer = useCallback((layerName) => {
    const lower = (layerName || '').toLowerCase().replace(/[-_\s]/g, '');
    for (const [catKey, cat] of Object.entries(LAYER_CATEGORIES)) {
      for (const pattern of cat.patterns) {
        if (lower.includes(pattern.toLowerCase().replace(/[-_\s]/g, ''))) {
          return catKey;
        }
      }
    }
    return 'unknown';
  }, []);

  const loadDxfData = useCallback((textContent) => {
    try {
      if (!textContent || textContent.length < 50) {
        setParseError('محتوى الملف فارغ أو تالف. تأكد من رفع ملف صحيح.');
        setIsProcessing(false);
        return;
      }

      let parsed;
      try {
        parsed = parseDxfText(textContent);
      } catch (parseErr) {
        setParseError(`خطأ في تحليل بنية الملف: ${parseErr.message}`);
        setIsProcessing(false);
        return;
      }

      if (!parsed.entities || parsed.entities.length === 0) {
        setParseError('لم يتم العثور على أي عناصر رسومية في الملف. تأكد أنه ملف صحيح من AutoCAD.');
        setIsProcessing(false);
        return;
      }

      // Auto-detect unit from DXF header
      const insunits = parsed.header?.insunits || parsed.header?.$INSUNITS;
      if (insunits === 4) setSettings(s => ({ ...s, unit: 'mm' }));
      else if (insunits === 5) setSettings(s => ({ ...s, unit: 'cm' }));
      else if (insunits === 6) setSettings(s => ({ ...s, unit: 'm' }));
      else if (insunits === 1) setSettings(s => ({ ...s, unit: 'in' }));
      else if (insunits === 2) setSettings(s => ({ ...s, unit: 'ft' }));

      // Classify layers
      const newLayerMap = {};
      const newEnabled = {};
      for (const [name, layer] of Object.entries(parsed.layers)) {
        const category = classifyLayer(name);
        newLayerMap[name] = category;
        newEnabled[name] = category !== 'unknown' && category !== 'ignore' &&
          LAYER_CATEGORIES[category]?.calcType !== 'ignore';
      }

      setLayerMap(newLayerMap);
      setEnabledLayers(newEnabled);
      setParsedData(parsed);
      setIsProcessing(false);
    } catch (err) {
      setParseError(`خطأ في تحليل الملف: ${err.message}`);
      setIsProcessing(false);
    }
  }, [classifyLayer]);

  // ── Parse the selected DXF file ──
  const handleParse = useCallback(() => {
    setParseError(null);
    setResults(null);
    setBoqGenerated(false);
    setAdjustments({});

    const file = projectFiles.find(f => f.id === selectedFileId);
    if (!file) { setParseError('الملف غير موجود'); return; }

    setIsProcessing(true);

    const fileNameLower = (file.name || '').toLowerCase();
    if (fileNameLower.endsWith('.dwg')) {
      api.post('/subcontractors/convert-dwg', { content: file.content })
        .then(res => {
          if (res.data.success && res.data.dxfContent) {
            loadDxfData(res.data.dxfContent);
          } else {
            setParseError(language === 'ar' ? 'فشل تحويل الملف من DWG إلى DXF.' : 'Failed to convert DWG to DXF.');
            setIsProcessing(false);
          }
        })
        .catch(err => {
          setParseError(err.response?.data?.error || (language === 'ar' ? 'حدث خطأ أثناء الاتصال بالخادم لتحويل ملف DWG.' : 'Server connection error during DWG conversion.'));
          setIsProcessing(false);
        });
      return;
    }

    try {
      let textContent = file.content || '';

      // If stored as base64 data URL, decode it
      if (textContent.startsWith('data:')) {
        const base64Part = textContent.split(',')[1];
        if (base64Part) {
          try {
            textContent = atob(base64Part);
          } catch (e) {
            setParseError(
              language === 'ar'
                ? 'فشل في قراءة بنية الملف. يرجى التأكد من حفظ الملف بصيغة DXF النصية (ASCII DXF) وليس بصيغة ثنائية.'
                : 'Failed to read file content. Please ensure the file was saved as text-based DXF (ASCII DXF) and not binary.'
            );
            setIsProcessing(false);
            return;
          }
        }
      }

      loadDxfData(textContent);
    } catch (err) {
      setParseError(`خطأ في قراءة ملف DXF: ${err.message}`);
      setIsProcessing(false);
    }
  }, [selectedFileId, projectFiles, language, loadDxfData]);

  // ── Calculate quantities ──
  const handleCalculate = useCallback(() => {
    if (!parsedData) return;
    setIsProcessing(true);

    const { unit, ceilingHeight, floors, deductOpenings, avgDoorArea, avgWindowArea } = settings;
    const quantityGroups = {};

    // Group entities by their classified layer category
    const entityByCategory = {};
    for (const [layerName, category] of Object.entries(layerMap)) {
      if (!enabledLayers[layerName] || category === 'unknown') continue;
      if (!entityByCategory[category]) entityByCategory[category] = [];
      const layerEntities = parsedData.layers[layerName]?.entities || [];
      entityByCategory[category].push(...layerEntities);
    }

    // ── Process each category ──
    for (const [category, entities] of Object.entries(entityByCategory)) {
      const catDef = LAYER_CATEGORIES[category];
      if (!catDef || catDef.calcType === 'ignore') continue;

      const groupKey = category;
      if (!quantityGroups[groupKey]) {
        quantityGroups[groupKey] = {
          category,
          icon: catDef.icon,
          label: language === 'ar' ? catDef.label_ar : catDef.label_en,
          unit: catDef.unit,
          color: catDef.color,
          items: [],
          totalRaw: 0,
          entityCount: entities.length
        };
      }

      const group = quantityGroups[groupKey];

      if (catDef.calcType === 'area') {
        // Find closed polylines and calculate their areas
        entities.forEach((e, idx) => {
          if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
            const verts = e.vertices || [];
            const closed = isPolyClosed(verts, e.closed || !!(e.flags & 1));
            if (closed && verts.length >= 3) {
              const rawArea = polygonArea(verts);
              // Area in DXF units² → convert to m²
              const scaledArea = rawArea * (toMeters(1, unit) ** 2);
              const perimeter = polygonPerimeter(verts) * toMeters(1, unit);

              group.items.push({
                id: `${category}-area-${idx}`,
                description: `مساحة مغلقة #${group.items.length + 1}`,
                quantity: parseFloat(scaledArea.toFixed(2)),
                unit: 'م²',
                perimeter: parseFloat(perimeter.toFixed(2)),
                vertexCount: verts.length,
                type: 'area'
              });
              group.totalRaw += scaledArea;
            }
          }
        });
      }

      if (catDef.calcType === 'length') {
        // Calculate total length of all lines and polylines
        entities.forEach((e, idx) => {
          if (e.type === 'LINE') {
            const start = e.start || e.vertices?.[0] || { x: e.x || 0, y: e.y || 0 };
            const end = e.end || e.vertices?.[1] || { x: e.x2 || 0, y: e.y2 || 0 };
            const rawLen = lineLength(start, end);
            const lenM = rawLen * toMeters(1, unit);

            if (lenM > 0.01) { // Ignore tiny lines
              group.items.push({
                id: `${category}-line-${idx}`,
                description: `خط #${group.items.length + 1}`,
                quantity: parseFloat(lenM.toFixed(2)),
                unit: 'م.ط',
                type: 'length'
              });
              group.totalRaw += lenM;
            }
          }
          if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
            const verts = e.vertices || [];
            const closed = isPolyClosed(verts, e.closed || !!(e.flags & 1));
            const rawLen = polylineLength(verts, closed);
            const lenM = rawLen * toMeters(1, unit);

            if (lenM > 0.01) {
              group.items.push({
                id: `${category}-poly-${idx}`,
                description: `بوليلاين #${group.items.length + 1} (${closed ? 'مغلق' : 'مفتوح'})`,
                quantity: parseFloat(lenM.toFixed(2)),
                unit: 'م.ط',
                type: 'length'
              });
              group.totalRaw += lenM;
            }
          }
        });
      }

      if (catDef.calcType === 'count') {
        // Count INSERT blocks and other point-like entities
        let count = 0;
        entities.forEach(e => {
          if (e.type === 'INSERT' || e.type === 'CIRCLE' || e.type === 'POINT') {
            count++;
          }
        });
        // Also count unique polylines as potential items
        entities.forEach(e => {
          if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') count++;
        });
        if (count > 0) {
          group.items.push({
            id: `${category}-count`,
            description: `عدد العناصر`,
            quantity: count,
            unit: catDef.unit,
            type: 'count'
          });
          group.totalRaw = count;
        }
      }
    }

    // ── Derived quantities ──
    const derivedItems = [];
    const wallGroup = quantityGroups.wall;
    const floorGroup = quantityGroups.floor;
    const doorGroup = quantityGroups.door;
    const windowGroup = quantityGroups.window;

    // Wall area = total wall length × ceiling height
    if (wallGroup && wallGroup.totalRaw > 0) {
      const wallArea = wallGroup.totalRaw * ceilingHeight;
      let netWallArea = wallArea;

      // Deduct openings
      const doorCount = doorGroup?.totalRaw || 0;
      const windowCount = windowGroup?.totalRaw || 0;
      if (deductOpenings) {
        netWallArea -= (doorCount * avgDoorArea) + (windowCount * avgWindowArea);
        netWallArea = Math.max(0, netWallArea);
      }

      derivedItems.push({
        id: 'derived-plaster',
        category: 'derived',
        icon: '🏗️',
        label: language === 'ar' ? 'أعمال بياض محاره (مشتق)' : 'Plastering (derived)',
        color: '#d97706',
        quantity: parseFloat(netWallArea.toFixed(2)),
        unit: 'م²',
        formula: `إجمالي أطوال الحوائط (${wallGroup.totalRaw.toFixed(2)} م) × ارتفاع السقف (${ceilingHeight} م)${deductOpenings ? ` - فتحات (${doorCount} باب × ${avgDoorArea} + ${windowCount} شباك × ${avgWindowArea})` : ''}`,
        type: 'derived'
      });

      derivedItems.push({
        id: 'derived-paint',
        category: 'derived',
        icon: '🎨',
        label: language === 'ar' ? 'أعمال دهانات حوائط (مشتق)' : 'Wall Painting (derived)',
        color: '#059669',
        quantity: parseFloat(netWallArea.toFixed(2)),
        unit: 'م²',
        formula: `= مساحة المحاره`,
        type: 'derived'
      });
    }

    // Ceiling area = total floor area (if no ceiling layer)
    if (floorGroup && floorGroup.totalRaw > 0 && !quantityGroups.ceiling) {
      derivedItems.push({
        id: 'derived-ceiling',
        category: 'derived',
        icon: '⬜',
        label: language === 'ar' ? 'أعمال أسقف جيبسوم (مشتق من الأرضيات)' : 'Gypsum Ceiling (derived from floors)',
        color: '#a855f7',
        quantity: parseFloat(floorGroup.totalRaw.toFixed(2)),
        unit: 'م²',
        formula: `= إجمالي مساحات الأرضيات`,
        type: 'derived'
      });
    }

    // Skirting = total perimeter of floor polylines
    if (floorGroup) {
      const totalPerimeter = floorGroup.items
        .filter(i => i.perimeter)
        .reduce((sum, i) => sum + i.perimeter, 0);
      if (totalPerimeter > 0) {
        derivedItems.push({
          id: 'derived-skirting',
          category: 'derived',
          icon: '📏',
          label: language === 'ar' ? 'أعمال وزرات (مشتق من محيط الغرف)' : 'Skirting (derived from room perimeters)',
          color: '#be185d',
          quantity: parseFloat(totalPerimeter.toFixed(2)),
          unit: 'م.ط',
          formula: `مجموع محيطات الأرضيات المغلقة`,
          type: 'derived'
        });
      }
    }

    // Apply floor multiplier
    const finalGroups = {};
    for (const [key, grp] of Object.entries(quantityGroups)) {
      finalGroups[key] = {
        ...grp,
        totalFinal: parseFloat((grp.totalRaw * floors).toFixed(2))
      };
    }

    const finalDerived = derivedItems.map(d => ({
      ...d,
      quantityFinal: parseFloat((d.quantity * floors).toFixed(2))
    }));

    setResults({ groups: finalGroups, derived: finalDerived, floors });
    setIsProcessing(false);
  }, [parsedData, layerMap, enabledLayers, settings, language]);

  // ── Generate BOQ items ──
  const handleGenerateBOQ = useCallback(() => {
    if (!results || !setBoqItems) return;

    const newItems = [];
    let nextId = boqItems.length > 0 ? Math.max(...boqItems.map(b => b.id)) + 1 : 1;

    // Add direct quantity groups
    for (const [, grp] of Object.entries(results.groups)) {
      if (grp.totalFinal <= 0) continue;
      const catDef = LAYER_CATEGORIES[grp.category];
      if (!catDef || catDef.calcType === 'ignore') continue;

      newItems.push({
        id: nextId++,
        projectId: activeProjectId,
        category: grp.label,
        item_name: `${grp.icon} ${grp.label} — مستخرج آلياً من لوحات AutoCAD`,
        quantity: grp.totalFinal,
        unit: grp.unit,
        price: 0,
        total: 0,
        notes: `تم استخراجه آلياً | ${grp.entityCount} عنصر | ${results.floors > 1 ? `${results.floors} طوابق` : 'طابق واحد'}`,
        source: 'dxf-takeoff'
      });
    }

    // Add derived quantities
    for (const d of results.derived) {
      if (d.quantityFinal <= 0) continue;
      newItems.push({
        id: nextId++,
        projectId: activeProjectId,
        category: d.label,
        item_name: `${d.icon} ${d.label} — محسوب آلياً`,
        quantity: d.quantityFinal,
        unit: d.unit,
        price: 0,
        total: 0,
        notes: `الصيغة: ${d.formula} | ${results.floors > 1 ? `${results.floors} طوابق` : 'طابق واحد'}`,
        source: 'dxf-takeoff'
      });
    }

    if (newItems.length > 0) {
      setBoqItems(prev => [...prev, ...newItems]);
      setBoqGenerated(true);
    }
  }, [results, boqItems, setBoqItems, activeProjectId]);

  // ── Stats summary ──
  const stats = useMemo(() => {
    if (!parsedData) return null;
    const totalEntities = parsedData.entities?.length || 0;
    const totalLayers = Object.keys(parsedData.layers || {}).length;
    const classifiedLayers = Object.values(layerMap).filter(v => v !== 'unknown').length;
    return { totalEntities, totalLayers, classifiedLayers };
  }, [parsedData, layerMap]);

  // ── Render ──
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-500">

      {/* Header */}
      <div className="bg-[#131b2e] border border-slate-800 p-8 rounded-[2rem] shadow-2xl">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 rounded-2xl border border-indigo-500/30">
            <span className="text-3xl">📐</span>
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {language === 'ar' ? 'محرك استخراج المقايسات الآلي من اللوحات الهندسية' : 'AutoCAD DXF Quantity Takeoff Engine'}
            </h2>
            <p className="text-xs text-slate-400 font-bold mt-1">
              {language === 'ar' ? 'تحليل هندسي دقيق — حسابات رياضية صرفة — صفر ذكاء اصطناعي' : 'Precise geometric analysis — Pure math — Zero AI'}
            </p>
          </div>
        </div>
      </div>

      {/* Settings + File Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* File Selector */}
        <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl space-y-4">
          <h3 className="text-sm font-black text-cyan-400 flex items-center gap-2">
            <span className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/25">📁</span>
            {language === 'ar' ? 'اختيار ملف هندسي (DXF / DWG)' : 'Select Engineering File (DXF / DWG)'}
          </h3>
          {dxfFiles.length === 0 ? (
            <div className="p-6 text-center bg-[#0f172a] rounded-2xl border border-dashed border-slate-700">
              <span className="text-4xl block mb-3">📂</span>
              <p className="text-xs text-slate-400 font-bold leading-relaxed">
                {language === 'ar'
                  ? 'لا توجد ملفات DXF أو DWG مرفوعة لهذا المشروع بعد. ارفع ملف AutoCAD من تاب "ملفات ومستندات" أولاً.'
                  : 'No DXF or DWG files found. Upload an AutoCAD file in the Files tab first.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {dxfFiles.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFileId(f.id)}
                  className={`w-full p-4 rounded-xl border text-right flex justify-between items-center transition-all ${
                    selectedFileId === f.id
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                      : 'bg-[#0f172a] border-slate-800 text-slate-400 hover:bg-[#111827] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📐</span>
                    <div>
                      <span className="text-xs font-black block">{f.name}</span>
                      <span className="text-[9px] text-slate-500 font-mono">{f.date}</span>
                    </div>
                  </div>
                  {selectedFileId === f.id && <span className="text-xs font-black text-cyan-400">✓ محدد</span>}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={handleParse}
            disabled={!selectedFileId || isProcessing}
            className={`w-full py-3.5 rounded-xl text-xs font-black transition-all ${
              selectedFileId && !isProcessing
                ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 active:scale-[0.98] shadow-lg shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isProcessing ? '⏳ جاري التحليل...' : '🔍 تحليل الملف وكشف الطبقات'}
          </button>
        </div>

        {/* Project Settings */}
        <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl space-y-4">
          <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/25">⚙️</span>
            {language === 'ar' ? 'إعدادات المشروع' : 'Project Settings'}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 font-bold">{language === 'ar' ? 'ارتفاع السقف (م)' : 'Ceiling Height (m)'}</label>
              <input type="number" step="0.05" min="2" max="6" value={settings.ceilingHeight}
                onChange={e => setSettings(s => ({ ...s, ceilingHeight: parseFloat(e.target.value) || 2.8 }))}
                className="bg-[#111827] border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 font-bold">{language === 'ar' ? 'سمك الحوائط (م)' : 'Wall Thickness (m)'}</label>
              <input type="number" step="0.05" min="0.1" max="0.5" value={settings.wallThickness}
                onChange={e => setSettings(s => ({ ...s, wallThickness: parseFloat(e.target.value) || 0.25 }))}
                className="bg-[#111827] border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 font-bold">{language === 'ar' ? 'وحدة القياس في الرسم' : 'Drawing Unit'}</label>
              <select value={settings.unit}
                onChange={e => setSettings(s => ({ ...s, unit: e.target.value }))}
                className="bg-[#111827] border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                <option value="mm">مليمتر (mm)</option>
                <option value="cm">سنتيمتر (cm)</option>
                <option value="m">متر (m)</option>
                <option value="in">إنش (in)</option>
                <option value="ft">قدم (ft)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 font-bold">{language === 'ar' ? 'عدد الطوابق المتكررة' : 'Repeated Floors'}</label>
              <input type="number" min="1" max="50" value={settings.floors}
                onChange={e => setSettings(s => ({ ...s, floors: parseInt(e.target.value) || 1 }))}
                className="bg-[#111827] border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={settings.deductOpenings}
                onChange={e => setSettings(s => ({ ...s, deductOpenings: e.target.checked }))}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-500" />
              <span className="text-[10px] text-slate-400 font-bold">
                {language === 'ar' ? 'خصم مساحات الفتحات (أبواب وشبابيك) من مساحة الحوائط' : 'Deduct door/window openings from wall area'}
              </span>
            </label>
          </div>
          {settings.deductOpenings && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold">متوسط مساحة الباب (م²)</label>
                <input type="number" step="0.1" min="0.5" max="5" value={settings.avgDoorArea}
                  onChange={e => setSettings(s => ({ ...s, avgDoorArea: parseFloat(e.target.value) || 1.89 }))}
                  className="bg-[#111827] border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold">متوسط مساحة الشباك (م²)</label>
                <input type="number" step="0.1" min="0.5" max="5" value={settings.avgWindowArea}
                  onChange={e => setSettings(s => ({ ...s, avgWindowArea: parseFloat(e.target.value) || 1.8 }))}
                  className="bg-[#111827] border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Parse Error */}
      {parseError && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-5 rounded-2xl text-xs text-rose-400 font-bold flex items-center gap-3">
          <span className="text-xl">⚠️</span> {parseError}
        </div>
      )}

      {/* Analysis Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl text-center hover:scale-[1.02] transition-all">
            <span className="text-3xl block mb-2">📊</span>
            <div className="text-2xl font-black text-white font-mono">{stats.totalEntities.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">عنصر رسومي</div>
          </div>
          <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl text-center hover:scale-[1.02] transition-all">
            <span className="text-3xl block mb-2">📑</span>
            <div className="text-2xl font-black text-cyan-400 font-mono">{stats.totalLayers}</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">طبقة مكتشفة</div>
          </div>
          <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl text-center hover:scale-[1.02] transition-all">
            <span className="text-3xl block mb-2">✅</span>
            <div className="text-2xl font-black text-emerald-400 font-mono">{stats.classifiedLayers}</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">طبقة مصنفة تلقائياً</div>
          </div>
        </div>
      )}

      {/* Layer Classification Panel */}
      {parsedData && (
        <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl space-y-4">
          <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
            <span className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/25">📑</span>
            {language === 'ar' ? 'خريطة الطبقات وتصنيفها' : 'Layer Classification'}
          </h3>
          <p className="text-[10px] text-slate-500 font-bold">
            {language === 'ar' ? 'راجع تصنيف كل طبقة. يمكنك تعديل التصنيف يدوياً أو تعطيل طبقات لا تريد حسابها.' : 'Review layer classification. You can manually adjust or disable layers.'}
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#0b0f19] text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3 text-center w-10">✓</th>
                  <th className="p-3">اسم الطبقة</th>
                  <th className="p-3 text-center">عدد العناصر</th>
                  <th className="p-3 text-center">التصنيف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {Object.entries(parsedData.layers || {}).map(([name, layer]) => {
                  const cat = layerMap[name] || 'unknown';
                  const catDef = LAYER_CATEGORIES[cat];
                  return (
                    <tr key={name} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 text-center">
                        <input type="checkbox" checked={!!enabledLayers[name]}
                          onChange={e => setEnabledLayers(prev => ({ ...prev, [name]: e.target.checked }))}
                          className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-cyan-500" />
                      </td>
                      <td className="p-3">
                        <span className="font-mono font-bold text-slate-200">{name}</span>
                      </td>
                      <td className="p-3 text-center font-mono text-slate-400">
                        {layer.entities?.length || 0}
                      </td>
                      <td className="p-3 text-center">
                        <select value={cat}
                          onChange={e => setLayerMap(prev => ({ ...prev, [name]: e.target.value }))}
                          className="bg-[#111827] border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-cyan-500"
                          style={{ borderColor: catDef?.color ? catDef.color + '40' : undefined }}>
                          <option value="unknown">❓ غير مصنف</option>
                          {Object.entries(LAYER_CATEGORIES).map(([key, def]) => (
                            <option key={key} value={key}>{def.icon} {def.label_ar}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleCalculate}
            disabled={isProcessing}
            className="w-full py-3.5 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:from-indigo-600 hover:to-cyan-600 active:scale-[0.98] shadow-lg shadow-indigo-500/20 transition-all"
          >
            {isProcessing ? '⏳ جاري الحساب...' : '🧮 بدء حساب الكميات'}
          </button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Direct quantities */}
          <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/25">📊</span>
              {language === 'ar' ? 'نتائج الحساب — كميات مباشرة من الرسم' : 'Results — Direct Quantities'}
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#0b0f19] text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3">البند</th>
                    <th className="p-3 text-center">عدد العناصر</th>
                    <th className="p-3 text-center">الوحدة</th>
                    <th className="p-3 text-center">الكمية (طابق واحد)</th>
                    {results.floors > 1 && <th className="p-3 text-center">الكمية الإجمالية ({results.floors} طوابق)</th>}
                    <th className="p-3 text-center">تعديل يدوي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {Object.entries(results.groups).map(([key, grp]) => {
                    if (grp.totalRaw <= 0) return null;
                    const adj = adjustments[key];
                    const finalQty = adj !== undefined ? parseFloat(adj) : grp.totalFinal;
                    return (
                      <tr key={key} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded-lg text-sm" style={{ backgroundColor: grp.color + '15', borderColor: grp.color + '30' }}>{grp.icon}</span>
                            <span className="font-black text-slate-200">{grp.label}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono text-slate-400">{grp.entityCount}</td>
                        <td className="p-3 text-center font-mono text-slate-400">{grp.unit}</td>
                        <td className="p-3 text-center font-mono font-black text-cyan-400">
                          {grp.totalRaw.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        {results.floors > 1 && (
                          <td className="p-3 text-center font-mono font-black text-emerald-400">
                            {grp.totalFinal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        )}
                        <td className="p-3 text-center">
                          <input type="number" step="0.01" min="0"
                            value={adj !== undefined ? adj : grp.totalFinal}
                            onChange={e => setAdjustments(prev => ({ ...prev, [key]: e.target.value }))}
                            className="bg-[#111827] border border-slate-700 focus:border-cyan-500 rounded-lg px-2 py-1 text-xs text-white font-mono text-center w-24 focus:outline-none" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Derived quantities */}
          {results.derived.length > 0 && (
            <div className="bg-[#131b2e] border border-indigo-500/20 p-6 rounded-[2rem] shadow-2xl space-y-4">
              <h3 className="text-sm font-black text-indigo-400 flex items-center gap-2">
                <span className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/25">🧮</span>
                {language === 'ar' ? 'كميات مشتقة (محسوبة من العلاقات الهندسية)' : 'Derived Quantities'}
              </h3>

              <div className="space-y-3">
                {results.derived.map(d => (
                  <div key={d.id} className="p-4 bg-[#0f172a] border border-slate-800 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg" style={{ color: d.color }}>{d.icon}</span>
                      <div>
                        <span className="text-xs font-black text-slate-200 block">{d.label}</span>
                        <span className="text-[9px] text-slate-500 font-mono block mt-0.5">📐 {d.formula}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <span className="font-mono text-base font-black text-emerald-400">
                          {d.quantityFinal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-500 mr-1">{d.unit}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate BOQ Button */}
          <div className="bg-[#131b2e] border border-emerald-500/20 p-6 rounded-[2rem] shadow-2xl">
            {boqGenerated ? (
              <div className="text-center space-y-3">
                <span className="text-5xl block">✅</span>
                <p className="text-sm font-black text-emerald-400">
                  {language === 'ar' ? 'تم توليد بنود المقايسة بنجاح وإضافتها لتاب BOQ!' : 'BOQ items generated successfully!'}
                </p>
                <p className="text-[10px] text-slate-500 font-bold">
                  {language === 'ar' ? 'انتقل لتاب "المقايسة والبنود" لمراجعة البنود الجديدة وتحديد الأسعار.' : 'Go to BOQ tab to review and set prices.'}
                </p>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-xs text-slate-400 font-bold">
                  {language === 'ar'
                    ? '⚠️ مراجعة أخيرة: تأكد من صحة الكميات أعلاه قبل اعتمادها. يمكنك تعديل أي قيمة يدوياً.'
                    : '⚠️ Final review: Verify quantities above before generating BOQ items.'}
                </p>
                <button
                  onClick={handleGenerateBOQ}
                  className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-xs font-black hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] shadow-lg shadow-emerald-500/20 transition-all"
                >
                  ✅ {language === 'ar' ? 'اعتماد وتوليد بنود المقايسة تلقائياً في تاب BOQ' : 'Generate & Add BOQ Items'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
