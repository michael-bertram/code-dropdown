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

          // Trigger visual icon change state
          context.isCopied = true;

          // Revert icon back to normal after 2 seconds
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
      context.isCopied = false; // Initialized tracking variable
      context.completeText = context.isComplete ? '✓' : 'Mark as complete';
    },
  },
});