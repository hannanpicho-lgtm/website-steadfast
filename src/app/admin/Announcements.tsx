import { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2, ToggleLeft, ToggleRight, Clock, Info, AlertTriangle, AlertCircle, ExternalLink, Pencil, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { buildAdminAuthHeaders } from '../services/supabaseAuth';
import { RUNTIME_ENVIRONMENT } from '../services/runtimeEnvironment';

interface AnnouncementRecord {
  id: string;
  text: string;
  linkUrl: string | null;
  linkLabel: string | null;
  priority: 'info' | 'warning' | 'urgent';
  active: boolean;
  createdAt: string;
  expiresAt: string | null;
  createdBy: string;
}

interface AnnouncementsProps {
  formatRelativeTime: (date: string) => string;
}

const PRIORITY_CONFIG = {
  info: { border: 'border-l-[#00D9FF]', bg: 'bg-[#00D9FF]/[0.08]', icon: Info, iconColor: 'text-[#00D9FF]', label: 'Info', badgeBg: 'bg-cyan-500/20', badgeText: 'text-cyan-300' },
  warning: { border: 'border-l-amber-500', bg: 'bg-amber-500/[0.08]', icon: AlertTriangle, iconColor: 'text-amber-400', label: 'Warning', badgeBg: 'bg-amber-500/20', badgeText: 'text-amber-300' },
  urgent: { border: 'border-l-red-500', bg: 'bg-red-500/[0.08]', icon: AlertCircle, iconColor: 'text-red-400', label: 'Urgent', badgeBg: 'bg-red-500/20', badgeText: 'text-red-300' },
} as const;

export default function Announcements({ formatRelativeTime }: AnnouncementsProps) {
  const serverUrl = RUNTIME_ENVIRONMENT.apiBaseUrl;
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state
  const [formText, setFormText] = useState('');
  const [formPriority, setFormPriority] = useState<'info' | 'warning' | 'urgent'>('info');
  const [formLinkUrl, setFormLinkUrl] = useState('');
  const [formLinkLabel, setFormLinkLabel] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');

  const fetchAnnouncements = async () => {
    try {
      const headers = await buildAdminAuthHeaders();
      const res = await fetch(`${serverUrl}/admin/announcements`, { headers });
      const data = await res.json().catch(() => ({}));
      setAnnouncements(Array.isArray(data?.announcements) ? data.announcements : []);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const resetForm = () => {
    setFormText('');
    setFormPriority('info');
    setFormLinkUrl('');
    setFormLinkLabel('');
    setFormExpiresAt('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formText.trim()) return;
    setSaving(true);
    try {
      const headers = await buildAdminAuthHeaders();
      const body: Record<string, unknown> = {
        text: formText.trim(),
        priority: formPriority,
        linkUrl: formLinkUrl.trim() || null,
        linkLabel: formLinkLabel.trim() || null,
        expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
      };

      const url = editingId
        ? `${serverUrl}/admin/announcements/${editingId}`
        : `${serverUrl}/admin/announcements`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to save announcement');

      toast.success(editingId ? 'Announcement updated.' : 'Announcement created.');
      resetForm();
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (a: AnnouncementRecord) => {
    setTogglingId(a.id);
    try {
      const headers = await buildAdminAuthHeaders();
      const res = await fetch(`${serverUrl}/admin/announcements/${a.id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !a.active }),
      });
      if (!res.ok) throw new Error('Failed to toggle');
      toast.success(`Announcement ${a.active ? 'deactivated' : 'activated'}.`);
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to toggle announcement');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const headers = await buildAdminAuthHeaders();
      const res = await fetch(`${serverUrl}/admin/announcements/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Failed to delete');
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success('Announcement deleted.');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete announcement');
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (a: AnnouncementRecord) => {
    setFormText(a.text);
    setFormPriority(a.priority);
    setFormLinkUrl(a.linkUrl ?? '');
    setFormLinkLabel(a.linkLabel ?? '');
    setFormExpiresAt(a.expiresAt ? a.expiresAt.slice(0, 16) : '');
    setEditingId(a.id);
    setShowForm(true);
  };

  const previewConfig = PRIORITY_CONFIG[formPriority];
  const PreviewIcon = previewConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Announcements</h2>
          <p className="text-gray-400 text-sm mt-1">Manage banner announcements visible to all users</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          <Plus size={18} />
          New Announcement
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-[#252b3d] rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-white">{editingId ? 'Edit Announcement' : 'Create Announcement'}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-white"><X size={20} /></button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Announcement Text</label>
              <textarea
                required
                maxLength={500}
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                rows={2}
                placeholder="Enter announcement text..."
              />
              <p className="text-gray-500 text-xs mt-1">{formText.length}/500</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as 'info' | 'warning' | 'urgent')}
                  className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Link URL (Optional)</label>
                <input
                  type="url"
                  value={formLinkUrl}
                  onChange={(e) => setFormLinkUrl(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Link Label (Optional)</label>
                <input
                  type="text"
                  maxLength={50}
                  value={formLinkLabel}
                  onChange={(e) => setFormLinkLabel(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1a1f2e] border border-gray-600 rounded-lg text-white focus:border-[#00D9FF] focus:outline-none"
                  placeholder="Learn more →"
                />
              </div>
            </div>

            {/* Live Preview */}
            {formText.trim() && (
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Eye size={14} />
                  <span>Live Preview</span>
                </div>
                <div className={`border-l-4 ${previewConfig.border} ${previewConfig.bg} rounded-r-lg`}>
                  <div className="px-4 py-2.5 flex items-center gap-3">
                    <PreviewIcon size={18} className={`${previewConfig.iconColor} flex-shrink-0`} />
                    <p className="flex-1 text-sm text-gray-200">
                      {formText}
                      {formLinkUrl && (
                        <span className="ml-2 text-[#00D9FF] font-medium underline underline-offset-2">
                          {formLinkLabel || 'Learn more →'}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving || !formText.trim()}
                className="flex-1 bg-[#00D9FF] hover:bg-[#00c5e6] text-[#1a1f2e] font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update Announcement' : 'Create Announcement'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {loading && (
          <div className="bg-[#252b3d] rounded-lg p-8 text-center">
            <p className="text-gray-400">Loading announcements...</p>
          </div>
        )}
        {!loading && announcements.length === 0 && !showForm && (
          <div className="bg-[#252b3d] rounded-lg p-8 text-center">
            <Megaphone className="text-gray-500 mx-auto mb-2" size={32} />
            <p className="text-gray-400">No announcements yet.</p>
            <p className="text-gray-500 text-sm mt-1">Create one to display a banner across the user interface.</p>
          </div>
        )}
        {announcements.map((a) => {
          const cfg = PRIORITY_CONFIG[a.priority] ?? PRIORITY_CONFIG.info;
          const Icon = cfg.icon;
          const isExpired = a.expiresAt && Date.parse(a.expiresAt) < Date.now();

          return (
            <div key={a.id} className={`bg-[#252b3d] rounded-lg overflow-hidden ${!a.active || isExpired ? 'opacity-60' : ''}`}>
              {/* Color accent bar */}
              <div className={`border-l-4 ${cfg.border} p-6`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg ${cfg.bg} flex-shrink-0`}>
                    <Icon className={cfg.iconColor} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm mb-2">{a.text}</p>
                    {a.linkUrl && (
                      <a href={a.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#00D9FF] text-xs hover:underline mb-2">
                        <ExternalLink size={12} />
                        {a.linkLabel || a.linkUrl}
                      </a>
                    )}
                    <div className="flex items-center flex-wrap gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock size={12} /> {formatRelativeTime(a.createdAt)}</span>
                      <span className={`px-2 py-0.5 rounded ${cfg.badgeBg} ${cfg.badgeText}`}>{cfg.label}</span>
                      <span className={`px-2 py-0.5 rounded ${a.active ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'}`}>
                        {a.active ? 'Active' : 'Inactive'}
                      </span>
                      {a.expiresAt && (
                        <span className={`px-2 py-0.5 rounded ${isExpired ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`}>
                          {isExpired ? 'Expired' : `Expires: ${new Date(a.expiresAt).toLocaleString()}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(a)}
                      disabled={togglingId === a.id}
                      className="text-gray-400 hover:text-white transition-colors p-1 disabled:opacity-50"
                      aria-label={a.active ? 'Deactivate' : 'Activate'}
                      title={a.active ? 'Deactivate' : 'Activate'}
                    >
                      {a.active ? <ToggleRight size={22} className="text-green-400" /> : <ToggleLeft size={22} />}
                    </button>
                    <button
                      onClick={() => startEdit(a)}
                      className="text-gray-400 hover:text-[#00D9FF] transition-colors p-1"
                      aria-label="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={deletingId === a.id}
                      className="text-gray-400 hover:text-red-400 transition-colors p-1 disabled:opacity-50"
                      aria-label="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
