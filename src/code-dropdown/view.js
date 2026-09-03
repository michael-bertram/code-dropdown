import { store, getContext, getElement } from '@wordpress/interactivity';

const STORAGE_KEY = 'wpe_tasks';

/**
 * Helper: Transforms raw explanation bullet points into structured HTML
 * cards with automatic inline code syntax highlighting (`variable` or functionName()).
 *
 * @param {string} text Raw response string from AI generator.
 * @return {string} Sanitized, structured HTML string for data-wp-html binding.
 */
function formatExplanationText(text) {
  if (!text) return '';

  const lines = text.split(/\n+/);
  const formattedItems = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // Strip leading bullet tokens (•, -, *, 1.)
      let cleanLine = line.replace(/^([•\-*\d.]+\s*)/, '');

      // Highlight backticked tokens and function calls like functionName()
      cleanLine = cleanLine.replace(/`([^`]+)`/g, '<code>$1</code>');
      cleanLine = cleanLine.replace(/\b([a-zA-Z0-9_]+\(\))/g, '<code>$1</code>');

      return `
        <div class="explanation-bullet-item">
          <span class="bullet-badge"></span>
          <div class="bullet-text">${cleanLine}</div>
        </div>
      `;
    });

  return formattedItems.join('');
}

const { state, actions } = store('wpe', {
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

    *toggleComplete() {
      const context = getContext();
      context.isComplete = !context.isComplete;
      context.completeText = context.isComplete ? '✓' : 'Mark as complete';

      state.tasks = {
        ...state.tasks,
        [context.id]: context.isComplete,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));

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
        // Silent catch for guest users
      }
    },

    /* ==========================================================================
       STEP 4: AI EXPLANATION DRAWER ACTIONS
       ========================================================================== */

    closeExplanation() {
      const context = getContext();
      context.isExplaining = false;
      context.explanationError = '';
    },

    *explainCode() {
      const context = getContext();

      // Toggle drawer off if already open with completed content
      if (context.isExplaining && context.explanationText && !context.isAnalyzingExplanation) {
        context.isExplaining = false;
        return;
      }

      context.isExplaining = true;

      // Serve cached explanation if available
      if (context.explanationText && !context.explanationError) {
        return;
      }

      context.isAnalyzingExplanation = true;
      context.explanationError = '';
      context.explanationText = '';
      context.formattedExplanationHtml = '';

      const payload = JSON.stringify({
        code: context.rawCodeText || '',
        language: context.codeLanguage || 'PHP',
      });

      let response = null;

      try {
        const directRes = yield fetch('/wp-json/code-dropdown/v1/explain-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
        if (directRes.ok) {
          response = yield directRes.json();
        }
      } catch (err) {
        // Fall through
      }

      if (!response) {
        try {
          const abilityRes = yield fetch('/wp-json/wp/v2/abilities/code-dropdown/explain-code/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
          });
          if (abilityRes.ok) {
            response = yield abilityRes.json();
          }
        } catch (err) {
          // Fall through
        }
      }

      if (response && response.explanation) {
        context.explanationText = response.explanation;
        context.formattedExplanationHtml = formatExplanationText(response.explanation);
        context.explanationError = '';
      } else {
        context.explanationError = 'Unable to generate code explanation right now.';
        context.explanationText = '';
        context.formattedExplanationHtml = '';
      }

      context.isAnalyzingExplanation = false;
    },

    /* ==========================================================================
       STEP 5: CODE PERSONALIZER ("ADAPT TO MY SETUP") ACTIONS
       ========================================================================== */

    handleCustomInstructionInput(e) {
      const context = getContext();
      context.userInstruction = e.target.value;
    },

    togglePersonalizeDrawer() {
      const context = getContext();
      context.isPersonalizing = !context.isPersonalizing;
    },

    *customizeCode() {
      const context = getContext();

      if (!context.userInstruction || !context.userInstruction.trim()) {
        context.personalizeError = 'Please enter your setup variables or instructions.';
        return;
      }

      context.isCustomizing = true;
      context.personalizeError = '';

      const payload = JSON.stringify({
        code: context.activeCodeText || context.rawCodeText || '',
        userInstruction: context.userInstruction,
        language: context.codeLanguage || 'PHP',
      });

      let response = null;

      try {
        const directRes = yield fetch('/wp-json/code-dropdown/v1/customize-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
        if (directRes.ok) {
          response = yield directRes.json();
        }
      } catch (err) {
        // Fall through
      }

      if (!response) {
        try {
          const abilityRes = yield fetch('/wp-json/wp/v2/abilities/code-dropdown/customize-code/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
          });
          if (abilityRes.ok) {
            response = yield abilityRes.json();
          }
        } catch (err) {
          // Fall through
        }
      }

      if (response && response.personalizedCode) {
        context.activeCodeText = response.personalizedCode;
        context.isPersonalized = true;
        context.isPersonalizing = false;
        context.userInstruction = '';
      } else {
        context.personalizeError = 'Unable to adapt code to your setup right now.';
      }

      context.isCustomizing = false;
    },

    resetCode() {
      const context = getContext();
      context.activeCodeText = context.rawCodeText;
      context.isPersonalized = false;
      context.personalizeError = '';
    },

    /* ==========================================================================
       CLIPBOARD UTILITY
       ========================================================================== */

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
      
      // Step 4 Explanation State Initialization
      context.isExplaining = false;
      context.isAnalyzingExplanation = false;
      context.explanationText = '';
      context.formattedExplanationHtml = '';
      context.explanationError = '';

      // Step 5 Personalizer State Initialization
      context.isPersonalizing = false;
      context.isCustomizing = false;
      context.isPersonalized = false;
      context.userInstruction = '';
      context.personalizeError = '';
      context.activeCodeText = context.rawCodeText || '';

      context.completeText = context.isComplete ? '✓' : 'Mark as complete';

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