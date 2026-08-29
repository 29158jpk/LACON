/**
 * Theme Manager & Preset Configurations for HorizonPOS
 */

export const THEME_STORAGE_KEY = 'horizonpos_theme_config';
export const THEME_EVENT = 'horizonpos_theme_change';

export const THEME_PRESETS = [
  {
    id: 'dark',
    name: 'Dark (ค่าเริ่มต้น)',
    icon: '🌑',
    desc: 'โทนเข้มสุดคลาสสิก สบายตา',
    preview: {
      bg: '#0f172a',
      card: '#1e293b',
      accent: '#3b82f6',
      text: '#f8fafc',
    },
  },
  {
    id: 'light',
    name: 'Light (สว่าง)',
    icon: '☀️',
    desc: 'โทนสว่าง คมชัด เรียบหรู',
    preview: {
      bg: '#f8fafc',
      card: '#ffffff',
      accent: '#2563eb',
      text: '#0f172a',
    },
  },
  {
    id: 'blue',
    name: 'Cyber Blue (น้ำเงินนีออน)',
    icon: '🔵',
    desc: 'โทนน้ำเงินไซเบอร์ เทคโนโลยีล้ำสมัย',
    preview: {
      bg: '#030f26',
      card: '#0c234a',
      accent: '#00d2ff',
      text: '#f0f9ff',
    },
  },
  {
    id: 'green',
    name: 'Emerald Matrix (เขียวมรกต)',
    icon: '🟢',
    desc: 'โทนมรกต Matrix สดชื่น มีพลัง',
    preview: {
      bg: '#041f16',
      card: '#083827',
      accent: '#10b981',
      text: '#ecfdf5',
    },
  },
  {
    id: 'purple',
    name: 'Neon Violet (ม่วงนีออน)',
    icon: '🟣',
    desc: 'โทนม่วง Synthwave ลึกลับน่าดึงดูด',
    preview: {
      bg: '#140728',
      card: '#29104e',
      accent: '#c084fc',
      text: '#faf5ff',
    },
  },
  {
    id: 'gradient',
    name: 'Modern Gradient (ไล่เฉดสี)',
    icon: '🌌',
    desc: 'เฉดสี Midnight Nebula ทันสมัย พรีเมียม',
    preview: {
      bg: 'linear-gradient(135deg, #090d16 0%, #1e1035 50%, #0c2340 100%)',
      card: 'rgba(255, 255, 255, 0.08)',
      accent: '#f43f5e',
      text: '#ffffff',
    },
  },
  {
    id: 'custom',
    name: 'Custom Background',
    icon: '🖼️',
    desc: 'ใส่รูปภาพพื้นหลังของคุณเอง',
    preview: {
      bg: 'linear-gradient(45deg, #1e1b4b 0%, #312e81 100%)',
      card: 'rgba(15, 23, 42, 0.75)',
      accent: '#38bdf8',
      text: '#ffffff',
    },
  },
];

export const DEFAULT_THEME_CONFIG = {
  preset: 'dark',
  customBg: {
    imageData: null,      // base64 data url
    opacity: 0.85,        // 0.1 to 1.0
    brightness: 0.8,     // 0.2 to 1.5
    blur: 0,             // 0 to 20px
    overlayDarkness: 0.45 // 0.0 to 0.9
  },
};

/**
 * Load Theme Config from localStorage
 */
export function getThemeConfig() {
  if (typeof window === 'undefined') return DEFAULT_THEME_CONFIG;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_THEME_CONFIG,
      ...parsed,
      customBg: {
        ...DEFAULT_THEME_CONFIG.customBg,
        ...(parsed.customBg || {}),
      },
    };
  } catch {
    return DEFAULT_THEME_CONFIG;
  }
}

/**
 * Save Theme Config & apply to document
 */
export function saveThemeConfig(config) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(config));
    applyThemeToDOM(config);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: config }));
  } catch (err) {
    console.error('Failed to save theme config:', err);
  }
}

/**
 * Apply theme attributes & CSS variables to document.documentElement
 */
export function applyThemeToDOM(config) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const preset = config?.preset || 'dark';
  
  root.setAttribute('data-theme', preset);
}
