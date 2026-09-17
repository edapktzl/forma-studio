'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, mediaUrl } from '../lib/api-client';
import { useAdminLanguage } from '../lib/i18n';
import { emptyRecord, resources, titleOf } from '../lib/resources';
import MediaPicker from './media-picker';
import RichEditor from './rich-editor';

function localDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);
}

export default function ContentManager({ resource }) {
  const config = resources[resource];
  const { language: panelLanguage, t } = useAdminLanguage();
  const [items, setItems] = useState([]);
  const [record, setRecord] = useState(null);
  const [initial, setInitial] = useState('');
  const [language, setLanguage] = useState('en');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('image');
  const [categories, setCategories] = useState({});
  const dirty = record && JSON.stringify(record) !== initial;

  const labelFor = (field) => panelLanguage === 'tr'
    ? (field.labelTr || t(field.label))
    : language === 'tr' && field.labelTr ? field.labelTr : field.label;

  async function load() {
    setLoading(true);
    try { setItems(await api(`/admin/${resource}`)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    for (const field of config.fields.filter((item) => item.type === 'category')) {
      api(`/admin/${field.source}`)
        .then((data) => setCategories((old) => ({ ...old, [field.source]: data })))
        .catch((err) => setError(err.message));
    }
    if (new URLSearchParams(window.location.search).has('new')) begin(emptyRecord(config));
  // Config changes only when the route changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  useEffect(() => {
    const handler = (event) => {
      if (dirty) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  function begin(item) {
    const next = structuredClone(item);
    setRecord(next);
    setInitial(JSON.stringify(next));
    setLanguage('en');
    setError('');
    setNotice('');
  }

  function back() {
    if (dirty && !window.confirm(t('Discard your unsaved changes?'))) return;
    setRecord(null); setError('');
  }

  const set = (key, value) => setRecord((old) => ({ ...old, [key]: value }));
  const translated = (key, value) => setRecord((old) => ({
    ...old,
    translations: {
      ...old.translations,
      [language]: { ...old.translations[language], [key]: value },
    },
  }));

  async function save(event) {
    event.preventDefault();
    setError(''); setNotice('');
    const validateTranslations = config.allowIncompleteDraft !== true || record.status === 'published';
    if (validateTranslations) {
      for (const lang of ['en', 'tr']) {
        for (const field of config.translations) {
          const value = record.translations[lang]?.[field.key] || '';
          const visible = field.type === 'rich'
            ? new DOMParser().parseFromString(value, 'text/html').body.textContent
            : value;
          if (field.required && visible.trim().length < 2) {
            setLanguage(lang);
            setError(t('Complete {field} in {language} (at least 2 characters).', {
              field: field.labelTr && lang === 'tr' ? field.labelTr : field.label,
              language: lang === 'en' ? t('English') : t('Turkish'),
            }));
            return;
          }
        }
      }
    }
    for (const field of config.fields) {
      if (field.required && (record[field.key] === null || record[field.key] === undefined || String(record[field.key]).trim() === '')) {
        setError(t('Complete {field}.', { field: labelFor(field) })); return;
      }
    }
    const payload = { ...record };
    for (const field of config.fields) {
      if (field.type === 'number' || field.type === 'category') {
        payload[field.key] = record[field.key] === null || record[field.key] === '' ? null : Number(record[field.key]);
      }
      if (field.type === 'datetime-local') {
        payload[field.key] = record[field.key] ? new Date(record[field.key]).toISOString() : null;
      }
    }
    if (config.gallery) payload.images = record.images.map(({ media_id, alt_text, is_cover }) => ({ media_id, alt_text: alt_text || '', is_cover }));
    setBusy(true);
    try {
      const result = await api(`/admin/${resource}${record.id ? `/${record.id}` : ''}`, {
        method: record.id ? 'PUT' : 'POST', body: payload,
      });
      setRecord(result); setInitial(JSON.stringify(result));
      setNotice(t('Your {item} has been saved.', { item: t(config.singular) }));
      await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function remove(item) {
    const message = config.statuses
      ? t('Remove this {item} from the website and workspace?', { item: t(config.singular) })
      : t('Deactivate this category? Existing content will be preserved.');
    if (!window.confirm(message)) return;
    setBusy(true); setError('');
    try { await api(`/admin/${resource}/${item.id}`, { method: 'DELETE' }); setNotice(config.statuses ? t('Content removed.') : t('Category deactivated.')); await load(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function selected(media) {
    if (config.gallery && pickerTarget === 'image') {
      if (!record.images.some((image) => image.media_id === media.id)) {
        set('images', [...record.images, { media_id: media.id, url: media.public_url, alt_text: media.alt_text || '', is_cover: record.images.length === 0 }]);
      }
    } else {
      const key = pickerTarget === 'video' && config.videoKey ? config.videoKey : config.imageKey;
      const urlKey = pickerTarget === 'video' ? 'video' : 'image';
      setRecord((old) => ({ ...old, [key]: media.id, [urlKey]: media.public_url }));
    }
    setPicker(false);
  }

  function reorder(index, direction) {
    const next = [...record.images];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    set('images', next);
  }

  function fieldInput(field, value, onChange) {
    const label = labelFor(field);
    const props = {
      id: field.key, name: field.key, value: value ?? '',
      onChange: (event) => onChange(event.target.value), maxLength: field.maxLength,
      min: field.min, max: field.max, required: field.required,
    };
    if (field.type === 'checkbox') return <label className="checkbox-field" key={field.key}><input type="checkbox" checked={!!value} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
    if (field.type === 'rich') return <div className="field" key={field.key}><span>{label} *</span><RichEditor key={`${record.id || 'new'}-${language}`} value={value} onChange={onChange} /></div>;
    if (field.type === 'category') {
      const options = categories[field.source] || [];
      return <div className="field" key={field.key}><label htmlFor={field.key}>{label}{field.required ? ' *' : ''}</label><select {...props}><option value="">{t('Select a category')}</option>{options.map((category) => { const name = category.translations?.[language]?.name || category.translations?.en?.name || category.translations?.tr?.name || category.name || category.slug; return <option key={category.id} value={category.id} disabled={!category.is_active}>{name}{!category.is_active ? ` (${t('inactive')})` : ''}</option>; })}</select>{!options.length && <small className="field-help">{t('No categories yet.')} <Link href="/categories/">{t('Create one from Categories')}</Link>.</small>}</div>;
    }
    return <label className="field" key={field.key} htmlFor={field.key}>{label}{field.required ? ' *' : ''}{field.type === 'textarea' ? <textarea {...props} rows={4} /> : <input {...props} type={field.type} value={field.type === 'datetime-local' && value ? localDate(value) : props.value} />} {field.help && <small className="field-help">{panelLanguage === 'tr' && field.helpTr ? field.helpTr : field.help}</small>}</label>;
  }

  const visible = items.filter((item) => (titleOf(item) + ' ' + (item.slug || '')).toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || item.status === filter));

  return <main className="content">
    <div className="page-heading"><div><p className="eyebrow">{t('STUDIO CONTENT')}</p><h1>{record ? (record.id ? t('Edit {item}', { item: t(config.singular) }) : t('New {item}', { item: t(config.singular) })) : t(config.title)}</h1><p>{t(config.intro)}</p></div>{record ? <button className="secondary" onClick={back}>{t('Back to {section}', { section: t(config.title).toLowerCase() })}</button> : <button className="primary" onClick={() => begin(emptyRecord(config))}>+ {t('Add {item}', { item: t(config.singular) })}</button>}</div>
    {error && <p className="notice error" role="alert">{error}</p>}{notice && <p className="notice success" role="status">{notice}</p>}
    {record ? <form onSubmit={save} noValidate><fieldset disabled={busy} className="editor-fieldset"><div className="editor-layout"><section className="panel"><div className="panel-heading"><h2>{t('Story & details')}</h2><span className="subtle">EN + TR</span></div><div className="language-tabs" role="tablist" aria-label={t('Content language')}>{['en', 'tr'].map((lang) => <button type="button" role="tab" aria-selected={language === lang} aria-controls="translation-panel" key={lang} onClick={() => setLanguage(lang)}>{lang === 'en' ? t('English') : t('Turkish')} <span>{config.translations.filter((field) => !field.required || (record.translations[lang]?.[field.key] || '').trim()).length}/{config.translations.length}</span></button>)}</div><div id="translation-panel" role="tabpanel" aria-label={language === 'en' ? t('English content') : t('Turkish content')}>{config.translations.map((field) => fieldInput(field, record.translations[language]?.[field.key] || '', (value) => translated(field.key, value)))}</div></section><aside className="editor-aside"><section className="panel"><h2>{t('Settings')}</h2>{config.fields.map((field) => fieldInput(field, record[field.key], (value) => set(field.key, value)))}{config.statuses && <label className="field">{t('Publication status')}<select value={record.status} onChange={(event) => set('status', event.target.value)}>{config.statuses.map((status) => <option key={status} value={status}>{t(status)}</option>)}</select></label>}<p className="field-help">{config.allowIncompleteDraft && record.status !== 'published' ? t('Drafts can be saved while you finish the copy. Both languages and a cover image are required for publication.') : t('Complete both language versions before saving. Published content is visible on the website.')}</p></section>
      {config.imageKey && <section className="panel"><h2>{t(config.imageLabel)}</h2>{record[config.imageKey] && record.image ? <><img className="cover-preview" src={mediaUrl(record.image)} alt={t('Selected photograph')} /><button type="button" className="text-button" onClick={() => setRecord((old) => ({ ...old, [config.imageKey]: null, image: null }))}>{t('Remove image')}</button></> : <div className="image-placeholder">{t('No image selected')}</div>}<button type="button" className="secondary" onClick={() => { setPickerTarget('image'); setPicker(true); }}>{t('Choose image')} ↗</button></section>}
      {config.videoKey && <section className="panel"><h2>{panelLanguage === 'tr' ? config.videoLabelTr : config.videoLabel}</h2>{record[config.videoKey] && record.video ? <><video className="cover-preview" src={mediaUrl(record.video)} controls muted playsInline preload="metadata" /><button type="button" className="text-button" onClick={() => setRecord((old) => ({ ...old, [config.videoKey]: null, video: null }))}>{t('Remove video')}</button></> : <div className="image-placeholder">{t('No video selected')}</div>}<button type="button" className="secondary" onClick={() => { setPickerTarget('video'); setPicker(true); }}>{t('Choose video')} ↗</button><small className="field-help">{t('Use an MP4 video up to 20 MB. It plays silently in the homepage hero.')}</small></section>}
    </aside></div>
      {config.gallery && <section className="panel gallery-panel"><div className="panel-heading"><div><h2>{t('Project gallery')}</h2><p className="field-help">{t('Choose a cover, arrange your photographs and add accessible descriptions.')}</p></div><button type="button" className="secondary" onClick={() => { setPickerTarget('image'); setPicker(true); }}>+ {t('Add photographs')}</button></div>{record.images.length ? <div className="gallery-grid">{record.images.map((image, index) => <div className="gallery-item" key={image.media_id}><img src={mediaUrl(image.url)} alt={image.alt_text || t('Project photograph')} /><label className="checkbox-field"><input type="radio" name="cover" checked={image.is_cover} onChange={() => set('images', record.images.map((entry, i) => ({ ...entry, is_cover: i === index })))} />{t('Cover photograph')}</label><input aria-label={t('Image {number} description', { number: index + 1 })} value={image.alt_text || ''} placeholder={t('Describe this photograph')} onChange={(event) => set('images', record.images.map((entry, i) => i === index ? { ...entry, alt_text: event.target.value } : entry))} /><div className="row-actions"><button type="button" aria-label={t('Move image {number} left', { number: index + 1 })} disabled={index === 0} onClick={() => reorder(index, -1)}>←</button><button type="button" aria-label={t('Move image {number} right', { number: index + 1 })} disabled={index === record.images.length - 1} onClick={() => reorder(index, 1)}>→</button><button type="button" onClick={() => set('images', record.images.filter((_, i) => i !== index))}>{t('Remove')}</button></div></div>)}</div> : <div className="empty-state"><p>{t('Add your first photograph to begin the gallery.')}</p></div>}</section>}
      <div className="save-bar"><span>{dirty ? t('Unsaved changes') : t('All changes saved')}</span><button className="primary" disabled={busy}>{busy ? t('Saving…') : t('Save {item}', { item: t(config.singular) })} ↗</button></div>
    </fieldset></form> : <section className="panel"><div className="list-toolbar"><input aria-label={t('Search content')} type="search" placeholder={t('Search {section}…', { section: t(config.title).toLowerCase() })} value={query} onChange={(event) => setQuery(event.target.value)} />{config.statuses && <select aria-label={t('Filter status')} value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">{t('All statuses')}</option>{config.statuses.map((status) => <option key={status}>{t(status)}</option>)}</select>}<span>{t('{count} entries', { count: visible.length })}</span></div>{loading ? <p className="empty-state" role="status">{t('Loading your content…')}</p> : visible.length ? <div className="table-scroll"><table><thead><tr><th>{t('Name')}</th><th>{t('Status')}</th><th>{t('Languages')}</th><th>{t('Actions')}</th></tr></thead><tbody>{visible.map((item) => <tr key={item.id}><td><button className="title-button" onClick={() => begin(item)}>{titleOf(item)}</button><small>{item.slug || item.company}{item.is_featured ? ` · ${t('Featured')}` : ''}</small></td><td><span className={`badge ${item.status || (item.is_active ? 'published' : 'archived')}`}>{t(item.status || (item.is_active ? 'active' : 'inactive'))}</span></td><td><span className="language-indicator">EN / TR</span></td><td><div className="row-actions"><button onClick={() => begin(item)}>{t('Edit')}</button><button className="danger-text" disabled={busy} onClick={() => remove(item)}>{config.statuses ? t('Delete') : t('Deactivate')}</button></div></td></tr>)}</tbody></table></div> : <div className="empty-state"><span className="empty-mark">+</span><h2>{query || filter !== 'all' ? t('Nothing matches your search.') : t('A fresh page for your studio.')}</h2><p>{query || filter !== 'all' ? t('Try a different search or status.') : t('Add your first {item} to get started.', { item: t(config.singular) })}</p>{!query && filter === 'all' && <button className="secondary" onClick={() => begin(emptyRecord(config))}>{t('Create {item}', { item: t(config.singular) })} ↗</button>}{error && <button onClick={load}>{t('Retry')}</button>}</div>}</section>}
    {picker && <MediaPicker mode={pickerTarget} onSelect={selected} onClose={() => setPicker(false)} />}
  </main>;
}
