# SellFast Widget - Shadow DOM Implementation

This implementation provides a Shadow DOM-based web component for embedding the SellFast widget without using iframes.

## Features

- ✅ Shadow DOM encapsulation for style isolation
- ✅ Web Component standard (Custom Elements)
- ✅ No iframe dependency
- ✅ Responsive and customizable
- ✅ Event-based communication

## Usage

### Method 1: Using the Standalone Script

1. Include the script in your HTML:

```html
<script src="https://your-domain.com/sellfast-widget.js"></script>
```

2. Use the custom element:

```html
<sellfast-widget 
  url="https://your-domain.com/widget"
  height="800px"
  width="100%">
</sellfast-widget>
```

### Method 2: Using the TypeScript Component

If you're using TypeScript/React in your project:

```typescript
import '@/components/widget/SellFastWidget'

// Then use in your JSX/HTML:
<sellfast-widget 
  url="/widget"
  height="800px"
  width="100%">
</sellfast-widget>
```

### Method 3: WordPress Integration

Add to your WordPress theme's `functions.php`:

```php
function sellfast_widget_shortcode($atts) {
    $url = isset($atts['url']) ? esc_url($atts['url']) : 'https://your-domain.com/widget';
    $height = isset($atts['height']) ? esc_attr($atts['height']) : '800px';
    $width = isset($atts['width']) ? esc_attr($atts['width']) : '100%';
    
    // Enqueue the script
    wp_enqueue_script('sellfast-widget', 'https://your-domain.com/sellfast-widget.js', [], '1.0.0', true);
    
    return '<sellfast-widget url="' . $url . '" height="' . $height . '" width="' . $width . '"></sellfast-widget>';
}
add_shortcode('sellfast_widget', 'sellfast_widget_shortcode');
```

Then use in your content:
```
[sellfast_widget url="https://your-domain.com/widget" height="800px"]
```

## Attributes

- `url` (optional): The URL of the widget page. Defaults to `/widget` or the current origin + `/widget`
- `height` (optional): Height of the widget. Default: `800px`
- `width` (optional): Width of the widget. Default: `100%`

## Events

The component dispatches custom events:

- `widget-loaded`: Fired when the widget has finished loading
  ```javascript
  const widget = document.querySelector('sellfast-widget');
  widget.addEventListener('widget-loaded', (event) => {
    console.log('Widget loaded from:', event.detail.url);
  });
  ```

## Styling

The Shadow DOM provides style isolation, so the widget styles won't interfere with your page styles and vice versa. However, you can still style the host element:

```css
sellfast-widget {
  display: block;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Advantages over iframe

1. **Better Performance**: No separate document context
2. **Style Isolation**: Shadow DOM provides encapsulation
3. **Easier Communication**: Direct DOM access and events
4. **No CORS Issues**: Same-origin content loading
5. **Better SEO**: Content is part of the main document

## Notes

- The widget uses Shadow DOM for encapsulation
- All styles are scoped to the Shadow DOM
- The component is responsive by default
- Loading states are handled automatically

