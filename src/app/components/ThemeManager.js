'use client';

import { useState, useEffect, useRef } from 'react';
import {
  THEME_PRESETS,
  DEFAULT_THEME_CONFIG,
  getThemeConfig,
  saveThemeConfig,
  applyThemeToDOM,
  THEME_EVENT,
} from '../../lib/themeHelper';
import { compressImageFile } from '../../lib/imageHelper';

export default function ThemeManager() {
  const [config, setConfig] = useState(DEFAULT_THEME_CONFIG);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'custom'
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  const fileInputRef = useRef(null);
  const popoverRef = useRef(null);
  const triggerBtnRef = useRef(null);

  // Initialize theme on mount
  useEffect(() => {
    const loaded = getThemeConfig();
    setConfig(loaded);
    applyThemeToDOM(loaded);

    const handleThemeChange = (e) => {
      if (e.detail) {
        setConfig(e.detail);
      }
    };
    window.addEventListener(THEME_EVENT, handleThemeChange);

    // Click outside listener to close popover
    const handleClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        triggerBtnRef.current &&
        !triggerBtnRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectPreset = (presetId) => {
    const updated = { ...config, preset: presetId };
    setConfig(updated);
    saveThemeConfig(updated);
  };

  const handleCustomBgChange = (field, value) => {
    const updated = {
      ...config,
      preset: 'custom',
      customBg: {
        ...config.customBg,
        [field]: value,
      },
    };
    setConfig(updated);
    saveThemeConfig(updated);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');
    try {
      // Compress image for localStorage friendly size (~1920x1080, quality 0.8)
      const dataUrl = await compressImageFile(file, 1920, 1080, 0.8);
      const updated = {
        ...config,
        preset: 'custom',
        customBg: {
          ...config.customBg,
          imageData: dataUrl,
        },
      };
      setConfig(updated);
      saveThemeConfig(updated);
    } catch (err) {
      setUploadError(err.message || 'ไม่สามารถโหลดรูปภาพได้');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetCustomBg = () => {
    const updated = {
      ...config,
      preset: 'dark',
      customBg: { ...DEFAULT_THEME_CONFIG.customBg },
    };
    setConfig(updated);
    saveThemeConfig(updated);
    setUploadError('');
  };

  const currentPresetInfo = THEME_PRESETS.find((p) => p.id === config.preset) || THEME_PRESETS[0];

  return (
    <>
      {/* ── Fixed Custom Background Render Layer ── */}
      {config.preset === 'custom' && config.customBg?.imageData && (
        <div className="custom-background-wrapper" aria-hidden="true">
          <div
            className="custom-background-image"
            style={{
              backgroundImage: `url(${config.customBg.imageData})`,
              opacity: config.customBg.opacity ?? 0.85,
              filter: `brightness(${config.customBg.brightness ?? 0.8}) blur(${config.customBg.blur ?? 0}px)`,
            }}
          />
          <div
            className="custom-background-overlay"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${config.customBg.overlayDarkness ?? 0.45})`,
            }}
          />
        </div>
      )}

      {/* ── Floating Fixed Button at Bottom-Left ── */}
      <div className="theme-fixed-container">
        <button
          ref={triggerBtnRef}
          type="button"
          id="theme-toggle-btn"
          className={`theme-fixed-button ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen((prev) => !prev)}
          title="ปรับแต่งธีม & พื้นหลัง (Theme Customizer)"
          aria-label="เปิดเมนูปรับแต่งธีม"
        >
          <span className="theme-btn-icon">🎨</span>
          <span className="theme-btn-text">Theme</span>
          <span className="theme-btn-badge">{currentPresetInfo.icon}</span>
        </button>

        {/* ── Theme Popover Panel ── */}
        {isOpen && (
          <div ref={popoverRef} className="theme-popover-panel" role="dialog" aria-label="ปรับแต่งธีม">
            <div className="theme-popover-header">
              <div className="theme-header-title">
                <span className="theme-header-icon">🎨</span>
                <div>
                  <h4>Theme & Background</h4>
                  <p>ปรับแต่งโทนสีและภาพพื้นหลังของระบบ</p>
                </div>
              </div>
              <button
                type="button"
                className="theme-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="ปิดเมนู"
              >
                ✕
              </button>
            </div>

            {/* Sub-tabs: Presets vs Custom Background */}
            <div className="theme-sub-tabs">
              <button
                type="button"
                className={`theme-sub-tab-btn ${activeTab === 'presets' ? 'active' : ''}`}
                onClick={() => setActiveTab('presets')}
              >
                🌈 ธีมมาตรฐาน ({THEME_PRESETS.length - 1})
              </button>
              <button
                type="button"
                className={`theme-sub-tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
                onClick={() => setActiveTab('custom')}
              >
                🖼️ รูปพื้นหลังเอง
              </button>
            </div>

            {/* Tab 1: Preset Themes */}
            {activeTab === 'presets' && (
              <div className="theme-presets-grid">
                {THEME_PRESETS.map((preset) => {
                  const isSelected = config.preset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`theme-preset-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectPreset(preset.id)}
                    >
                      <div className="preset-card-preview" style={{ background: preset.preview.bg }}>
                        <div className="preset-mini-card" style={{ background: preset.preview.card }}>
                          <span className="preset-mini-accent" style={{ background: preset.preview.accent }} />
                          <span className="preset-mini-line" style={{ background: preset.preview.text }} />
                        </div>
                      </div>
                      <div className="preset-card-info">
                        <span className="preset-card-title">
                          {preset.icon} {preset.name}
                        </span>
                        <span className="preset-card-desc">{preset.desc}</span>
                      </div>
                      {isSelected && <span className="preset-selected-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Custom Background Studio */}
            {activeTab === 'custom' && (
              <div className="theme-custom-studio">
                {/* Upload Image Section */}
                <div className="custom-upload-section">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />

                  {config.customBg?.imageData ? (
                    <div className="custom-image-preview-box">
                      <img
                        src={config.customBg.imageData}
                        alt="Custom Background Preview"
                        className="custom-img-thumb"
                      />
                      <div className="custom-preview-overlay">
                        <button
                          type="button"
                          className="btn-change-image"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          🔄 เปลี่ยนรูปภาพ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="custom-drop-area"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span className="drop-icon">📷</span>
                      <span className="drop-text">
                        {isUploading ? 'กำลังประมวลผลรูปภาพ...' : 'คลิกเพื่อเลือกรูปภาพจากเครื่อง'}
                      </span>
                      <span className="drop-hint">รองรับ PNG, JPG, WebP (ปรับขนาดอัตโนมัติ)</span>
                    </div>
                  )}

                  {uploadError && <div className="custom-error-text">⚠️ {uploadError}</div>}
                </div>

                {/* Adjustments: Opacity, Brightness, Blur, Darkness */}
                <div className="custom-controls-list">
                  {/* Opacity */}
                  <div className="theme-slider-group">
                    <div className="slider-header">
                      <label>ความโปร่งใสของรูป (Opacity)</label>
                      <span className="slider-val">
                        {Math.round((config.customBg?.opacity ?? 0.85) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={config.customBg?.opacity ?? 0.85}
                      onChange={(e) => handleCustomBgChange('opacity', parseFloat(e.target.value))}
                      className="theme-range-slider"
                    />
                  </div>

                  {/* Brightness */}
                  <div className="theme-slider-group">
                    <div className="slider-header">
                      <label>ความสว่างของรูป (Brightness)</label>
                      <span className="slider-val">
                        {Math.round((config.customBg?.brightness ?? 0.8) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.5"
                      step="0.05"
                      value={config.customBg?.brightness ?? 0.8}
                      onChange={(e) => handleCustomBgChange('brightness', parseFloat(e.target.value))}
                      className="theme-range-slider"
                    />
                  </div>

                  {/* Overlay Darkness */}
                  <div className="theme-slider-group">
                    <div className="slider-header">
                      <label>ความมืดของฉากหลัง (Darkness)</label>
                      <span className="slider-val">
                        {Math.round((config.customBg?.overlayDarkness ?? 0.45) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.85"
                      step="0.05"
                      value={config.customBg?.overlayDarkness ?? 0.45}
                      onChange={(e) => handleCustomBgChange('overlayDarkness', parseFloat(e.target.value))}
                      className="theme-range-slider"
                    />
                  </div>

                  {/* Blur */}
                  <div className="theme-slider-group">
                    <div className="slider-header">
                      <label>ความเบลอของรูป (Blur Effect)</label>
                      <span className="slider-val">{config.customBg?.blur ?? 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="16"
                      step="1"
                      value={config.customBg?.blur ?? 0}
                      onChange={(e) => handleCustomBgChange('blur', parseInt(e.target.value, 10))}
                      className="theme-range-slider"
                    />
                  </div>
                </div>

                {/* Reset Action */}
                <div className="custom-actions-footer">
                  <button
                    type="button"
                    className="btn-reset-theme"
                    onClick={handleResetCustomBg}
                  >
                    🔄 ล้างและคืนค่าเริ่มต้น (Reset)
                  </button>
                  <button
                    type="button"
                    className="btn-primary btn-save-theme"
                    onClick={() => setIsOpen(false)}
                  >
                    ✓ ใช้งานธีมนี้
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
