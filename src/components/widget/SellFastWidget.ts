// Shadow DOM Web Component for SellFast Widget
// This component uses Shadow DOM instead of iframe for better encapsulation
class SellFastWidget extends HTMLElement {
  private shadowRoot: ShadowRoot
  private widgetUrl: string
  private container: HTMLDivElement | null = null

  constructor() {
    super()
    // Create Shadow DOM with open mode to allow external styling if needed
    this.shadowRoot = this.attachShadow({ mode: 'open' })
    this.widgetUrl = this.getAttribute('url') || '/widget'
  }

  connectedCallback() {
    this.render()
    this.loadWidget()
  }

  disconnectedCallback() {
    // Cleanup if needed
    if (this.container) {
      this.container = null
    }
  }

  static get observedAttributes() {
    return ['url', 'height', 'width']
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      if (name === 'url') {
        this.widgetUrl = newValue
        this.loadWidget()
      } else {
        this.updateStyles()
      }
    }
  }

  private render() {
    const height = this.getAttribute('height') || '800px'
    const width = this.getAttribute('width') || '100%'

    // Create container
    this.container = document.createElement('div')
    this.container.id = 'sellfast-widget-container'
    this.container.style.cssText = `
      width: ${width};
      height: ${height};
      position: relative;
      overflow: auto;
      border: none;
      background: #f9fafb;
    `

    this.shadowRoot.appendChild(this.container)

    // Add styles to shadow DOM
    this.addStyles()
  }

  private addStyles() {
    const style = document.createElement('style')
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
      
      /* Loading state */
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

      /* Ensure all content is scoped */
      #sellfast-widget-container * {
        box-sizing: border-box;
      }
    `
    this.shadowRoot.appendChild(style)
  }

  private updateStyles() {
    if (this.container) {
      const height = this.getAttribute('height') || '800px'
      const width = this.getAttribute('width') || '100%'
      this.container.style.height = height
      this.container.style.width = width
    }
  }

  private async loadWidget() {
    if (!this.container) return

    // Show loading state
    const loadingDiv = document.createElement('div')
    loadingDiv.className = 'loading'
    loadingDiv.innerHTML = `
      <div class="loading-spinner"></div>
      <p style="margin-top: 16px; color: #6b7280; font-size: 14px;">Loading widget...</p>
    `
    this.container.innerHTML = ''
    this.container.appendChild(loadingDiv)

    try {
      // Fetch the widget page
      const response = await fetch(this.widgetUrl, {
        headers: {
          'Accept': 'text/html'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load widget: ${response.status}`)
      }

      const html = await response.text()
      
      // Create a temporary container to parse the HTML
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html

      // Extract the main content (body content)
      const bodyContent = tempDiv.querySelector('body') || tempDiv
      
      // Extract and inject styles
      const styles = tempDiv.querySelectorAll('style, link[rel="stylesheet"]')
      styles.forEach(style => {
        const styleClone = style.cloneNode(true) as HTMLElement
        this.shadowRoot.appendChild(styleClone)
      })

      // Extract scripts and execute them
      const scripts = tempDiv.querySelectorAll('script')
      const scriptPromises: Promise<void>[] = []
      
      scripts.forEach(script => {
        if (script.src) {
          // External script
          const scriptPromise = new Promise<void>((resolve, reject) => {
            const newScript = document.createElement('script')
            newScript.src = script.src
            newScript.onload = () => resolve()
            newScript.onerror = () => reject(new Error(`Failed to load script: ${script.src}`))
            this.shadowRoot.appendChild(newScript)
          })
          scriptPromises.push(scriptPromise)
        } else {
          // Inline script - execute in global context but scoped
          try {
            // Create a new script element in the shadow root
            const newScript = document.createElement('script')
            newScript.textContent = script.textContent || ''
            this.shadowRoot.appendChild(newScript)
          } catch (e) {
            console.warn('Could not execute inline script:', e)
          }
        }
      })

      // Wait for all scripts to load
      await Promise.all(scriptPromises)

      // Inject the body content into our container
      this.container.innerHTML = bodyContent.innerHTML

      // Re-initialize any React components if needed
      // Note: This is a simplified approach. For full React support, you'd need
      // to use React's hydrate/render methods
      this.initializeWidget()

    } catch (error) {
      console.error('Error loading widget:', error)
      if (this.container) {
        this.container.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; text-align: center; color: #ef4444;">
            <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Failed to load widget</p>
            <p style="font-size: 12px; color: #6b7280;">${error instanceof Error ? error.message : 'Unknown error'}</p>
            <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">Please check the widget URL: ${this.widgetUrl}</p>
          </div>
        `
      }
    }
  }

  private initializeWidget() {
    // This method can be used to initialize any widget-specific functionality
    // For React components, you would need to use ReactDOM.render or hydrate here
    // For now, the content is loaded as static HTML
    
    // Dispatch a custom event to notify that widget is loaded
    this.dispatchEvent(new CustomEvent('widget-loaded', {
      detail: { url: this.widgetUrl },
      bubbles: true,
      composed: true
    }))
  }
}

// Register the custom element
if (typeof window !== 'undefined' && !customElements.get('sellfast-widget')) {
  customElements.define('sellfast-widget', SellFastWidget)
}

export default SellFastWidget
