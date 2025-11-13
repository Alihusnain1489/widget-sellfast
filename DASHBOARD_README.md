# SellFast Dashboard - WordPress Integration Guide

This guide explains how to embed the SellFast dashboards in WordPress.

## Available Dashboards

### 1. **Main Dashboard** (`/dashboard`)
- Overview of user's listings
- Quick stats and actions
- Recent listings

### 2. **Admin Dashboard** (`/dashboard/admin`)
- Manage all listings
- Approve/reject listings
- Manage categories, brands, items, specifications
- User management

### 3. **My Listings** (`/dashboard/listings`)
- View all user's listings
- Edit/Delete listings
- View listing status

### 4. **Profile** (`/dashboard/profile`)
- Update user profile
- Change account information

## Embedding in WordPress

### Method 1: Using iframe (Recommended)

#### Main Dashboard
```html
<iframe 
  src="https://your-domain.com/dashboard" 
  width="100%" 
  height="800px" 
  frameborder="0" 
  scrolling="auto"
  style="border: none;">
</iframe>
```

#### Admin Dashboard
```html
<iframe 
  src="https://your-domain.com/dashboard/admin" 
  width="100%" 
  height="900px" 
  frameborder="0" 
  scrolling="auto"
  style="border: none;">
</iframe>
```

#### My Listings
```html
<iframe 
  src="https://your-domain.com/dashboard/listings" 
  width="100%" 
  height="800px" 
  frameborder="0" 
  scrolling="auto"
  style="border: none;">
</iframe>
```

#### Profile Page
```html
<iframe 
  src="https://your-domain.com/dashboard/profile" 
  width="100%" 
  height="600px" 
  frameborder="0" 
  scrolling="auto"
  style="border: none;">
</iframe>
```

### Method 2: WordPress Shortcode

Add this to your `functions.php`:

```php
function sellfast_dashboard_shortcode($atts) {
    $type = isset($atts['type']) ? $atts['type'] : 'main';
    $height = isset($atts['height']) ? $atts['height'] : '800px';
    $url = isset($atts['url']) ? $atts['url'] : 'https://your-domain.com';
    
    $routes = [
        'main' => '/dashboard',
        'admin' => '/dashboard/admin',
        'listings' => '/dashboard/listings',
        'profile' => '/dashboard/profile',
    ];
    
    $route = isset($routes[$type]) ? $routes[$type] : $routes['main'];
    $fullUrl = esc_url($url . $route);
    
    return '<iframe 
        src="' . $fullUrl . '" 
        width="100%" 
        height="' . esc_attr($height) . '" 
        frameborder="0" 
        scrolling="auto"
        style="border: none;">
    </iframe>';
}
add_shortcode('sellfast_dashboard', 'sellfast_dashboard_shortcode');
```

**Usage in WordPress:**
```
[sellfast_dashboard type="main" height="800px"]
[sellfast_dashboard type="admin" height="900px"]
[sellfast_dashboard type="listings" height="800px"]
[sellfast_dashboard type="profile" height="600px"]
```

### Method 3: WordPress Admin Menu Integration

Add this to your `functions.php` to add dashboard links to WordPress admin:

```php
function sellfast_add_admin_menu() {
    add_menu_page(
        'SellFast Dashboard',
        'SellFast',
        'manage_options',
        'sellfast-dashboard',
        'sellfast_dashboard_page',
        'dashicons-store',
        30
    );
    
    add_submenu_page(
        'sellfast-dashboard',
        'Admin Panel',
        'Admin Panel',
        'manage_options',
        'sellfast-admin',
        'sellfast_admin_page'
    );
    
    add_submenu_page(
        'sellfast-dashboard',
        'My Listings',
        'My Listings',
        'read',
        'sellfast-listings',
        'sellfast_listings_page'
    );
}
add_action('admin_menu', 'sellfast_add_admin_menu');

function sellfast_dashboard_page() {
    $url = 'https://your-domain.com/dashboard';
    echo '<div style="margin: 20px 0;">
        <iframe src="' . esc_url($url) . '" width="100%" height="800px" frameborder="0" style="border: none;"></iframe>
    </div>';
}

function sellfast_admin_page() {
    $url = 'https://your-domain.com/dashboard/admin';
    echo '<div style="margin: 20px 0;">
        <iframe src="' . esc_url($url) . '" width="100%" height="900px" frameborder="0" style="border: none;"></iframe>
    </div>';
}

function sellfast_listings_page() {
    $url = 'https://your-domain.com/dashboard/listings';
    echo '<div style="margin: 20px 0;">
        <iframe src="' . esc_url($url) . '" width="100%" height="800px" frameborder="0" style="border: none;"></iframe>
    </div>';
}
```

## Authentication

All dashboards require user authentication. Users will be redirected to login if not authenticated.

### Login Flow:
1. User clicks on dashboard link
2. If not logged in, redirected to `/login?redirect=/dashboard`
3. After login, redirected back to the requested dashboard

### Admin Access:
- Admin dashboard (`/dashboard/admin`) requires `ADMIN` role
- Non-admin users will be redirected to main dashboard

## Dashboard Features

### Main Dashboard (`/dashboard`)
- **Stats Cards**: Total, Active, and Pending listings
- **Quick Actions**: Create listing, Admin panel (if admin), My listings, Profile
- **Recent Listings**: Last 5 listings with status

### Admin Dashboard (`/dashboard/admin`)
- **Overview Stats**: Total listings, pending approvals, active listings, total users
- **Quick Links**:
  - Manage Listings
  - Categories
  - Brands
  - Items/Models
  - Specifications
  - Users

### My Listings (`/dashboard/listings`)
- **List View**: All user's listings
- **Status Badges**: Active, Pending, Sold
- **Actions**: Delete listings
- **Create Button**: Quick link to create new listing

### Profile (`/dashboard/profile`)
- **Edit Form**: Name, Email, Phone
- **Save Changes**: Updates user profile
- **Auto-sync**: Updates localStorage after save

## Styling

Dashboards are designed with:
- Fixed height containers for iframe embedding
- Responsive design (mobile-friendly)
- Scrollable content areas
- Consistent color scheme: `#F56A34` (primary orange)

## Security Considerations

1. **Authentication**: All dashboards check for valid JWT token
2. **Role-based Access**: Admin routes check for ADMIN role
3. **CORS**: Ensure proper CORS headers if embedding from different domain
4. **X-Frame-Options**: May need to adjust server headers to allow iframe embedding

## Troubleshooting

### Dashboard not loading in iframe
- Check X-Frame-Options header on your server
- Verify CORS settings if embedding from different domain
- Check browser console for errors

### Authentication issues
- Verify JWT_SECRET is set correctly
- Check that cookies are enabled
- Ensure API routes are accessible

### Admin access denied
- Verify user has ADMIN role in database
- Check user permissions in localStorage
- Clear browser cache and re-login

## Customization

You can customize dashboard URLs by:
1. Creating custom routes in Next.js
2. Adding query parameters for filtering
3. Modifying the dashboard components

Example with filters:
```html
<iframe src="https://your-domain.com/dashboard/listings?status=ACTIVE"></iframe>
```

## Support

For issues or questions, check:
- API documentation
- Widget README
- Next.js logs
- Browser console errors

