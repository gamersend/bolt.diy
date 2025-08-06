import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { Secret } from '~/lib/.server/db/secrets';

interface SecretsListProps {
  secrets: Secret[];
  onEdit: (secret: Secret) => void;
  onDelete: (id: string) => void;
  onCopy: (value: string) => void;
}

export function SecretsList({ secrets, onEdit, onDelete, onCopy }: SecretsListProps) {
  const [showValues, setShowValues] = useState<Set<string>>(new Set());

  const toggleShowValue = (id: string) => {
    const newSet = new Set(showValues);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setShowValues(newSet);
  };

  const getKeyTypeIcon = (keyType: string) => {
    switch (keyType) {
      case 'api_key':
        return '🔑';
      case 'token':
        return '🎫';
      case 'password':
        return '🔒';
      case 'secret':
        return '🤫';
      default:
        return '📝';
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'production':
        return 'text-red-400 bg-red-500/20';
      case 'staging':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'development':
        return 'text-green-400 bg-green-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (secrets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-6xl mb-4">🔐</div>
        <div className="text-bolt-elements-textSecondary">
          <p className="text-lg font-semibold mb-2">No secrets yet</p>
          <p className="text-sm">Create your first secret to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 overflow-y-auto">
      {secrets.map((secret) => (
        <div
          key={secret.id}
          className="p-4 bg-gradient-to-r from-bolt-elements-background-depth-3 to-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor hover:border-purple-500/50 transition-all group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{getKeyTypeIcon(secret.keyType)}</span>
                <div>
                  <h3 className="font-semibold text-bolt-elements-textPrimary group-hover:text-purple-400 transition-colors">
                    {secret.name}
                  </h3>
                  {secret.serviceName && (
                    <p className="text-sm text-bolt-elements-textSecondary">
                      {secret.serviceName}
                    </p>
                  )}
                </div>
              </div>

              {secret.description && (
                <p className="text-sm text-bolt-elements-textSecondary mb-2">
                  {secret.description}
                </p>
              )}

              <div className="flex items-center gap-3 text-xs">
                <span className={`px-2 py-1 rounded-full ${getEnvironmentColor(secret.environment)}`}>
                  {secret.environment}
                </span>
                
                {!secret.isActive && (
                  <span className="px-2 py-1 rounded-full bg-gray-500/20 text-gray-400">
                    Inactive
                  </span>
                )}

                {secret.expiresAt && (
                  <span className={`px-2 py-1 rounded-full ${
                    new Date(secret.expiresAt) < new Date() 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {new Date(secret.expiresAt) < new Date() ? 'Expired' : 'Expires'} {formatDistanceToNow(new Date(secret.expiresAt), { addSuffix: true })}
                  </span>
                )}

                <span className="text-bolt-elements-textTertiary">
                  Updated {formatDistanceToNow(new Date(secret.updatedAt), { addSuffix: true })}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 font-mono text-sm bg-black/30 rounded px-3 py-2 flex items-center justify-between">
                  <span className={showValues.has(secret.id) ? '' : 'select-none'}>
                    {showValues.has(secret.id) 
                      ? secret.keyValue 
                      : '••••••••••••••••••••'}
                  </span>
                  <button
                    onClick={() => toggleShowValue(secret.id)}
                    className="ml-2 text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary"
                    title={showValues.has(secret.id) ? 'Hide' : 'Show'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showValues.has(secret.id) ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
                
                <button
                  onClick={() => onCopy(secret.keyValue)}
                  className="p-2 rounded hover:bg-bolt-elements-background-depth-3 transition-colors"
                  title="Copy"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-start gap-1">
              <button
                onClick={() => onEdit(secret)}
                className="p-2 rounded hover:bg-bolt-elements-background-depth-3 transition-colors"
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              
              <button
                onClick={() => onDelete(secret.id)}
                className="p-2 rounded hover:bg-red-500/20 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}