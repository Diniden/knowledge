import './AppearanceSettings.scss';

export interface AppearanceSettingsProps {
  theme: 'light' | 'dark';
  fontSize: number;
  onThemeChange: (theme: 'light' | 'dark') => void;
  onFontSizeChange: (size: number) => void;
}

export function AppearanceSettings({
  theme,
  fontSize,
  onThemeChange,
  onFontSizeChange,
}: AppearanceSettingsProps) {
  return (
    <div className="AppearanceSettings">
      <div className="AppearanceSettings__section">
        <h3 className="AppearanceSettings__sectionTitle">Theme</h3>
        <div className="AppearanceSettings__toggle">
          <button
            type="button"
            className={`AppearanceSettings__option${theme === 'light' ? ' AppearanceSettings__option--active' : ''}`}
            onClick={() => onThemeChange('light')}
          >
            <span className="AppearanceSettings__optionIcon">☀️</span>
            <span className="AppearanceSettings__optionLabel">Light</span>
          </button>
          <button
            type="button"
            className={`AppearanceSettings__option${theme === 'dark' ? ' AppearanceSettings__option--active' : ''}`}
            onClick={() => onThemeChange('dark')}
          >
            <span className="AppearanceSettings__optionIcon">🌙</span>
            <span className="AppearanceSettings__optionLabel">Dark</span>
          </button>
        </div>
      </div>

      <div className="AppearanceSettings__section">
        <h3 className="AppearanceSettings__sectionTitle">Font Size</h3>
        <div className="AppearanceSettings__slider">
          <div className="AppearanceSettings__sliderHeader">
            <span className="AppearanceSettings__sliderLabel">
              Base font size
            </span>
            <span className="AppearanceSettings__sliderValue">
              {fontSize}px
            </span>
          </div>
          <input
            type="range"
            className="AppearanceSettings__sliderInput"
            min={12}
            max={20}
            step={1}
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="AppearanceSettings__section">
        <h3 className="AppearanceSettings__sectionTitle">Preview</h3>
        <div className="AppearanceSettings__preview">
          <div className="AppearanceSettings__previewTitle">Live Preview</div>
          <p
            className="AppearanceSettings__previewText"
            style={{ fontSize: `${fontSize}px` }}
          >
            The quick brown fox jumps over the lazy dog. This text previews your
            current font size setting.
          </p>
        </div>
      </div>
    </div>
  );
}
