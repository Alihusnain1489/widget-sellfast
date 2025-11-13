# SellFast Widget - Embeddable Listing Widget

A full-featured, embeddable multi-step listing widget for WordPress and other platforms.

## Features

- ✅ Multi-step form (Category → Brand → Model → Specifications → Location → Review)
- ✅ Zustand state management with localStorage persistence
- ✅ JWT-based authentication
- ✅ Google Maps integration for location
- ✅ Image upload (up to 10 images, 1MB each)
- ✅ Responsive design optimized for iframe embedding
- ✅ Fixed height layout (100vh) for seamless embedding

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file:

```env
DATABASE_URL="your_mongodb_connection_string"
JWT_SECRET="your_jwt_secret_key"
NEXT_PUBLIC_GOOGLE_API_KEY="your_google_maps_api_key"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Push schema to database
npm run prisma:push

# (Optional) Seed initial data
npm run seed
```

### 4. Run Development Server

```bash
npm run dev
```

The widget will be available at: `http://localhost:3000/widget`

## Embedding in WordPress

### Method 1: Using iframe (Recommended)

Add this code to your WordPress page/post:

```html
<iframe 
  src="https://your-domain.com/widget" 
  width="100%" 
  height="800px" 
  frameborder="0" 
  scrolling="no"
  style="border: none; overflow: hidden;">
</iframe>
```

### Method 2: WordPress Shortcode

Add this to your `functions.php`:

```php
function sellfast_widget_shortcode($atts) {
    $height = isset($atts['height']) ? $atts['height'] : '800px';
    $url = isset($atts['url']) ? $atts['url'] : 'https://your-domain.com/widget';
    
    return '<iframe 
        src="' . esc_url($url) . '" 
        width="100%" 
        height="' . esc_attr($height) . '" 
        frameborder="0" 
        scrolling="no"
        style="border: none; overflow: hidden;">
    </iframe>';
}
add_shortcode('sellfast_widget', 'sellfast_widget_shortcode');
```

Then use in your content:
```
[sellfast_widget height="800px"]
```

### Method 3: Category-Specific Widget

To pre-select a category:

```html
<iframe 
  src="https://your-domain.com/widget?category=Laptops" 
  width="100%" 
  height="800px" 
  frameborder="0" 
  scrolling="no">
</iframe>
```

Available categories:
- `Laptops`
- `Mobiles`
- `Tablets`
- `Smartwatches`

## API Endpoints

The widget uses the following API endpoints:

- `GET /api/categories` - Fetch all categories
- `GET /api/companies?category={category}` - Fetch brands by category
- `GET /api/items?companyId={id}&category={category}` - Fetch models/items
- `GET /api/items?itemId={id}` - Fetch item specifications
- `GET /api/specifications` - Fetch specifications
- `POST /api/listings/create` - Create a new listing (requires auth)
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration

## Widget Flow

1. **Category Selection** - User selects a category (Laptops, Mobiles, etc.)
2. **Brand Selection** - User selects a brand/company
3. **Model Selection** - User selects a specific device model
4. **Specifications** - User fills in device specifications (dynamic based on model)
5. **Photos & Location** - User uploads photos and sets location (manual or auto-detect)
6. **Review & Submit** - User reviews and submits the listing

## State Management

The widget uses Zustand for state management with localStorage persistence. The store automatically saves progress, so users can resume their listing if they navigate away.

## Authentication

Users must be authenticated to submit listings. The widget will:
1. Show a login modal when attempting to submit without authentication
2. Save progress before redirecting to login/signup
3. Restore progress after successful authentication

## Styling

The widget is designed with:
- Fixed height (100vh) for iframe embedding
- Responsive design (mobile-friendly)
- Tailwind CSS for styling
- Custom color scheme: `#F56A34` (primary orange)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Widget not loading in iframe
- Ensure your server allows iframe embedding (check X-Frame-Options header)
- Verify CORS settings if embedding from different domain

### Location not working
- Check that `NEXT_PUBLIC_GOOGLE_API_KEY` is set correctly
- Verify Google Maps API has Geocoding API enabled
- Check browser console for API errors

### Authentication issues
- Verify JWT_SECRET is set in environment variables
- Check that cookies are enabled in the browser
- Ensure API routes are accessible

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Start production server:
```bash
npm start
```

3. Configure your reverse proxy (nginx/Apache) to:
   - Allow iframe embedding
   - Set proper CORS headers if needed
   - Handle SSL/TLS

## License

[Your License Here]

