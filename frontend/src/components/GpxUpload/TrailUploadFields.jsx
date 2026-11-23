import { useEffect, useId, useRef } from 'react';
import { PlusIcon } from '../NearbyPanel/icons.jsx';
import styles from './GpxUploadDialog.module.css';

const ACTIVITIES = [
  ['hiking', 'Hiking'],
  ['alpine', 'Alpine'],
  ['via_ferrata', 'Via ferrata'],
  ['trail_running', 'Trail running'],
];
const DIFFICULTIES = [
  ['T', 'T · Tourist'],
  ['E', 'E · Hiking'],
  ['EE', 'EE · Expert hikers'],
  ['EEA', 'EEA · Equipment required'],
];

function CoverPreview({ photo }) {
  const image = useRef(null);
  useEffect(() => {
    const reader = new FileReader();
    const element = image.current;
    reader.onload = () => { element.src = reader.result; };
    reader.readAsDataURL(photo);
    return () => {
      reader.onload = null;
      reader.abort();
    };
  }, [photo]);
  return <img ref={image} alt="Cover preview" />;
}

export default function TrailUploadFields({ trail, disabled, onChange, onPhoto }) {
  const visibilityId = useId();
  const visibilityHint = `${visibilityId}-hint`;
  const { preview, coverImage } = trail;
  return (
    <fieldset className={styles.fields} disabled={disabled}>
      <legend className="visually-hidden">Trail details</legend>
      <label className={styles.photo}>
        {coverImage ? <CoverPreview photo={coverImage} /> : preview && (
          <svg viewBox="0 0 400 110" aria-hidden="true">
            <path d={preview.d} />
            <circle cx={preview.start[0]} cy={preview.start[1]} r="4" />
          </svg>
        )}
        <span className={styles.photoAction}><PlusIcon /> {coverImage ? 'Change photo' : 'Add cover photo'}</span>
        <input
          className="visually-hidden"
          type="file"
          aria-label="Cover photo"
          accept="image/jpeg,image/png,image/webp"
          required={!coverImage}
          disabled={trail.preparingPhoto}
          onChange={(event) => {
            const file = event.target.files[0];
            event.target.value = '';
            if (file) onPhoto(file);
          }}
        />
      </label>
      {trail.preparingPhoto && <p className={styles.hint} role="status">Preparing photo…</p>}
      {trail.photoError && <p className={styles.error} role="alert">{trail.photoError}</p>}
      <label className={styles.field}>
        Trail name
        <input autoComplete="off" required maxLength={100} value={trail.name}
          onChange={(event) => onChange({ name: event.target.value })} />
      </label>
      <label className={styles.field}>
        Description
        <textarea required maxLength={2000} rows={3} value={trail.description}
          placeholder="What should hikers know about this trail?"
          onChange={(event) => onChange({ description: event.target.value })} />
      </label>
      <div className={styles.pair}>
        <label className={styles.field}>
          Activity
          <select value={trail.trailType} onChange={(event) => onChange({ trailType: event.target.value })}>
            {ACTIVITIES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          Difficulty
          <select required value={trail.difficulty} onChange={(event) => onChange({ difficulty: event.target.value })}>
            <option value="">Choose difficulty</option>
            {DIFFICULTIES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <div className={styles.field}>
        <label htmlFor={visibilityId}>Visibility</label>
        <select id={visibilityId} value={String(trail.isPublic)} aria-describedby={visibilityHint}
          onChange={(event) => onChange({ isPublic: event.target.value === 'true' })}>
          <option value="false">Private</option>
          <option value="true">Public</option>
        </select>
        <span className={styles.hint} id={visibilityHint}>
          {trail.isPublic ? 'Anyone can see this trail.' : 'Only you can see this trail.'}
        </span>
      </div>
    </fieldset>
  );
}
