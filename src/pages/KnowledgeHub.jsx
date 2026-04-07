import { useEffect, useState, useRef } from 'react'
import { BookOpen, Upload, File, Trash2, Search, Loader2, FolderOpen } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'

const CATEGORIES = ['General', 'Repairs', 'Customer Service', 'Policies', 'Training', 'Technical']

export default function KnowledgeHub() {
  const { profile } = useAuthStore()
  const notify = useUiStore(s => s.notify)
  const fileRef = useRef()
  const [files, setFiles]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch]       = useState('')
  const [category, setCategory]   = useState('')
  const [uploadMeta, setUploadMeta] = useState({ title: '', category: 'General', description: '' })

  const canUpload = ['owner','district_manager','manager'].includes(profile?.role)

  useEffect(() => { loadFiles() }, [])

  const loadFiles = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('knowledge_files')
      .select('*, users!uploaded_by(full_name)')
      .order('created_at', { ascending: false })
    setFiles(data || [])
    setLoading(false)
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)

    const ext  = file.name.split('.').pop()
    const path = `${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('knowledge').upload(path, file)
    if (upErr) { notify('Upload failed: ' + upErr.message, 'error'); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('knowledge').getPublicUrl(path)

    await supabase.from('knowledge_files').insert({
      title:       uploadMeta.title || file.name,
      description: uploadMeta.description,
      category:    uploadMeta.category,
      file_url:    publicUrl,
      file_name:   file.name,
      file_size:   file.size,
      uploaded_by: profile.id,
    })

    notify('File uploaded!', 'success')
    setUploadMeta({ title: '', category: 'General', description: '' })
    await loadFiles()
    setUploading(false)
    fileRef.current.value = ''
  }

  const handleDelete = async (fileRecord) => {
    const path = fileRecord.file_url.split('/knowledge/')[1]
    await supabase.storage.from('knowledge').remove([path])
    await supabase.from('knowledge_files').delete().eq('id', fileRecord.id)
    notify('File deleted.', 'info')
    setFiles(f => f.filter(x => x.id !== fileRecord.id))
  }

  const filtered = files.filter(f => {
    const matchSearch = !search || f.title.toLowerCase().includes(search.toLowerCase()) || f.description?.toLowerCase().includes(search.toLowerCase())
    const matchCat    = !category || f.category === category
    return matchSearch && matchCat
  })

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = filtered.filter(f => f.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-brand-400" />
          <h1 className="text-xl font-semibold text-slate-100">Knowledge Hub</h1>
        </div>
        {canUpload && (
          <button onClick={() => fileRef.current.click()} disabled={uploading} className="btn-primary">
            {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><Upload size={14} /> Upload File</>}
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" className="hidden" onChange={handleUpload}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.mp4,.mov" />

      {/* Upload metadata */}
      {canUpload && (
        <div className="card space-y-3">
          <p className="text-xs font-medium text-slate-400">File metadata (set before uploading)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Title</label>
              <input className="input text-sm" placeholder="File title…" value={uploadMeta.title}
                onChange={e => setUploadMeta(m => ({ ...m, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input text-sm" value={uploadMeta.category}
                onChange={e => setUploadMeta(m => ({ ...m, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <input className="input text-sm" placeholder="Optional description…" value={uploadMeta.description}
                onChange={e => setUploadMeta(m => ({ ...m, description: e.target.value }))} />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-8 text-sm" placeholder="Search files…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40 text-sm" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading files…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <FolderOpen size={36} className="mx-auto mb-3 opacity-30" />
          <p>No files found.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <section key={cat}>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{cat}</h2>
            <div className="space-y-2">
              {items.map(f => (
                <div key={f.id} className="card flex items-start gap-3 py-3">
                  <File size={16} className="text-brand-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <a href={f.file_url} target="_blank" rel="noreferrer"
                      className="text-sm font-medium text-slate-200 hover:text-brand-400 transition-colors">
                      {f.title}
                    </a>
                    {f.description && <p className="text-xs text-slate-500 mt-0.5">{f.description}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                      <span>{f.users?.full_name}</span>
                      <span>{format(parseISO(f.created_at), 'MMM d, yyyy')}</span>
                      {f.file_size && <span>{(f.file_size / 1024).toFixed(0)} KB</span>}
                    </div>
                  </div>
                  {canUpload && (
                    <button onClick={() => handleDelete(f)} className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
