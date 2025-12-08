# SEO Setup Guide

This guide covers the SEO implementation for CHACK and how to configure it for optimal search engine visibility.

## Overview

CHACK includes comprehensive SEO features:

- ✅ **Meta Tags**: Title, description, keywords
- ✅ **Open Graph**: Social media sharing (Facebook, LinkedIn, etc.)
- ✅ **Twitter Cards**: Optimized Twitter sharing
- ✅ **Structured Data**: Schema.org JSON-LD for rich snippets
- ✅ **Robots.txt**: Search engine crawl directives
- ✅ **Sitemap**: XML sitemap for search engines
- ✅ **Canonical URLs**: Prevents duplicate content issues
- ✅ **Web App Manifest**: PWA support

## Environment Variables

Add these to your `.env.local` file:

```env
# Your production domain (required for SEO)
NEXT_PUBLIC_APP_URL=https://chack.dev

# Google Search Console Verification (optional)
GOOGLE_SITE_VERIFICATION=your-verification-code
```

### Getting Your Domain

1. **For Production**: Set `NEXT_PUBLIC_APP_URL` to your actual domain (e.g., `https://chack.dev`)
2. **For Development**: It will fall back to `NEXTAUTH_URL` or default to `https://chack.dev`

### Google Search Console Setup

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add your property (website URL)
3. Choose "HTML tag" verification method
4. Copy the `content` value from the meta tag
5. Add it to `.env.local` as `GOOGLE_SITE_VERIFICATION`

Example:
```html
<meta name="google-site-verification" content="abc123xyz..." />
```
→ Set `GOOGLE_SITE_VERIFICATION=abc123xyz...`

## Open Graph Images

CHACK uses **dynamic OG image generation** via Next.js ImageResponse API. The images are automatically generated at:

- `/opengraph-image` - For Open Graph (Facebook, LinkedIn)
- `/twitter-image` - For Twitter Cards

### How It Works

The OG images are generated server-side using the `app/opengraph-image.tsx` file. They feature:
- CHACK branding with gradient background
- Responsive text sizing
- 1200x630px dimensions (optimal for social media)

### Customizing OG Images

Edit `app/opengraph-image.tsx` to customize:
- Colors (currently uses sky-cyan gradient)
- Text content
- Layout and styling
- Font sizes

## Testing Your SEO

### 1. Google Rich Results Test

Test your structured data:
- Visit: https://search.google.com/test/rich-results
- Enter your homepage URL
- Check for any errors or warnings

### 2. Facebook Sharing Debugger

Test Open Graph tags:
- Visit: https://developers.facebook.com/tools/debug/
- Enter your homepage URL
- Click "Scrape Again" to see preview
- Verify image, title, and description appear correctly

### 3. Twitter Card Validator

Test Twitter Cards:
- Visit: https://cards-dev.twitter.com/validator
- Enter your homepage URL
- Verify the card preview

### 4. Google Search Console

Monitor your SEO performance:
- Submit your sitemap: `https://your-domain.com/sitemap.xml`
- Monitor indexing status
- Check for crawl errors
- View search performance metrics

## Sitemap

Your sitemap is automatically generated at `/sitemap.xml` and includes:
- Homepage (priority: 1.0, changeFrequency: daily)
- Login page (priority: 0.8, changeFrequency: monthly)

### Adding More Pages

Edit `app/sitemap.ts` to add more pages:

```typescript
{
  url: `${baseUrl}/about`,
  lastModified: new Date(),
  changeFrequency: "monthly",
  priority: 0.7,
}
```

## Robots.txt

The robots.txt file is at `/robots.txt` and:
- ✅ Allows crawling of public pages
- ❌ Blocks private routes (dashboard, API, auth, etc.)

### Customizing Robots.txt

Edit `app/robots.ts` to modify crawl directives.

## Structured Data

The homepage includes Schema.org structured data for:
- **SoftwareApplication**: Application details, features, pricing
- **AggregateRating**: User ratings (currently placeholder)

### Viewing Structured Data

1. Visit your homepage
2. View page source
3. Look for `<script type="application/ld+json">`
4. Copy the JSON and validate at https://validator.schema.org/

## Page-Specific SEO

### Homepage (`/`)
- Full SEO metadata
- Structured data (JSON-LD)
- Open Graph tags
- Twitter Cards

### Login Page (`/auth/login`)
- SEO-friendly metadata
- Indexable (public page)

### Dashboard (`/dashboard`)
- No-index (private page)
- Only accessible to authenticated users

## Best Practices

1. **Keep Metadata Updated**: Update descriptions when features change
2. **Monitor Performance**: Use Google Search Console regularly
3. **Test Social Sharing**: Share links on social media to verify OG images
4. **Update Sitemap**: Add new public pages to sitemap
5. **Check Structured Data**: Validate JSON-LD periodically

## Troubleshooting

### OG Images Not Showing

1. Check `NEXT_PUBLIC_APP_URL` is set correctly
2. Verify the image route is accessible: `https://your-domain.com/opengraph-image`
3. Clear Facebook/Twitter cache using their debugger tools

### Sitemap Not Found

1. Ensure `app/sitemap.ts` exists
2. Check Next.js build output for errors
3. Verify route is accessible: `https://your-domain.com/sitemap.xml`

### Structured Data Errors

1. Use Google Rich Results Test to identify issues
2. Validate JSON-LD at https://validator.schema.org/
3. Check for syntax errors in `app/page.tsx`

## Additional Resources

- [Next.js Metadata Documentation](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Schema.org Documentation](https://schema.org/)
- [Google Search Central](https://developers.google.com/search)

