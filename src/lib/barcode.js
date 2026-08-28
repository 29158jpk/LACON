/**
 * HorizonPOS — Barcode & SKU Utilities
 * Pure JavaScript Code-128 SVG generator & Auto SKU/Barcode helpers.
 */

// Code 128 B Patterns (ASCII 32 to 127)
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'                                 // 100-106 (104=StartB, 106=Stop)
];

const START_B_CODE = 104;
const STOP_CODE = 106;

/**
 * Generate Code 128 binary modules string (e.g. "11010011...") from text.
 * @param {string} text 
 * @returns {{ modules: string, text: string }}
 */
export function encodeCode128(text) {
  if (!text || typeof text !== 'string') text = '000000';
  const cleanText = text.trim();
  const codes = [START_B_CODE];
  let checkSum = START_B_CODE;

  for (let i = 0; i < cleanText.length; i++) {
    const charCode = cleanText.charCodeAt(i);
    // ASCII 32-126 mapped to 0-94
    let val = charCode - 32;
    if (val < 0 || val > 94) val = 0; // fallback space
    codes.push(val);
    checkSum += val * (i + 1);
  }

  const checkDigit = checkSum % 103;
  codes.push(checkDigit);
  codes.push(STOP_CODE);

  // Convert pattern strings (widths of alternating bars/spaces) into binary string
  let binaryString = '';
  codes.forEach(c => {
    const pattern = CODE128_PATTERNS[c] || CODE128_PATTERNS[0];
    let isBar = true;
    for (let char of pattern) {
      const width = parseInt(char, 10);
      binaryString += (isBar ? '1' : '0').repeat(width);
      isBar = !isBar;
    }
  });

  return { modules: binaryString, text: cleanText };
}

/**
 * Generate an SVG string or React-compatible data for a barcode.
 * @param {string} text 
 * @param {object} options 
 * @returns {{ totalWidth: number, height: number, bars: Array<{x: number, width: number}>, text: string }}
 */
export function generateBarcodeSVGData(text, options = {}) {
  const { barWidth = 2, height = 50, quietZone = 10 } = options;
  const { modules, text: displayText } = encodeCode128(text);

  const bars = [];
  let currentX = quietZone;
  let inBar = false;
  let barStart = 0;

  for (let i = 0; i < modules.length; i++) {
    const isOne = modules[i] === '1';
    if (isOne && !inBar) {
      inBar = true;
      barStart = currentX;
    } else if (!isOne && inBar) {
      inBar = false;
      bars.push({ x: barStart, width: currentX - barStart });
    }
    currentX += barWidth;
  }
  if (inBar) {
    bars.push({ x: barStart, width: currentX - barStart });
  }

  const totalWidth = currentX + quietZone;

  return {
    totalWidth,
    height,
    bars,
    text: displayText
  };
}

/**
 * Generate a random unique SKU
 * @param {string} category 
 * @returns {string} e.g. "GPU-94821", "CPU-30214", "SKU-58210"
 */
export function generateSKU(category = '') {
  let prefix = 'SKU';
  if (category) {
    const catUpper = category.toUpperCase().replace(/[^A-Z]/g, '');
    if (catUpper.includes('COMPUTER') || catUpper.includes('PC')) prefix = 'PC';
    else if (catUpper.includes('PART') || catUpper.includes('GPU')) prefix = 'GPU';
    else if (catUpper.includes('CPU')) prefix = 'CPU';
    else if (catUpper.includes('CASE')) prefix = 'CASE';
    else if (catUpper.includes('MONITOR')) prefix = 'MON';
    else if (catUpper.includes('CHAIR')) prefix = 'CHR';
    else if (catUpper.includes('AUDIO')) prefix = 'AUD';
    else if (catUpper.includes('DESK')) prefix = 'DSK';
    else if (catUpper.includes('ACC')) prefix = 'ACC';
    else if (catUpper.length >= 3) prefix = catUpper.slice(0, 3);
  }
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomNum}`;
}

/**
 * Generate a random 12-13 digit Barcode number (EAN-13 format)
 * @returns {string} e.g. "8859102481923"
 */
export function generateBarcode() {
  const prefix = '885'; // Thailand EAN prefix
  const middle = Math.floor(100000000 + Math.random() * 900000000).toString();
  const raw = prefix + middle; // 12 digits
  
  // Calculate EAN-13 check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(raw[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return raw + checkDigit;
}

/**
 * Play a crisp barcode scan beep using Web Audio API
 */
export function playScanSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Short high-pitched beep (typical scanner tone)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1850, ctx.currentTime); // 1.85 kHz
    osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    // Ignore audio autoplay restrictions if blocked
  }
}
