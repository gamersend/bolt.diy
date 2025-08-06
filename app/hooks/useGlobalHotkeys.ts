import { useEffect } from 'react';
import { useUI } from '~/contexts/UIContext';

export function useGlobalHotkeys() {
  const { toggleDbModal, setShowDbModal } = useUI();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd/Ctrl + Shift + D - Toggle Database Modal
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        toggleDbModal();
      }
      
      // ESC - Close Database Modal
      if (event.key === 'Escape') {
        // Only close if no input/textarea is focused
        const activeElement = document.activeElement;
        const isInputFocused = activeElement?.tagName === 'INPUT' || 
                              activeElement?.tagName === 'TEXTAREA' ||
                              activeElement?.getAttribute('contenteditable') === 'true';
        
        if (!isInputFocused) {
          setShowDbModal(false);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleDbModal, setShowDbModal]);
}