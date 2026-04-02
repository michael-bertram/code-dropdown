import { store, getContext } from '@wordpress/interactivity';

const STORAGE_KEY = 'wpe_tasks';

const { state } = store('wpe', {
  state: {
    currentlyOpenId: null,
    registeredIds: [], // all task IDs on the page
    tasks: {}, // completed state per ID

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
      context.completeText = context.isComplete ? '✓' : 'Done';

      state.tasks = {
        ...state.tasks,
        [context.id]: context.isComplete,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
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
      requestAnimationFrame(() => {
        const context = getContext();
        if (!context.id) return;

        if (!state._storageLoaded) {
          state.tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
          state._storageLoaded = true;
        }

        // Register this task ID if not already tracked
        if (!state.registeredIds.includes(context.id)) {
          state.registeredIds = [...state.registeredIds, context.id];
        }

        context.isComplete = state.tasks[context.id] ?? false;
        context.completeText = context.isComplete ? 'Completed' : 'Mark as complete';
        context.toggleText = context.isOpen ? context.closeText : context.openText;
      });
    },
  },
});
