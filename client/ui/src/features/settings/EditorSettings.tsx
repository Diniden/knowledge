import { useState, useCallback } from 'react';
import './EditorSettings.scss';

interface ToggleSwitchProps {
  active: boolean;
  onToggle: () => void;
  label: string;
}

function ToggleSwitch({ active, onToggle, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      className={`EditorSettings__toggle${active ? ' EditorSettings__toggle--active' : ''}`}
      onClick={onToggle}
      role="switch"
      aria-checked={active}
      aria-label={label}
    >
      <span className="EditorSettings__toggleKnob" />
    </button>
  );
}

export function EditorSettings() {
  const [autoSave, setAutoSave] = useState(true);
  const [autoSaveDelay, setAutoSaveDelay] = useState(1000);
  const [spellCheck, setSpellCheck] = useState(false);

  const handleToggleAutoSave = useCallback(() => {
    setAutoSave((v) => !v);
  }, []);

  const handleToggleSpellCheck = useCallback(() => {
    setSpellCheck((v) => !v);
  }, []);

  return (
    <div className="EditorSettings">
      <div className="EditorSettings__section">
        <h3 className="EditorSettings__sectionTitle">Saving</h3>
        <div className="EditorSettings__row">
          <div className="EditorSettings__label">
            <span className="EditorSettings__labelText">Auto-save</span>
            <span className="EditorSettings__labelHint">
              Automatically save changes as you type
            </span>
          </div>
          <ToggleSwitch
            active={autoSave}
            onToggle={handleToggleAutoSave}
            label="Auto-save"
          />
        </div>
        {autoSave && (
          <div className="EditorSettings__row">
            <div className="EditorSettings__label">
              <span className="EditorSettings__labelText">Auto-save delay</span>
              <span className="EditorSettings__labelHint">
                Milliseconds to wait before saving
              </span>
            </div>
            <input
              type="number"
              className="EditorSettings__delayInput"
              min={200}
              max={5000}
              step={100}
              value={autoSaveDelay}
              onChange={(e) => setAutoSaveDelay(Number(e.target.value))}
            />
          </div>
        )}
      </div>

      <div className="EditorSettings__section">
        <h3 className="EditorSettings__sectionTitle">Writing</h3>
        <div className="EditorSettings__row">
          <div className="EditorSettings__label">
            <span className="EditorSettings__labelText">Spell check</span>
            <span className="EditorSettings__labelHint">
              Highlight misspelled words in the editor
            </span>
          </div>
          <ToggleSwitch
            active={spellCheck}
            onToggle={handleToggleSpellCheck}
            label="Spell check"
          />
        </div>
      </div>
    </div>
  );
}
