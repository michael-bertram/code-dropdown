import { store, getContext, getElement } from '@wordpress/interactivity';

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
    /**
     * Accordion open/close toggle
     */
    toggleOpen() {
      const context = getContext();
      context.isOpen = !context.isOpen;
      context.toggleText = context.isOpen ? context.closeText : context.openText;
    },

    /**
     * Step 3: Persistent Completion Toggle
     * Syncs state instantly in localStorage and asynchronously with WordPress user_meta via REST API.
     */
    *toggleComplete() {
      const context = getContext();
      context.isComplete = !context.isComplete;
      context.completeText = context.isComplete ? '✓' : 'Mark as complete';

      // 1. Optimistic Local Update
      state.tasks = {
        ...state.tasks,
        [context.id]: context.isComplete,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));

      // 2. Server-Side Persistence for Authenticated Users
      try {
        yield fetch('/wp-json/code-dropdown/v1/toggle-complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': window.wpApiSettings?.nonce || '',
          },
          body: JSON.stringify({
            block_id: context.id,
            status: context.isComplete,
          }),
        });
      } catch (err) {
        // Silent catch: falls back safely to localStorage for guests/offline states
      }
    },

    /**
     * Clipboard Copy Action
     */
    async copyToClipboard() {
      const context = getContext();
      const { ref: buttonElement } = getElement();
      const blockElement = buttonElement.closest('[data-wp-interactive="wpe"]');
      const contentContainer = blockElement?.querySelector('.panel-content');

      if (contentContainer) {
        try {
          const textToCopy = contentContainer.textContent || contentContainer.innerText;
          const cleanedText = textToCopy.trim();

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

          context.isCopied = true;
          setTimeout(() => {
            context.isCopied = false;
          }, 2000);

        } catch (err) {
          console.error('Failed to copy text: ', err);
        }
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
      context.isCopied = false;
      context.completeText = context.isComplete ? '✓' : 'Mark as complete';

      // Parse highlight line ranges (e.g. "3, 5-8") into active line indexes
      if (context.highlightLines) {
        const targetLines = new Set();
        const ranges = context.highlightLines.split(',');

        ranges.forEach((range) => {
          const parts = range.split('-').map((num) => parseInt(num.trim(), 10));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            for (let i = parts[0]; i <= parts[1]; i++) targetLines.add(i);
          } else if (parts.length === 1 && !isNaN(parts[0])) {
            targetLines.add(parts[0]);
          }
        });

        context.highlightedNumbers = Array.from(targetLines);
      }
    },
  },
});