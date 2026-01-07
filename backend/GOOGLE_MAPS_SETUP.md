# Google Maps API Setup Guide

## Step 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Click "Select a Project" → "New Project"
3. Project name: `campus-issue-reporter`
4. Click "Create"

## Step 2: Enable Required APIs

1. Go to "APIs & Services" → "Library"
2. Search and enable these APIs:
   - **Maps JavaScript API**
   - **Places API** (optional, for location search)
   - **Geocoding API** (optional, for address lookup)

## Step 3: Create API Key

1. Go to "APIs & Services" → "Credentials"
2. Click "+ CREATE CREDENTIALS" → "API key"
3. Copy the API key
4. Click "Edit API key" (pencil icon)

## Step 4: Restrict API Key (IMPORTANT for Security)

### Application Restrictions:
- Select "HTTP referrers (web sites)"
- Add referrers:
```
  http://localhost:*
  http://127.0.0.1:*
  https://yourdomain.com/*
```

### API Restrictions:
- Select "Restrict key"
- Check these APIs:
  - Maps JavaScript API
  - Places API
  - Geocoding API

Click "Save"

## Step 5: Add API Key to Project

Update `index.html`:
```html
<!-- Replace YOUR_GOOGLE_MAPS_API_KEY with actual key -->
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_ACTUAL_API_KEY&libraries=visualization&callback=initMap" async defer></script>
```

## Step 6: Configure Campus Location

Update `js/map.js`:
```javascript
// Replace with your campus coordinates
const CAMPUS_CENTER = { 
  lat: 13.0827,  // Your campus latitude
  lng: 80.2707   // Your campus longitude
};
```

### How to Find Your Campus Coordinates:

1. Go to https://www.google.com/maps
2. Search for your campus
3. Right-click on campus location
4. Click on coordinates (they'll be copied)
5. Use these in `CAMPUS_CENTER`

## Step 7: Enable Billing (Required for Maps API)

1. Go to "Billing" in Cloud Console
2. Link a billing account
3. Set up budget alerts (recommended: $50/month)

**Note:** Google provides $200 free credit per month

## Step 8: Monitor Usage

1. Go to "APIs & Services" → "Dashboard"
2. Click on "Maps JavaScript API"
3. View quotas and usage

## Pricing Information

**Maps JavaScript API:**
- 0-100,000 loads/month: FREE
- After 100,000: $7 per 1,000 loads

**Typical campus app usage:** ~1,000-5,000 loads/month (FREE)

## Testing Maps Integration

Open your web app and check browser console:
```javascript
// Should see:
"Map initialized successfully"
"Loaded X issues"
```

## Common Issues

### Issue: "This page can't load Google Maps correctly"
**Solution:** 
- Check API key is correct in index.html
- Verify billing is enabled
- Check API restrictions allow your domain

### Issue: Heatmap not showing
**Solution:**
- Make sure `&libraries=visualization` is in script URL
- Check there are issues in database to display

### Issue: "RefererNotAllowedMapError"
**Solution:**
- Add your domain to API key restrictions
- For localhost, add `http://localhost:*`

## Production Deployment

Before deploying:

1. Update API key restrictions with production domain
2. Remove localhost from allowed referrers
3. Enable additional security with:
   - API key rotation (monthly)
   - Cloud Armor (DDoS protection)
   - Usage limits per user

## Map Customization Options

You can customize the map appearance in `js/map.js`:
```javascript
// Custom map styles (dark mode example)
styles: [
  {
    featureType: "all",
    elementType: "geometry",
    stylers: [{ color: "#242f3e" }]
  },
  {
    featureType: "all",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#242f3e" }]
  },
  {
    featureType: "all",
    elementType: "labels.text.fill",
    stylers: [{ color: "#746855" }]
  }
]
```

More styles: https://mapstyle.withgoogle.com/