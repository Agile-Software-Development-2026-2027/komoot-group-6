import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { uploadTrail, validateGpxFile } from '../../services/trailUploadsService.js';
import { prepareTrailCover } from '../../utils/prepareTrailCover.js';
import { routeToSvgPath } from '../../utils/routePath.js';
import { CloseIcon, TrailsIcon } from '../NearbyPanel/icons.jsx';
import TrailUploadFields from './TrailUploadFields.jsx';
import styles from './GpxUploadDialog.module.css';

const MAX_FILES = 5;
const MAX_FILE_MB = 5;
const STATUS = {
  checking: 'Checking GPX…',
  invalid: 'File error',
  saving: 'Saving…',
  failed: 'Save failed',
  saved: 'Saved',
  duplicate: 'Already present',
};

function complete({ name, description, difficulty, coverImage, preparingPhoto }) {
  return Boolean(name.trim() && description.trim() && difficulty && coverImage && !preparingPhoto);
}

function fileStatus(entry) {
  if (entry.status === 'ready' && entry.error) return 'failed';
  return entry.status;
}

function queuedFile(file) {
  return {
    id: crypto.randomUUID(),
    file,
    filename: file.name,
    name: file.name.replace(/\.gpx$/i, '').slice(0, 100),
    description: '',
    trailType: 'hiking',
    difficulty: '',
    isPublic: false,
    coverImage: null,
    status: 'checking',
  };
}

function gpxPreview(features) {
  const lines = features.flatMap(({ geometry }) =>
    geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates
  );
  return routeToSvgPath({ type: 'MultiLineString', coordinates: lines }, {
    width: 400, height: 110, padding: 14,
  });
}

