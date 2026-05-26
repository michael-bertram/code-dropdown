import { store, getContext, getElement } from '@wordpress/interactivity'; // Added getElement

const STORAGE_KEY = 'wpe_tasks';

const { state } = store('wpe', {
  state: {
    currentlyOpenId: null,
    registeredIds: [],
    tasks: {},
    _storageLoaded: false,

    get totalTasks() {
      return state.registeredIds.length;
    },
    get completedTasks() {
      return state.registeredIds.filter((id) => state.tasks[id]).length;
    },
    get progressPercent() {
      if (state.totalTasks === 0) return 0;
      return Math.round((state.completedTasks / state.totalTasks) * 100);
    },
    get progressBarStyle() {
      return `width: ${state.progressPercent}%; background-color: #4caf50; transition: width 0.5s ease;`;
    },
    get isAllDone() {
      return state.totalTasks > 0 && state.completedTasks === state.totalTasks;
    },
  },

  actions: {
    toggleOpen() {
      const context = getContext();
      context.isOpen = !context.isOpen;
      context.toggleText = context.isOpen ? context.closeText : context.openText;
    },

    toggleComplete() {
      const context = getContext();
      context.isComplete = !context.isComplete;
      context.completeText = context.isComplete ? '✓' : 'Mark as complete'; // Kept cohesive with init

      state.tasks = {
        ...state.tasks,
        [context.id]: context.isComplete,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    },

    /**
     * Copy function utilizing Interactivity API's getElement()
     */
    async copyToClipboard() {
      // DEBUG LOG 1: Check if the action is firing at all
      console.log('1. copyToClipboard action triggered!');
      
      const context = getContext();
      console.log('Current context state:', context);
      
      try {
        const { ref: buttonElement } = getElement();
        console.log('2. Clicked Button Element:', buttonElement);
        
        const blockElement = buttonElement.closest('[data-wp-interactive="wpe"]');
        console.log('3. Found Parent Block Wrapper:', blockElement);
        
        // Let's look for your actual content area
        const contentContainer = blockElement?.querySelector('.panel-content');
        console.log('4. Target Content Container:', contentContainer);

        if (!contentContainer) {
          console.error('CRITICAL: .panel-content was not found in the DOM.');
          return;
        }

        const textToCopy = contentContainer.textContent || contentContainer.innerText;
        const cleanedText = textToCopy.trim();
        console.log('5. Text extracted for copying:', cleanedText);

        // Clipboard operations
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(cleanedText);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = cleanedText;
          textarea.style.position = 'fixed';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }

        // Change UI text
        console.log('6. Attempting to change context.copyText to "Copied!"');
        const originalText = context.copyText || 'Copy';
        context.copyText = 'Copied!';

        setTimeout(() => {
          context.copyText = originalText;
          console.log('7. Resetting copy text back to:', originalText);
        }, 2000);

      } catch (err) {
        console.error('An error occurred during execution:', err);
      }
    },
  },

  callbacks: {
    initShared() {
      if (!state._storageLoaded) {
        state.tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        state._storageLoaded = true;
      }
    },

    initTask() {
      const context = getContext();
      if (!context.id) return;

      if (!state._storageLoaded) {
        state.tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        state._storageLoaded = true;
      }

      if (!state.registeredIds.includes(context.id)) {
        state.registeredIds = [...state.registeredIds, context.id];
      }

      context.isComplete = state.tasks[context.id] ?? false;
      context.copyText = 'Copy';
      context.completeText = context.isComplete ? '✓' : 'Mark as complete';
    },
  },
});