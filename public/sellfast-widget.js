// Standalone SellFast Widget Script for Shadow DOM Embedding
// Include this script in your HTML to use the widget

(function() {
  'use strict';

  // Shadow DOM Web Component for SellFast Widget
  class SellFastWidget extends HTMLElement {
    constructor() {
      super();
      // Create Shadow DOM with open mode
      this.shadowRoot = this.attachShadow({ mode: 'open' });
      this.widgetUrl = this.getAttribute('url') || window.location.origin + '/widget';
    }

    connectedCallback() {
      this.render();
      this.loadWidget();
    }

    disconnectedCallback() {
      // Cleanup
      if (this.container) {
        this.container = null;
      }
    }

    static get observedAttributes() {
      return ['url', 'height', 'width'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue !== newValue) {
        if (name === 'url') {
          this.widgetUrl = newValue;
          this.loadWidget();
        } else {
          this.updateStyles();
        }
      }
    }

    render() {
      const height = this.getAttribute('height') || '800px';
      const width = this.getAttribute('width') || '100%';

      // Create container
      this.container = document.createElement('div');
      this.container.id = 'sellfast-widget-container';
      this.container.style.cssText = `
        width: ${width};
        height: ${height};
        position: relative;
        overflow: auto;
        border: none;
        background: #f9fafb;
      `;

      this.shadowRoot.appendChild(this.container);
      this.addStyles();
    }

    addStyles() {
      const style = document.createElement('style');
      style.textContent = `
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        
        #sellfast-widget-container {
          width: 100%;
          height: 100%;
          position: relative;
          overflow: auto;
          border: none;
          background: #f9fafb;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          isolation: isolate;
        }
        
        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          background: #f9fafb;
        }
        
        .loading-spinner {
          border: 4px solid #f3f4f6;
          border-top: 4px solid #F56A34;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        #sellfast-widget-container * {
          box-sizing: border-box;
        }
      `;
      this.shadowRoot.appendChild(style);
    }

    updateStyles() {
      if (this.container) {
        const height = this.getAttribute('height') || '800px';
        const width = this.getAttribute('width') || '100%';
        this.container.style.height = height;
        this.container.style.width = width;
      }
    }

    async loadWidget() {
      if (!this.container) return;

      // Show loading state
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading';
      loadingDiv.innerHTML = `
        <div class="loading-spinner"></div>
        <p style="margin-top: 16px; color: #6b7280; font-size: 14px;">Loading widget...</p>
      `;
      this.container.innerHTML = '';
      this.container.appendChild(loadingDiv);

      try {
        // Fetch the widget HTML content
        const response = await fetch(this.widgetUrl, {
          headers: {
            'Accept': 'text/html'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to load widget: ${response.status}`);
        }

        const html = await response.text();
        
        // Create a temporary container to parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract styles and inject into shadow root
        const styles = doc.querySelectorAll('style, link[rel="stylesheet"]');
        styles.forEach(style => {
          const styleClone = style.cloneNode(true);
          this.shadowRoot.appendChild(styleClone);
        });

        // Extract the main content
        const body = doc.body || doc.documentElement;
        const mainContent = body.querySelector('main, [role="main"], .widget-content') || body;
        
        // Inject content into container
        this.container.innerHTML = mainContent.innerHTML;

        // Load and execute scripts
        const scripts = doc.querySelectorAll('script');
        for (const script of scripts) {
          if (script.src) {
            // External script - load it
            await new Promise((resolve, reject) => {
              const newScript = document.createElement('script');
              newScript.src = script.src;
              newScript.onload = () => resolve();
              newScript.onerror = () => reject(new Error(`Failed to load script: ${script.src}`));
              // Append to shadow root for scoping
              this.shadowRoot.appendChild(newScript);
            });
          } else if (script.textContent) {
            // Inline script - execute in global context
            try {
              const newScript = document.createElement('script');
              newScript.textContent = script.textContent;
              this.shadowRoot.appendChild(newScript);
            } catch (e) {
              console.warn('Could not execute inline script:', e);
            }
          }
        }

        // Dispatch loaded event
        this.dispatchEvent(new CustomEvent('widget-loaded', {
          detail: { url: this.widgetUrl },
          bubbles: true,
          composed: true
        }));

      } catch (error) {
        console.error('Error loading widget:', error);
        if (this.container) {
          this.container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; text-align: center; color: #ef4444;">
              <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Failed to load widget</p>
              <p style="font-size: 12px; color: #6b7280;">${error.message || 'Unknown error'}</p>
              <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">Please check the widget URL: ${this.widgetUrl}</p>
            </div>
          `;
        }
      }
    }
  }

  // Register the custom element
  if (typeof window !== 'undefined' && !customElements.get('sellfast-widget')) {
    customElements.define('sellfast-widget', SellFastWidget);
  }

  // Export for module systems if needed
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SellFastWidget;
  }
  if (typeof window !== 'undefined') {
    window.SellFastWidget = SellFastWidget;
  }
})();