export default function GpxUploadDialog({ onClose, onSaved, onShowTrail }) {
  const { authFetch } = useAuth();
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const browseRef = useRef(null);
  const [entries, setEntries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const selected = entries.find(({ id }) => id === selectedId) ?? entries[0];
  const ready = entries.filter(({ status }) => status === 'ready');
  const checking = entries.some(({ status }) => status === 'checking');
  const missingDetails = ready.some((entry) => !complete(entry));
  const savedCount = entries.filter(({ status }) => status === 'saved').length;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    browseRef.current.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  function update(id, changes) {
    setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, ...changes } : entry));
  }

  async function addFiles(list) {
    if (saving || checking || !list.length) return;
    const available = MAX_FILES - entries.length;
    const added = Array.from(list).slice(0, available).map(queuedFile);
    setNotice(list.length > available ? `You can add up to ${MAX_FILES} files at a time.` : '');
    if (!added.length) return;

    setEntries((current) => [...current, ...added]);
    setSelectedId(added[0].id);
    for (const entry of added) {
      try {
        if (!/\.gpx$/i.test(entry.filename)) throw new Error('Choose a .gpx file.');
        if (entry.file.size > MAX_FILE_MB * 1024 * 1024) throw new Error('This file exceeds 5 MB.');
        const { features } = await validateGpxFile(authFetch, entry.file);
        const trackName = features[0]?.properties?.name?.trim();
        update(entry.id, {
          status: 'ready',
          name: trackName?.slice(0, 100) || entry.name,
          preview: gpxPreview(features),
        });
      } catch (error) {
        update(entry.id, { status: 'invalid', error: error.message });
      }
    }
  }

  function removeFile(id) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    setNotice('');
  }

  async function choosePhoto(id, file) {
    update(id, { preparingPhoto: true, photoError: '', coverImage: null });
    try {
      const coverImage = await prepareTrailCover(file);
      update(id, { coverImage });
    } catch (error) {
      update(id, { photoError: error.message });
    } finally {
      update(id, { preparingPhoto: false });
    }
  }

  async function saveTrails() {
    if (saving || checking || missingDetails || !ready.length) return;
    setSaving(true);
    let changed = false;
    try {
      for (const entry of ready) {
        update(entry.id, { status: 'saving', error: '' });
        try {
          const feature = await uploadTrail(authFetch, entry);
          update(entry.id, { status: 'saved', feature, file: null, coverImage: null });
          changed = true;
        } catch (error) {
          const existingTrailId = error.data?.existingTrailId;
          update(entry.id, { status: existingTrailId ? 'duplicate' : 'ready', error: error.message, existingTrailId });
        }
      }
      if (changed) onSaved();
    } finally {
      setSaving(false);
    }
  }

  function closeDialog(event) {
    event.preventDefault();
    if (saving) return;
    dialogRef.current.close();
    onClose();
  }

  const canAdd = !saving && !checking && entries.length < MAX_FILES;
  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="gpx-dialog-title"
      onCancel={closeDialog}
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.stopPropagation();
      }}
    >
      <header className={styles.header}>
        <h2 id="gpx-dialog-title">Add GPX</h2>
        <button type="button" className={styles.iconButton} disabled={saving} onClick={closeDialog} aria-label="Close upload">
          <CloseIcon />
        </button>
      </header>

      <div className={styles.body}>
        <div
          className={styles.drop}
          data-dragging={dragging}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = canAdd ? 'copy' : 'none';
            if (canAdd) setDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            addFiles(event.dataTransfer.files);
          }}
        >
          <span className={styles.dropIcon}><TrailsIcon /></span>
          <div>
            <strong>Drop GPX files here</strong>
            <p>Up to {MAX_FILES} files · {MAX_FILE_MB} MB per file</p>
          </div>
          <button type="button" ref={browseRef} className={styles.outline} disabled={!canAdd}
            onClick={() => inputRef.current.click()}>
            Browse files
          </button>
          <input ref={inputRef} type="file" accept=".gpx" multiple hidden aria-label="GPX files"
            onChange={(event) => {
              const files = Array.from(event.target.files);
              event.target.value = '';
              addFiles(files);
            }} />
        </div>
        {notice && <p className={styles.error} role="alert">{notice}</p>}

        {selected && (
          <div className={styles.workspace}>
            <ul className={styles.queue} aria-label="Files to import">
              {entries.map((entry) => (
                <li key={entry.id} data-active={entry.id === selected.id}>
                  <button type="button" className={styles.chooseFile}
                    aria-pressed={entry.id === selected.id} onClick={() => setSelectedId(entry.id)}>
                    <strong>{entry.filename}</strong>
                    <span data-status={fileStatus(entry)}>
                      {STATUS[fileStatus(entry)] ?? (complete(entry) ? 'Ready' : 'Details needed')}
                    </span>
                  </button>
                  <button type="button" className={styles.iconButton} aria-label={`Remove ${entry.filename}`}
                    disabled={saving || entry.status === 'checking'} onClick={() => removeFile(entry.id)}>
                    <CloseIcon />
                  </button>
                </li>
              ))}
            </ul>

            <section className={styles.editor} aria-label={`Details for ${selected.filename}`}>
              {selected.error && <p className={styles.error} role="alert">{selected.error}</p>}
              {selected.existingTrailId && (
                <Link to={`/trails/${encodeURIComponent(selected.existingTrailId)}`} className={styles.link}>
                  View existing trail
                </Link>
              )}
              {selected.status === 'checking' && <p className={styles.hint} role="status">Validating this GPX file…</p>}
              {(selected.status === 'ready' || selected.status === 'saving') && (
                <TrailUploadFields
                  key={selected.id}
                  trail={selected}
                  disabled={saving}
                  onChange={(fields) => update(selected.id, { ...fields, error: '' })}
                  onPhoto={(file) => choosePhoto(selected.id, file)}
                />
              )}
              {selected.status === 'saved' && (
                <div className={styles.success}>
                  <strong>{selected.name}</strong>
                  <p>{selected.isPublic ? 'Saved as a public trail.' : 'Saved as a private trail.'}</p>
                  <button type="button" className={styles.outline} disabled={saving}
                    onClick={() => {
                      dialogRef.current.close();
                      onShowTrail(selected.feature);
                    }}>
                    Show on map
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {selected && (
        <footer className={styles.footer}>
          <p className={styles.hint} role="status">
            {saving ? 'Saving trails…' : missingDetails
              ? 'Complete the details for each valid file.'
              : `${savedCount} saved · ${ready.length} ready`}
          </p>
          {ready.length || saving ? (
            <button type="button" className={styles.primary} disabled={saving || checking || missingDetails}
              onClick={saveTrails}>
              Save {ready.length === 1 ? 'trail' : 'trails'}
            </button>
          ) : (
            <button type="button" className={styles.outline} onClick={closeDialog}>Done</button>
          )}
        </footer>
      )}
    </dialog>
  );
}
