'use client';

import { useEffect, useRef, useState } from 'react';
import { api, mediaUrl } from '../lib/api-client';
import { useAdminLanguage } from '../lib/i18n';

export default function MediaPicker({ mode = 'image', onSelect, onClose }) {
  const dialog = useRef(null);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t } = useAdminLanguage();
  const isVideo = mode === 'video';

  const load = () => {
    setLoading(true);
    api('/admin/media').then(setItems).catch((err) => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(() => {
    dialog.current?.showModal();
    load();
  }, []);

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError('');
    const form = new FormData(); form.append('file', file);
    try {
      const item = await api('/admin/media', { method: 'POST', body: form });
      setItems((list) => [item, ...list]);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); event.target.value = ''; }
  }

  const accepted = isVideo ? 'video/mp4' : 'image/jpeg,image/png,image/webp';
  const visible = items.filter((item) => isVideo ? item.mime_type === 'video/mp4' : item.mime_type?.startsWith('image/'));

  return <dialog ref={dialog} className="media-dialog" onCancel={onClose} aria-labelledby="media-title">
    <header><div><p className="eyebrow">{isVideo ? t('VIDEO LIBRARY') : t('IMAGE LIBRARY')}</p><h2 id="media-title">{isVideo ? t('Choose a hero video') : t('Choose a photograph')}</h2></div><button type="button" onClick={onClose} aria-label={t('Close image library')}>×</button></header>
    <label className="upload-button">{busy ? t('Uploading…') : isVideo ? t('+ Upload MP4 video') : t('+ Upload image')}<input type="file" accept={accepted} disabled={busy} onChange={upload} /></label>
    <p className="field-help">{isVideo ? t('MP4 video · up to 60 MB · used silently in the homepage hero') : t('JPEG, PNG or WebP · up to 10 MB · up to 20 megapixels')}</p>
    {error && <p className="notice error" role="alert">{error}</p>}
    {loading ? <p role="status">{t(isVideo ? 'Loading videos…' : 'Loading images…')}</p> : visible.length ? <div className="media-grid">{visible.map((item) => <button type="button" className="media-tile" key={item.id} onClick={() => onSelect(item)}>{isVideo ? <video src={mediaUrl(item.public_url)} muted playsInline preload="metadata" /> : <img src={mediaUrl(item.public_url)} alt={item.alt_text || item.file_name} />}<span>{item.file_name}</span></button>)}</div> : <div className="empty-state"><h3>{t(isVideo ? 'Your video library starts here.' : 'Your image library starts here.')}</h3><p>{t(isVideo ? 'Upload an MP4 video to use it in the homepage hero.' : 'Upload a photograph to use it in your content.')}</p></div>}
  </dialog>;
}
