/**
 * HorizonPOS — Image Utilities
 * Bulletproof external image handling, Google Search URL extraction,
 * client-side image compression, and category fallback placeholders.
 */

/**
 * Clean & normalize image URLs from Google Search, direct web links, or user inputs.
 * @param {string} rawUrl 
 * @returns {{ cleanUrl: string, isGoogleExtracted: boolean }}
 */
export function cleanImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { cleanUrl: '', isGoogleExtracted: false };
  }

  let str = rawUrl.trim();

  // Strip Markdown image wrapper ![alt](url)
  const mdMatch = str.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/i);
  if (mdMatch) str = mdMatch[1];

  // Strip HTML tag <img src="...">
  const htmlMatch = str.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (htmlMatch) str = htmlMatch[1];

  // Remove surrounding quotes or backticks
  str = str.replace(/^["'`]|["'`]$/g, '').trim();

  // Check for Google Image Search redirect URL (imgurl parameter)
  // e.g. https://www.google.com/imgres?imgurl=https%3A%2F%2Fexample.com%2Fimage.jpg&imgrefurl=...
  if (str.includes('google.') && (str.includes('imgurl=') || str.includes('url='))) {
    try {
      const urlObj = new URL(str);
      const imgurl = urlObj.searchParams.get('imgurl') || urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
      if (imgurl && (imgurl.startsWith('http://') || imgurl.startsWith('https://'))) {
        return { cleanUrl: decodeURIComponent(imgurl), isGoogleExtracted: true };
      }
    } catch {
      // If URL parsing fails, attempt regex extraction
      const regexMatch = str.match(/[?&]imgurl=([^&]+)/i);
      if (regexMatch && regexMatch[1]) {
        try {
          return { cleanUrl: decodeURIComponent(regexMatch[1]), isGoogleExtracted: true };
        } catch {
          return { cleanUrl: regexMatch[1], isGoogleExtracted: true };
        }
      }
    }
  }

  return { cleanUrl: str, isGoogleExtracted: false };
}

/**
 * Generates an SVG Data URI placeholder with dark luxury styling tailored to category.
 * @param {string} category 
 * @param {string} name 
 * @returns {string} SVG Data URL
 */
export function getCategoryPlaceholder(category = '', name = '') {
  const cat = (category || '').toLowerCase();
  let iconSvg = '';
  let label = category || 'Product';

  if (cat.includes('computer') || cat.includes('pc') || cat.includes('laptop')) {
    iconSvg = `<rect x="4" y="4" width="16" height="12" rx="2" stroke="#3b82f6" stroke-width="1.5" fill="none"/>
               <line x1="2" y1="20" x2="22" y2="20" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>
               <line x1="12" y1="16" x2="12" y2="20" stroke="#3b82f6" stroke-width="1.5"/>`;
    label = 'Computer';
  } else if (cat.includes('part') || cat.includes('gpu') || cat.includes('cpu') || cat.includes('ram')) {
    iconSvg = `<rect x="3" y="3" width="18" height="18" rx="2" stroke="#3b82f6" stroke-width="1.5" fill="none"/>
               <rect x="7" y="7" width="10" height="10" rx="1" stroke="#60a5fa" stroke-width="1.5" fill="none"/>
               <circle cx="12" cy="12" r="2" fill="#3b82f6"/>`;
    label = 'Hardware';
  } else if (cat.includes('monitor') || cat.includes('screen') || cat.includes('oled')) {
    iconSvg = `<rect x="2" y="3" width="20" height="14" rx="2" stroke="#3b82f6" stroke-width="1.5" fill="none"/>
               <line x1="8" y1="21" x2="16" y2="21" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>
               <line x1="12" y1="17" x2="12" y2="21" stroke="#3b82f6" stroke-width="1.5"/>`;
    label = 'Display';
  } else if (cat.includes('chair')) {
    iconSvg = `<path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" stroke="#3b82f6" stroke-width="1.5" fill="none"/>
               <path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5z" stroke="#3b82f6" stroke-width="1.5" fill="none"/>
               <path d="M6 18v3M18 18v3" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>`;
    label = 'Gaming Chair';
  } else if (cat.includes('audio') || cat.includes('headphone') || cat.includes('sound')) {
    iconSvg = `<path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke="#3b82f6" stroke-width="1.5" fill="none"/>
               <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" fill="none" stroke="#3b82f6" stroke-width="1.5"/>`;
    label = 'Audio';
  } else if (cat.includes('desk')) {
    iconSvg = `<line x1="2" y1="8" x2="22" y2="8" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
               <line x1="5" y1="8" x2="5" y2="20" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>
               <line x1="19" y1="8" x2="19" y2="20" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>`;
    label = 'Gaming Desk';
  } else {
    iconSvg = `<rect x="3" y="3" width="18" height="18" rx="3" stroke="#3b82f6" stroke-width="1.5" fill="none"/>
               <circle cx="8.5" cy="8.5" r="1.5" fill="#3b82f6"/>
               <path d="m21 15-5-5L5 21" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  const cleanLabel = (name || label).slice(0, 20).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <rect width="300" height="200" fill="url(#bgGrad)"/>
    <g transform="translate(130, 60) scale(1.6)">
      ${iconSvg}
    </g>
    <text x="150" y="145" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" text-anchor="middle" letter-spacing="0.5">
      ${cleanLabel}
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Read and compress an image file to Base64 (Data URI)
 * @param {File} file 
 * @param {number} maxWidth 
 * @param {number} maxHeight 
 * @param {number} quality 
 * @returns {Promise<string>}
 */
export function compressImageFile(file, maxWidth = 800, maxHeight = 800, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('ไฟล์ที่เลือกไม่ใช่รูปภาพ'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('ไม่สามารถประมวลผลไฟล์รูปภาพได้'));
      img.src = readerEvent.target.result;
    };
    reader.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์'));
    reader.readAsDataURL(file);
  });
}
