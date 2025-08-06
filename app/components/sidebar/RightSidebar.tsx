import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DbNotesPanel } from './tools/DbNotesPanel';
import { SecretsPanel } from './tools/SecretsPanel';
import { useUI } from '~/contexts/UIContext';
import { Database } from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  icon: React.ReactNode;
  component: React.ComponentType | null;
  action?: () => void;
}

export function RightSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const { toggleDbModal } = useUI();

  const tools: Tool[] = [
    {
      id: 'notes',
      name: 'Notes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      component: DbNotesPanel,
    },
    {
      id: 'secrets',
      name: 'Secrets',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      component: SecretsPanel,
    },
    {
      id: 'database',
      name: 'Database',
      icon: <Database className="w-5 h-5" />,
      component: null,
      action: () => {
        setIsOpen(false); // Close sidebar when opening database modal
        toggleDbModal();
      },
    },
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
    if (!isOpen && !activeTool && tools.length > 0) {
      // Auto-select first tool when opening
      setActiveTool(tools[0].id);
    }
  };

  const ActiveToolComponent = activeTool 
    ? tools.find(t => t.id === activeTool && t.component)?.component 
    : null;

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleSidebar}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 shadow-2xl flex items-center justify-center text-white hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-110 ${
          isOpen ? 'hidden' : ''
        }`}
        title="Open Infinity Tools"
      >
        <span className="text-2xl font-bold">∞</span>
      </motion.button>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            />

            {/* Sidebar Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full sm:w-96 bg-gradient-to-b from-bolt-elements-background-depth-2 to-bolt-elements-background-depth-1 border-l border-purple-500/30 shadow-2xl z-40 flex flex-col backdrop-blur-lg"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-bolt-elements-borderColor">
                <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur"></div>
                  <h2 className="relative text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Infinity Tools</h2>
                </div>
                <span className="text-2xl">∞</span>
              </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-bolt-elements-background-depth-3 transition-colors"
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tool Tabs */}
              <div className="flex gap-2 p-4 border-b border-purple-500/30 overflow-x-auto bg-gradient-to-r from-purple-900/10 to-pink-900/10">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      if (tool.action) {
                        tool.action();
                      } else {
                        setActiveTool(tool.id);
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap transform hover:scale-105 ${
                      activeTool === tool.id && !tool.action
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'hover:bg-white/10 text-bolt-elements-textSecondary hover:text-white'
                    }`}
                    title={tool.name}
                  >
                    {tool.icon}
                    <span className="text-sm font-medium">{tool.name}</span>
                  </button>
                ))}
              </div>

              {/* Tool Content */}
              <div className="flex-1 overflow-hidden">
                {ActiveToolComponent && <ActiveToolComponent />}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}