'use client';

import { useEffect, useState } from 'react';
import { api, mediaUrl } from '../lib/api-client';
import { useAdminLanguage } from '../lib/i18n';

export default function MediaLibrary() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const { t } = useAdminLanguage();

  async function load() {
    setLoading(true);
    try { setItems(await api('/admin/media')); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData(); form.append('file', file);
      const result = await api('/admin/media', { method: 'POST', body: form });
      setItems((list) => [result, ...list]); setNotice(t('Your media is ready to use.'));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); event.target.value = ''; }
  }

  async function save(item) {
    setBusy(true); setError('');
    try { await api(`/admin/media/${item.id}`, { method: 'PATCH', body: { alt_text: item.alt_text || '' } }); setNotice(t('Media description saved.')); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function remove(item) {
    if (!window.confirm(t('Remove this media from the library? Used media must be unlinked first.'))) return;
    setBusy(true); setError('');
    try { await api(`/admin/media/${item.id}`, { method: 'DELETE' }); setItems((list) => list.filter((media) => media.id !== item.id)); setNotice(t('Media removed from the library.')); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const visible = items.filter((item) => item.file_name.toLowerCase().includes(query.toLowerCase()));
  return <main className="content">
    <div className="page-heading"><div><p className="eyebrow">{t('A VISUAL ARCHIVE')}</p><h1>{t('Image library.')}</h1><p>{t('The materials, moments and spaces that tell your story.')}</p></div><label className="primary upload-button">{busy ? t('Working…') : t('+ Upload media')}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4" disabled={busy} onChange={upload} /></label></div>
    {error && <p className="notice error" role="alert">{error}<button onClick={load}>{t('Retry')}</button></p>}{notice && <p className="notice success" role="status">{notice}</p>}
    <div className="list-toolbar"><input aria-label={t('Search images')} type="search" placeholder={t('Find a photograph…')} value={query} onChange={(event) => setQuery(event.target.value)} /><span>{t('JPEG, PNG, WebP · 10 MB · MP4 · 60 MB maximum')}</span></div>
    {loading ? <p role="status">{t('Loading your image library…')}</p> : visible.length ? <div className="library-grid">{visible.map((item) => { const video = item.mime_type === 'video/mp4'; return <article className="library-card" key={item.id}><a href={mediaUrl(item.public_url)} target="_blank" rel="noreferrer">{video ? <video src={mediaUrl(item.public_url)} muted playsInline controls preload="metadata" /> : <img src={mediaUrl(item.public_url)} alt={item.alt_text || item.file_name} />}</a><div><h3 title={item.file_name}>{item.file_name}</h3><small>{(item.file_size / 1024).toFixed(0)} KB · {item.mime_type.replace(/^(image|video)\//, '').toUpperCase()}</small><label>{t('Media description')}<input value={item.alt_text || ''} maxLength={255} onChange={(event) => setItems((list) => list.map((media) => media.id === item.id ? { ...media, alt_text: event.target.value } : media))} /></label><div className="row-actions"><button disabled={busy} onClick={() => save(item)}>{t('Save description')}</button><button disabled={busy} className="danger-text" onClick={() => remove(item)}>{t('Delete')}</button></div></div></article>; })}</div> : <div className="panel empty-state"><h2>{t('Your visual archive starts here.')}</h2><p>{t('Upload a photograph or MP4 video to make it available for projects and articles.')}</p></div>}
  </main>;
}
