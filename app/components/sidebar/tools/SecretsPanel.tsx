import React, { useState, useEffect } from 'react';
import { SecretsList } from './SecretsList';
import { SecretEditor } from './SecretEditor';
import type { Secret } from '~/lib/.server/db/secrets';

export function SecretsPanel() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterService, setFilterService] = useState<string>('');

  // Load secrets on mount
  useEffect(() => {
    loadSecrets();
  }, []);

  const loadSecrets = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterService) params.append('service', filterService);

      const response = await fetch(`/api/db/secrets?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load secrets');
      }

      setSecrets(data.secrets || []);
      
      if (data.fallback) {
        setError('PostgreSQL not available. Using local storage.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load secrets');
      setSecrets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSecret = () => {
    setEditingSecret(null);
    setShowEditor(true);
  };

  const handleEditSecret = (secret: Secret) => {
    setEditingSecret(secret);
    setShowEditor(true);
  };

  const handleSaveSecret = async (secretData: Partial<Secret>) => {
    try {
      const formData = new FormData();
      formData.append('action', editingSecret ? 'update' : 'create');
      
      if (editingSecret) {
        formData.append('id', editingSecret.id);
      }

      Object.entries(secretData).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        }
      });

      const response = await fetch('/api/db/secrets', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save secret');
      }

      setShowEditor(false);
      loadSecrets();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save secret');
    }
  };

  const handleDeleteSecret = async (id: string) => {
    if (!confirm('Are you sure you want to delete this secret?')) return;

    try {
      const formData = new FormData();
      formData.append('action', 'delete');
      formData.append('id', id);

      const response = await fetch('/api/db/secrets', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete secret');
      }

      loadSecrets();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete secret');
    }
  };

  const handleCopySecret = (value: string) => {
    navigator.clipboard.writeText(value);
    // Show toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
    toast.textContent = 'Copied to clipboard!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const handleExportSecrets = () => {
    const data = JSON.stringify(secrets, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `infinity-secrets-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get unique services for filter
  const services = [...new Set(secrets.map(s => s.serviceName).filter(Boolean))];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search secrets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadSecrets()}
            className="w-full px-4 py-2 pl-10 bg-bolt-elements-background-depth-3 rounded-lg text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
          />
          <svg
            className="absolute left-3 top-2.5 w-4 h-4 text-bolt-elements-textTertiary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Filters and Actions */}
        <div className="flex gap-2">
          <select
            value={filterService}
            onChange={(e) => {
              setFilterService(e.target.value);
              loadSecrets();
            }}
            className="px-3 py-2 bg-bolt-elements-background-depth-3 rounded-lg text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
          >
            <option value="">All Services</option>
            {services.map(service => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>

          <button
            onClick={handleCreateSecret}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Secret
          </button>

          <button
            onClick={handleExportSecrets}
            className="p-2 rounded-lg hover:bg-bolt-elements-background-depth-3 transition-colors"
            title="Export Secrets"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-bolt-elements-textSecondary">Loading secrets...</div>
          </div>
        ) : (
          <SecretsList
            secrets={secrets}
            onEdit={handleEditSecret}
            onDelete={handleDeleteSecret}
            onCopy={handleCopySecret}
          />
        )}

        {/* Editor Modal */}
        {showEditor && (
          <div className="absolute inset-0 bg-bolt-elements-background-depth-2 z-10">
            <SecretEditor
              secret={editingSecret}
              onSave={handleSaveSecret}
              onClose={() => setShowEditor(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}