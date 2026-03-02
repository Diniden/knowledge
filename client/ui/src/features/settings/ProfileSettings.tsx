import { useState, useCallback, type FormEvent } from 'react';
import { Input } from '../../components/common/Input.js';
import { Button } from '../../components/common/Button.js';
import './ProfileSettings.scss';

export interface ProfileSettingsProps {
  user: { displayName: string; email: string; avatarUrl?: string };
  onUpdate: (updates: Partial<{ displayName: string }>) => void;
}

export function ProfileSettings({ user, onUpdate }: ProfileSettingsProps) {
  const [displayName, setDisplayName] = useState(user.displayName);

  const initials = user.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      onUpdate({ displayName });
    },
    [displayName, onUpdate],
  );

  return (
    <div className="ProfileSettings">
      <div className="ProfileSettings__avatar">
        <div className="ProfileSettings__avatarImage">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} />
          ) : (
            initials
          )}
        </div>
        <div className="ProfileSettings__avatarInfo">
          <span className="ProfileSettings__avatarName">
            {user.displayName}
          </span>
          <span className="ProfileSettings__avatarHint">{user.email}</span>
        </div>
      </div>

      <form className="ProfileSettings__form" onSubmit={handleSubmit}>
        <div className="ProfileSettings__field">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="ProfileSettings__input"
          />
        </div>
        <div className="ProfileSettings__field">
          <Input
            label="Email"
            value={user.email}
            disabled
            helperText="Email cannot be changed"
            className="ProfileSettings__input"
          />
        </div>
        <div className="ProfileSettings__save">
          <Button type="submit" variant="primary">
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
