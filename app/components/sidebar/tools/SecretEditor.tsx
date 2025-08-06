import React, { useState } from 'react';
import type { Secret } from '~/lib/.server/db/secrets';

interface SecretEditorProps {
  secret: Secret | null;
  onSave: (secret: Partial<Secret>) => void;
  onClose: () => void;
}

const KEY_TYPES = [
  { value: 'api_key', label: 'API Key', icon: '🔑' },
  { value: 'token', label: 'Token', icon: '🎫' },
  { value: 'password', label: 'Password', icon: '🔒' },
  { value: 'secret', label: 'Secret', icon: '🤫' },
  { value: 'certificate', label: 'Certificate', icon: '📜' },
  { value: 'webhook', label: 'Webhook', icon: '🪝' },
  { value: 'other', label: 'Other', icon: '📝' },
];

const ENVIRONMENTS = [
  { value: 'development', label: 'Development', color: 'green' },
  { value: 'staging', label: 'Staging', color: 'yellow' },
  { value: 'production', label: 'Production', color: 'red' },
  { value: 'test', label: 'Test', color: 'blue' },
];

const COMMON_SERVICES = [
  'OpenAI', 'GitHub', 'AWS', 'Google Cloud', 'Azure', 'Stripe', 
  'SendGrid', 'Twilio', 'Slack', 'Discord', 'Anthropic', 'Custom'
];

export function SecretEditor({ secret, onSave, onClose }: SecretEditorProps) {
  const [formData, setFormData] = useState({
    name: secret?.name || '',
    keyType: secret?.keyType || 'api_key',
    keyValue: secret?.keyValue || '',
    description: secret?.description || '',
    serviceName: secret?.serviceName || '',
    environment: secret?.environment || 'development',
    expiresAt: secret?.expiresAt ? secret.expiresAt.split('T')[0] : '',
    isActive: secret?.isActive ?? true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.keyValue.trim()) newErrors.keyValue = 'Value is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      ...formData,
      expiresAt: formData.expiresAt || undefined,
    });
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    for (let i = 0; i < 32; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, keyValue: password });
  };

  return (
    <div className="h-full flex flex-col bg-bolt-elements-background-depth-2">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-bolt-elements-borderColor">
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary">
            {secret ? 'Edit Secret' : 'New Secret'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-bolt-elements-background-depth-3 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 rounded-lg text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Production API Key"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Type and Service Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={formData.keyType}
                onChange={(e) => setFormData({ ...formData, keyType: e.target.value })}
                className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 rounded-lg text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {KEY_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Service */}
            <div>
              <label className="block text-sm font-medium mb-2">Service</label>
              <input
                type="text"
                list="services"
                value={formData.serviceName}
                onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 rounded-lg text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., OpenAI"
              />
              <datalist id="services">
                {COMMON_SERVICES.map(service => (
                  <option key={service} value={service} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Value */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Value <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.keyValue}
                onChange={(e) => setFormData({ ...formData, keyValue: e.target.value })}
                className="w-full px-3 py-2 pr-20 bg-bolt-elements-background-depth-3 rounded-lg text-bolt-elements-textPrimary font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter secret value"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                {formData.keyType === 'password' && (
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="p-1.5 hover:bg-bolt-elements-background-depth-2 rounded transition-colors"
                    title="Generate password"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 hover:bg-bolt-elements-background-depth-2 rounded transition-colors"
                  title={showPassword ? 'Hide' : 'Show'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
            {errors.keyValue && <p className="text-red-500 text-sm mt-1">{errors.keyValue}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 rounded-lg text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
              placeholder="Optional description for this secret"
            />
          </div>

          {/* Environment and Expiry Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Environment */}
            <div>
              <label className="block text-sm font-medium mb-2">Environment</label>
              <select
                value={formData.environment}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 rounded-lg text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {ENVIRONMENTS.map(env => (
                  <option key={env.value} value={env.value}>
                    {env.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-sm font-medium mb-2">Expires On</label>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 rounded-lg text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Active Status */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-5 h-5 rounded text-purple-500 focus:ring-purple-500"
            />
            <span className="text-sm font-medium">Active</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-bolt-elements-borderColor">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
          >
            {secret ? 'Update Secret' : 'Create Secret'}
          </button>
        </div>
      </form>
    </div>
  );
}