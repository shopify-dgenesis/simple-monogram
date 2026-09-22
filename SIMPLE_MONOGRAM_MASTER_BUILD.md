# Simple Monogram — Master Build Specification

## Project Configuration

### Application
- App Name: Simple Monogram
- Platform: Shopify Embedded App
- App Type: Public Shopify App
- Target Distribution: Shopify App Store

### Git
- Repository: https://github.com/shopify-dgenesis/simple-monogram
- Default Branch: `main`
- Development Branch: `develop`

### Shopify
- Shopify Client ID: `9896fb025d5c8b1e2f091f0b9c4f1757`
- Shopify Organization ID: `180708055`
- Development Store Admin: `https://admin.shopify.com/store/simple-monogram-jo6ldob8`
- Development Store Domain: `simple-monogram-jo6ldob8.myshopify.com`

### Secrets
Do **not** store Shopify API secrets, access tokens, GitHub credentials, database passwords, storage credentials, session secrets, or encryption keys in this file or in Git.

Use `.env` locally and the production hosting platform's secret manager in production.

Commit only `.env.example`:

```bash
SHOPIFY_API_SECRET=
DATABASE_URL=
SESSION_SECRET=

# Optional preview/object storage
S3_ENDPOINT=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=
```

Never commit `.env`.

---

# Execution Contract

This specification is designed so an autonomous coding agent can receive one high-level instruction and execute the MVP sequentially.

The agent must:

1. Read this entire file before implementation.
2. Execute phases in order.
3. Keep the app runnable after every phase.
4. Run TypeScript validation after each phase.
5. Run lint after each phase.
6. Run relevant automated tests after each phase.
7. Run database migrations when required.
8. Validate Shopify configuration/extensions when relevant.
9. Fix failures before moving to the next phase.
10. Commit each completed phase to Git.

Do not leave required MVP functionality as:
- TODOs
- fake APIs
- mock database methods
- non-functional buttons
- dead routes
- hard-coded merchant/product data
- unimplemented placeholder pages

## Git Workflow

Development branch:

```text
main
└── develop
```

Recommended commits:

```text
chore(phase-00): bootstrap Shopify application
feat(phase-01): add database foundation
feat(phase-02): build embedded admin shell
feat(phase-03): build personalizer templates
feat(phase-04): build visual placement studio
feat(phase-05): add product assignments
feat(phase-06): add theme app extension
feat(phase-07): build live preview engine
feat(phase-08): integrate cart personalization
feat(phase-09): add personalized orders
feat(phase-10): add Shopify billing
feat(phase-11): add analytics
test(phase-12): complete QA and hardening
chore(phase-13): prepare production release
```

Do not merge `develop` into `main` until the MVP completion gate passes.

---

# Technical Direction

Recommended baseline architecture:

- Shopify embedded app
- TypeScript
- Shopify's current supported app framework at implementation time
- Shopify Admin GraphQL API
- Shopify Polaris / App Bridge where applicable
- PostgreSQL
- Prisma ORM
- Theme App Extension
- Product-page App Block
- Client-side SVG personalization preview
- Shopify line item properties
- Shopify native billing
- Object storage only where required for final preview snapshots

Prefer current supported Shopify APIs and patterns over deprecated approaches.

---

# Phase-by-Phase Build Process

## Phase 0 — Project Bootstrap

### Tasks
- Clone/init repository.
- Configure `main` and `develop`.
- Initialize Shopify embedded application.
- Link to Shopify Client ID `9896fb025d5c8b1e2f091f0b9c4f1757`.
- Associate Shopify Organization ID `180708055`.
- Configure dev store `simple-monogram-jo6ldob8.myshopify.com`.
- Configure TypeScript.
- Configure environment variables.
- Configure Prisma + PostgreSQL.
- Configure authentication/session persistence.
- Create Theme App Extension.
- Create `.env.example`.
- Verify `.gitignore`.
- Add lint, typecheck, test, build, and validation scripts.

### Completion Gate
- App installs on development store.
- Embedded admin opens.
- Authentication works.
- Database connects.
- Theme extension appears in Theme Editor.
- Typecheck passes.
- Lint passes.
- Shopify configuration validates.

---

## Phase 1 — Database Foundation

### Core Models
- Shop
- Subscription
- AppSettings
- Font
- ColorPalette
- PersonalizationTemplate
- PersonalizationField
- PreviewZone
- ProductAssignment
- VariantPreviewRule
- Customization
- PreviewSnapshot
- AnalyticsEvent

### Requirements
- Shop-scoped tenancy.
- Shopify resource IDs.
- Timestamps.
- Appropriate indexes.
- Explicit cascade/delete behavior.
- Initial migrations.
- Seed default fonts and palettes.

### Completion Gate
- Fresh database migrates from zero.
- Seed succeeds.
- Tenant isolation tests pass.
- Core CRUD tests pass.

---

## Phase 2 — Embedded Admin Shell

### Navigation
- Dashboard
- Personalizers
- Products
- Orders
- Fonts & Colors
- Widget Design
- Analytics
- Settings
- Plan

### Requirements
- Shopify-native embedded layout.
- Responsive UI.
- Loading, empty, error, and success states.
- Reusable components.
- Plan-awareness.

### Completion Gate
- All navigation works.
- No dead pages.
- App shell works on desktop and smaller admin widths.

---

## Phase 3 — Personalizer Templates

### Features
- Create/edit/duplicate/rename/archive/delete template.
- Select personalization type.
- Configure fields.
- Configure fonts.
- Configure colors.
- Configure min/max characters.
- Required/optional input.
- Uppercase transform.
- Allowed-character rules.
- Customer confirmation requirement.

### MVP Types
- Standard text
- Single initial
- Two initials
- Three initials
- Basic monogram
- Number
- Name + date

### Completion Gate
- Merchant can create a reusable personalizer end-to-end.
- All settings persist and reload correctly.

---

## Phase 4 — Visual Placement Studio

### Features
- Load product/variant image.
- Create personalization zone.
- Drag and resize.
- Set rotation.
- Set alignment.
- Set min/max font size.
- Enable auto-fit.
- Preview font/color/effect.
- Save normalized coordinates.

Example:

```json
{
  "x": 0.52,
  "y": 0.41,
  "width": 0.24,
  "height": 0.08,
  "rotation": -3
}
```

### Completion Gate
- Placement remains aligned across responsive preview sizes.
- Reopening a saved zone does not introduce coordinate drift.

---

## Phase 5 — Product Assignment

### Features
- Assign template to one product.
- Assign to multiple products.
- Bulk assignment.
- Collection assignment where appropriate.
- Tag-based assignment where appropriate.
- Product-type assignment where appropriate.
- Enable/disable personalization.
- Variant-specific preview rules.

### Plan Enforcement
Free:
- Maximum 5 active personalized products.

Pro:
- Unlimited active personalized products.

### Completion Gate
- Assignment determines storefront availability correctly.
- Free-plan 5-product limit cannot be bypassed through the app UI/API.

---

## Phase 6 — Theme App Extension

### Requirements
- Product-page App Block.
- No theme source-code modification.
- Merchant-controlled block placement through Theme Editor.
- Theme-compatible styling by default.
- Optional custom widget styles.

### Storefront States
- Loading
- Ready
- Validation error
- Product not configured
- Preview unavailable
- Confirmation required
- Add-to-cart blocked
- Complete

### Completion Gate
- Block adds/removes cleanly in Theme Editor.
- Widget appears only for configured products.
- Uninstall leaves no injected theme code behind.

---

## Phase 7 — Live Preview Engine

### Rendering Architecture

```text
Product Image
↓
SVG Overlay
↓
Text Layer
↓
Font / Color / Position / Scale / Rotation / Effect
```

### Requirements
- Render typing client-side.
- No server request per keystroke.
- Responsive coordinates.
- Auto-fit.
- Overflow protection.
- Variant image updates.
- Native Image Mode.
- Safe Preview Mode fallback.

### Completion Gate
- Preview feels immediate.
- Placement is stable across mobile/desktop.
- Variant changes use correct preview configuration.

---

## Phase 8 — Cart Integration

### Visible Line Item Properties

```text
Personalization: MARK
Font: Classic Serif
Color: Gold
Style: Engraving
```

### Internal References

```text
_simple_monogram_id
_preview_id
```

### Requirements
- Validate required inputs.
- Enforce confirmation checkbox when configured.
- Create final customization record.
- Save preview snapshot metadata.
- Preserve personalization on cart/order line.
- Keep separately personalized copies as distinct cart lines.

### Completion Gate
- Correct personalization appears in cart.
- Different personalization values do not collapse incorrectly.
- Shopify order preserves line item properties.

---

## Phase 9 — Personalized Orders

### Requirements
- Order webhook processing.
- Personalized order list.
- Personalized order detail.
- Product/variant.
- Text.
- Font.
- Color.
- Style.
- Preview snapshot.
- Customer confirmation.
- Fulfillment status.

### Production Sheet
Include:
- Order number
- Product
- Variant
- Personalization
- Font
- Color
- Placement
- Large preview
- Confirmation state

### Completion Gate
- Personalized Shopify orders appear reliably.
- Dashboard details reconcile with Shopify order line properties.
- Preview proof opens reliably.

---

## Phase 10 — Billing

### Free — $0/month
- 5 active personalized products
- Unlimited personalized orders
- Core text personalization
- Basic live preview
- Simple Monogram branding

### Pro — $9/month
- Unlimited personalized products
- Unlimited personalized orders
- Custom fonts
- Reusable palettes
- Bulk assignment
- Advanced placement
- Branding removal
- Advanced analytics when available

### Requirements
- Shopify-native subscription billing.
- Upgrade.
- Downgrade.
- Cancellation.
- Billing-state synchronization.
- Graceful downgrade when merchant currently has more than 5 active products.

### Completion Gate
- Upgrade/downgrade tested.
- Limits update correctly.
- No external billing checkout required.

---

## Phase 11 — Analytics

### Events
- customizer_viewed
- customizer_started
- personalization_completed
- personalized_add_to_cart
- personalized_order
- font_selected
- color_selected
- template_used
- product_personalized

### Dashboard
- Personalizable products
- Personalized orders
- Personalized revenue
- Customizations this month
- Most personalized product
- Most selected font
- Most selected color
- Personalization add-to-cart rate

### Completion Gate
- Analytics are tenant-isolated.
- Tracking never blocks storefront UX.
- Dashboard metrics reconcile with stored events/order data.

---

## Phase 12 — QA, Security, Performance

### QA
Test:
- Free and Pro plans
- Product assignments
- Variants
- Multiple personalized copies
- Mobile
- Desktop
- Theme App Block
- Safe Preview Mode
- Order webhook
- Uninstall/reinstall
- Billing downgrade
- Long text
- Unicode
- Unsupported font characters

### Security
- No secrets in source control.
- Verify webhook signatures.
- Validate Shopify sessions.
- Enforce shop tenancy.
- Sanitize customer/merchant text.
- Validate inputs server-side.
- Rate-limit sensitive endpoints where appropriate.

### Performance
- Lazy-load storefront code.
- Load only on configured products.
- Cache fonts.
- Optimize assets.
- Compress stored snapshots.
- Avoid server work during typing.
- Keep extension bundle lightweight.

### Completion Gate
- Typecheck passes.
- Lint passes.
- Tests pass.
- Shopify config validates.
- Theme extension builds.
- Production build succeeds.
- No known critical/high-severity security issues.
- Core storefront flow works on mobile and desktop.

---

## Phase 13 — Production Release Preparation

### Tasks
- Verify app metadata.
- Verify scopes.
- Verify privacy/support/uninstall requirements.
- Prepare App Store listing.
- Prepare screenshots.
- Configure production environment variables.
- Configure production database.
- Configure production preview storage if needed.
- Deploy app configuration/extensions.
- Run final development-store regression test.

---

# MVP Completion Gate

The MVP is complete only when all are true:

- Merchant can install the app.
- Merchant can create a personalizer.
- Merchant can choose fonts/colors/rules.
- Merchant can visually position personalization.
- Merchant can assign it to products.
- Customer can personalize on the product page.
- Customer sees real-time preview.
- Customer can add personalized product to cart.
- Cart/order retain personalization.
- Merchant can see personalized orders and preview proof.
- Free plan enforces 5 active products.
- Pro supports unlimited products.
- Billing works.
- Theme App Extension works without source injection.
- Production build passes.
- No required MVP workflow is a placeholder.

---

# One-Shot Agent Instruction

A coding agent may be given this instruction:

> Read `SIMPLE_MONOGRAM_MASTER_BUILD.md` completely. Build the Simple Monogram MVP from Phase 0 through Phase 13 in sequence. After each phase, typecheck, lint, test, validate relevant Shopify configuration, fix all failures, and commit the completed phase to `develop`. Do not skip phases and do not leave required MVP features as placeholders. Stop only when the MVP Completion Gate passes or when an external credential/permission prevents further execution. Never commit secrets.

---

# Product Blueprint

## 1. Product Overview

**Simple Monogram** is a Shopify personalization app that lets merchants add controlled text-based customization to products, including:

- Engraving
- Embroidery
- Monograms
- Names
- Initials
- Numbers
- Dates
- Short custom text

Merchants control the available fonts, colors, character rules, pricing, placement area, and storefront widget behavior.

Customers personalize the product directly on the product page and see the result update in real time on the product image before adding the item to cart.

The completed personalization details and preview are attached to the Shopify cart item and order so merchants can fulfill personalized orders accurately.

### Core Positioning

> **Simple Monogram — Live personalization made simple.**

Supporting positioning:

> Add engraving, embroidery, monograms, names and custom text to Shopify products. Let shoppers choose fonts and colors and preview their personalization instantly before they buy.

### Product Thesis

Simple Monogram should focus on **controlled personalization**, not free-form product design.

The shopper chooses from options approved by the merchant.

The merchant controls:

- What can be personalized
- Where personalization appears
- Which fonts are available
- Which colors are available
- Character limits
- Validation rules
- Price adjustments
- Preview placement
- Widget styling

The customer controls:

- Personalization text
- Font
- Color
- Approved layout/style choices

---

# 2. Target Market

Simple Monogram is suitable for merchants selling personalized products such as:

- Jewelry
- Rings
- Necklaces
- Bracelets
- Leather goods
- Wallets
- Bags
- Journals
- Clothing
- Polo shirts
- Jackets
- Hats
- Embroidered merchandise
- Drinkware
- Tumblers
- Mugs
- Bottles
- Wedding products
- Keepsakes
- Gift boxes
- Stationery
- Notebooks
- Invitations
- Pet tags
- Pet collars
- Corporate merchandise
- Simple print-on-demand products

---

# 3. Core Customer Experience

The customer personalization flow should remain simple:

1. Open product page
2. Enter personalization text
3. Choose an approved font
4. Choose an approved color
5. Select a monogram or personalization style if available
6. View the personalization live on the product image
7. Confirm spelling
8. Add personalized product to cart

Example:

```text
Personalize your item

Name or initials
[ MARK ]

Font
Classic | Script | Serif | Modern

Color
Gold | Silver | Black

[ Live product preview ]

☐ I confirm that the spelling and personalization shown are correct.

[ Add to Cart ]
```

---

# 4. Merchant Experience

The merchant workflow should be:

1. Choose products
2. Choose personalization type
3. Configure fonts
4. Configure colors
5. Configure text rules
6. Position personalization on the product image
7. Configure widget styling
8. Publish through the Shopify Theme Editor

The setup process should require no code.

---

# 5. Signature Feature: Visual Placement Studio

The Visual Placement Studio should be one of the app's primary differentiators.

The merchant sees the product image and visually places a personalization zone over it.

### Placement Controls

- X position
- Y position
- Maximum width
- Maximum height
- Rotation
- Alignment
- Default font size
- Minimum font size
- Maximum font size
- Auto-fit text
- Text alignment
- Preview opacity
- Preview effect
- Mobile positioning
- Variant-specific positioning

Example configuration:

```text
X: 0.52
Y: 0.41
Width: 0.24
Height: 0.08
Rotation: -3
Alignment: Center
```

Positions should be stored as normalized values rather than fixed pixels so previews remain responsive.

---

# 6. Personalization Types

## 6.1 Standard Text

For names, phrases, dates, or short messages.

Examples:

- MARK
- Jason
- 09.22.26
- Forever Yours

## 6.2 Single Initial

Example:

```text
M
```

## 6.3 Two Initials

Example:

```text
MJ
```

## 6.4 Three Initials

Example:

```text
MJN
```

## 6.5 Traditional Monogram

Separate inputs:

- First initial
- Middle initial
- Last initial

The app automatically generates the merchant-approved monogram arrangement.

## 6.6 Numbers

Useful for:

- Jersey numbers
- Birth years
- Anniversary years
- Identification numbers

## 6.7 Name + Date

Example:

```text
MARK
09.22.26
```

## 6.8 Initial + Symbol

Example:

```text
M ♥ J
```

## 6.9 Multi-Line Personalization

Optional support for controlled two-line or stacked layouts.

---

# 7. Text Validation

Simple Monogram should provide stronger validation than a basic character limit.

### Merchant-Controlled Rules

- Minimum characters
- Maximum characters
- Letters only
- Numbers only
- Letters and numbers
- Allowed symbols
- Uppercase only
- Automatically uppercase
- Automatically lowercase
- Disable emoji
- Required field
- Optional field
- Disallow leading spaces
- Disallow trailing spaces
- Collapse duplicate spaces
- Font character support validation
- Prevent overflow beyond the personalization zone

### Overflow Protection

If text exceeds the available personalization area:

1. Reduce font size automatically until the minimum allowed size is reached.
2. If it still does not fit, show an error.

Example:

> Your personalization is too long for this design.

---

# 8. Personalization Effects

Simple Monogram should support visual effects that approximate different production methods.

## Print

Normal text rendering using the selected color.

## Engraving

Possible visual properties:

- Reduced opacity
- Highlight/shadow blend
- Metallic appearance
- Dark etched appearance

## Embroidery

Possible visual properties:

- Thread-style texture
- Stitch approximation
- Slight raised appearance

## Foil

Possible presets:

- Gold
- Silver
- Rose Gold

## Deboss / Emboss

Use subtle highlights and shadows to approximate depth.

These effects do not need to be fully photorealistic in the MVP.

The most important requirements are:

- Correct text
- Correct font
- Correct color
- Correct placement
- Correct size

---

# 9. Fonts

Start with a curated font library rather than hundreds of fonts.

Recommended categories:

- Serif
- Sans Serif
- Script
- Signature
- Handwritten
- Block
- Varsity
- Monogram

### Initial Font Library

Target approximately 20–30 high-quality fonts.

### Pro Feature: Custom Font Upload

Supported formats may include:

- TTF
- OTF
- WOFF
- WOFF2

Merchant confirmation:

> I confirm that I have the right to use this font commercially.

---

# 10. Color Management

Merchants should be able to create reusable color palettes.

Example:

## Embroidery Threads

- Black
- White
- Navy
- Royal Blue
- Red
- Gold

## Foil Colors

- Gold
- Silver
- Rose Gold

## Engraving Colors

- Silver
- Black
- Dark Gray

Each color can include:

```text
Name: Navy Thread
HEX: #172A45
```

Color palettes can be reused across products and personalization templates.

---

# 11. Variant-Aware Personalization

Different Shopify variants may use different images or require different preview positions.

Simple Monogram should support:

```text
Variant → Preview Image → Personalization Zone
```

Example:

### Black Wallet

Available personalization colors:

- Gold
- Silver

### Tan Wallet

Available personalization colors:

- Black
- Brown

The preview should automatically update when the customer changes product variants.

---

# 12. Personalization Templates

Templates are essential for scaling the app across many products.

Example template:

## Gold Jewelry Engraving

Fonts:

- Classic Serif
- Modern
- Script

Colors:

- Gold
- Black

Maximum characters:

- 10

Effect:

- Engraving

The merchant can apply this template to:

- Necklace A
- Necklace B
- Bracelet A
- Bracelet B
- Ring A

### Template Actions

- Create
- Duplicate
- Rename
- Edit
- Delete
- Apply to products
- Apply to collections
- Apply by product type
- Apply by product tag

---

# 13. Product Assignment

Merchants should be able to assign personalization through:

- Individual product
- Multiple products
- Collection
- Product type
- Product tag

Future rule example:

> Automatically apply the “Embroidery Template” to every product tagged `personalizable-embroidery`.

---

# 14. Shopify Storefront Integration

Simple Monogram should use a Shopify **Theme App Extension** and **App Block**.

The app should not require merchants to edit theme files.

### Merchant Theme Setup

The merchant can place the app block inside the product information section.

Possible placement:

```text
Product Title
Price
Variant Selector
Simple Monogram
Quantity
Add to Cart
```

or:

```text
Product Title
Price
Simple Monogram
Variant Selector
Add to Cart
```

### Default Styling

Provide an option:

> Use theme styling

This should be enabled by default so the widget feels native to the merchant's theme.

---

# 15. Product Image Preview Architecture

Use a lightweight browser-rendered preview layer.

Recommended architecture:

```text
Product Image
    ↓
SVG Preview Layer
    ↓
Personalization Text
Font
Color
Position
Scale
Rotation
Effect
```

### Rendering Strategy

Live typing should be rendered client-side.

Example typing sequence:

```text
M
MA
MAR
MARK
```

The app should not send a server request for every keystroke.

Server persistence should occur only for meaningful events such as:

- Add to Cart
- Checkout creation
- Order creation
- Merchant preview save

This reduces infrastructure costs and improves responsiveness.

---

# 16. Safe Preview Mode

Theme compatibility can be difficult because Shopify themes implement product galleries differently.

Simple Monogram should support two storefront modes.

## Native Image Mode

Overlay personalization directly on the theme's primary product image.

## Safe Preview Mode

Render a dedicated product preview inside the Simple Monogram widget.

Use Safe Preview Mode when the theme gallery cannot reliably support overlays.

This prevents the personalization experience from failing on heavily customized themes.

---

# 17. Cart and Order Data

Customization should be stored using Shopify line item properties.

Example visible properties:

```text
Personalization: MARK
Font: Classic Serif
Color: Gold
Style: Engraving
```

Internal properties can include identifiers such as:

```text
_simple_monogram_id: sm_981725
_preview_id: pv_17262
```

The app database can use these IDs to retrieve additional metadata or preview snapshots.

---

# 18. Preview Snapshot

When the customer clicks **Add to Cart**, the app should create a frozen representation of the personalization.

Snapshot data may include:

- Product ID
- Variant ID
- Product image
- Personalization text
- Font
- Color
- Style
- Position
- Rotation
- Font size
- Preview image
- Timestamp

This gives merchants a visual proof of what the customer intended.

---

# 19. Personalized Orders Dashboard

Simple Monogram should include an operational order dashboard.

Example:

| Order | Product | Personalization | Preview | Status |
|---|---|---|---|---|
| #1054 | Wallet | MJN | Thumbnail | New |
| #1053 | Polo | MARK | Thumbnail | Processing |
| #1052 | Necklace | J ♥ M | Thumbnail | Fulfilled |

### Order Detail

Show:

- Shopify order number
- Customer
- Product
- Variant
- Personalization text
- Font
- Color
- Personalization type
- Preview image
- Customer confirmation
- Fulfillment status

---

# 20. Production Sheet

Each personalized order should have a production-friendly view.

Example:

```text
ORDER #1058

Leather Wallet — Brown

CUSTOMIZATION
Text: MARK
Font: Classic Serif
Color: Gold
Placement: Front Center

[ LARGE PREVIEW ]

Customer confirmed preview: YES
```

Future features:

- Print production sheet
- Download PDF
- Export today's personalized orders
- Bulk production sheet
- CSV export

---

# 21. Spelling Confirmation

Merchants should optionally require customers to confirm personalization before adding the product to cart.

Example:

```text
☐ I confirm that the spelling and personalization shown in the preview are correct.
```

If enabled, Add to Cart remains disabled until the customer confirms.

---

# 22. Price Add-Ons

Price customization should be introduced relatively early because personalization directly creates merchant revenue.

Possible price rules:

## Fixed Personalization Fee

```text
Product: $39
Embroidery: +$7
Total: $46
```

## Per Character

```text
$1 per character
```

## Premium Font

```text
Premium Script: +$2
```

## Placement

```text
Chest: +$5
Sleeve: +$3
```

## Second Personalization Area

```text
Back personalization: +$4
```

---

# 23. Cart Editing

Future functionality should allow customers to edit personalization directly from the cart.

Example:

```text
MARK
↓
Edit Personalization
↓
MARC
```

This avoids forcing customers to remove and re-add the product.

---

# 24. Dashboard Structure

Recommended app navigation:

## Dashboard

Overview metrics and onboarding progress.

## Personalizers

Create and manage personalization templates.

## Products

Manage products using Simple Monogram.

## Orders

View personalized orders and preview snapshots.

## Fonts & Colors

Manage reusable fonts and color palettes.

## Widget Design

Configure storefront appearance.

## Analytics

Track personalization engagement and conversion.

## Settings

Global app preferences.

## Plan

Manage subscription and limits.

---

# 25. Dashboard Metrics

Recommended metrics:

- Personalizable products
- Personalized orders
- Personalized revenue
- Customizations this month
- Most personalized product
- Most selected font
- Most selected color
- Personalization add-to-cart rate

---

# 26. Analytics

Track:

- Customizer views
- Customizer starts
- Personalizations completed
- Personalized add-to-cart
- Personalized checkout
- Personalized purchase
- Top fonts
- Top colors
- Top monogram styles
- Top personalized products
- Personalization revenue
- Average personalization fee

Example:

```text
1,420 customers viewed a customizable product
622 started personalization
311 added a personalized product to cart
```

---

# 27. Widget Customization

Merchant-controlled widget settings:

- Widget heading
- Description
- Input labels
- Placeholder text
- Available fonts
- Available colors
- Button style
- Swatch style
- Border radius
- Input styling
- Background color
- Text color
- Accent color
- Spacing
- Mobile layout
- Required-field messages
- Character counter
- Preview disclaimer
- Confirmation checkbox
- Use theme styling

---

# 28. Merchant Onboarding

Recommended setup flow:

```text
Welcome to Simple Monogram

1. Choose products
        ↓
2. Choose customization type
   Engraving
   Embroidery
   Print
   Monogram
        ↓
3. Choose fonts
        ↓
4. Choose colors
        ↓
5. Set character rules
        ↓
6. Position personalization
   [ Visual Placement Studio ]
        ↓
7. Style the widget
        ↓
8. Add Simple Monogram to your theme
        ↓
✓ You're live
```

The merchant should be able to complete onboarding without documentation.

---

# 29. Pricing Model

## Free

**$0/month**

Recommended inclusions:

- Up to 5 personalized products
- Text personalization
- Font selection
- Color selection
- Basic monogram styles
- Character limits
- Live preview
- Unlimited personalized orders
- Basic order dashboard
- Simple Monogram branding

## Pro

**$9/month**

Recommended inclusions:

- Unlimited personalizable products
- Unlimited personalized orders
- All personalization types
- Custom fonts
- Reusable color palettes
- Bulk product assignment
- Collection/tag assignment
- Advanced placement controls
- Multiple preview zones
- Widget branding removal
- Advanced analytics
- Priority features

### Recommended Primary Value Proposition

> **Unlimited personalizable products and unlimited personalized orders for $9/month.**

### Pricing Philosophy

Avoid transaction fees.

This can become a strong competitive differentiator.

---

# 30. Future Business Plan

The architecture should leave room for an additional tier later.

## Simple Pro

**$9/month**

Focus:

- Text personalization
- Monograms
- Engraving
- Embroidery preview
- Unlimited products
- Unlimited orders

## Simple Business

Possible future price:

**$19/month**

Potential features:

- Customer file uploads
- Advanced pricing rules
- Multi-side personalization
- Print-ready exports
- Advanced analytics
- Production exports
- Advanced workflow tools

Do not promise every future infrastructure-heavy feature permanently inside the $9 plan.

---

# 31. MVP Scope

## Phase 1 — Launch Product

- Product selection
- Free 5-product limit
- Unlimited paid products
- Text personalization
- Numbers
- Single initial
- Two initials
- Three initials
- Basic monogram layouts
- Font selection
- Color selection
- Character limits
- Required/optional field
- Uppercase option
- Text validation
- Visual Placement Studio
- Live product image preview
- Mobile preview
- Variant-aware preview
- Shopify line item properties
- Preview snapshot
- Personalized Orders dashboard
- Theme App Extension
- App Block placement
- Widget styling
- Template duplication
- Free plan
- $9 Pro plan

---

# 32. Phase 2

Potential Phase 2 features:

- Traditional monogram layouts
- Multiple personalization zones
- Cart editing
- Custom fonts
- Saved color palettes
- Fixed price add-ons
- Per-character pricing
- Conditional customization
- Collection/tag assignment
- CSV personalization export
- Production sheets
- Advanced engraving effects
- Embroidery effects
- Analytics
- Multi-language storefront labels
- RTL support
- Customer logo upload

---

# 33. Phase 3

Potential Phase 3 features:

- Print-ready SVG
- Print-ready PDF
- Multiple product sides
- Front/back personalization
- Image personalization
- Logo personalization
- Background removal
- POD integrations
- Production workflows
- Merchant API
- Webhooks
- Headless/Hydrogen support
- Shopify POS workflows
- Automated production exports

---

# 34. Features to Avoid Early

Do not turn Simple Monogram into a full design platform during the early stages.

Avoid prioritizing:

- 3D configuration
- AR previews
- AI design generation
- Full Canva-like editing
- Complex layer editors
- Massive clipart libraries
- Full POD catalogs
- Embroidery-machine DST generation
- Large file-processing pipelines

These features increase development, infrastructure, and support costs and weaken the app's simplicity positioning.

---

# 35. Competitive Positioning

Simple Monogram should compete through focus rather than feature volume.

### Core Differentiators

| Differentiator | Positioning |
|---|---|
| Simplicity | Personalization without a complicated designer |
| Live visualization | Customers see what they are ordering |
| Merchant-controlled placement | Merchants control exactly where personalization appears |
| Pricing | Unlimited personalized products for $9/month |
| No usage fees | No fee every time a personalized item sells |
| Fulfillment accuracy | Orders contain customization data and visual proof |
| Smart monograms | Proper initials and approved layouts |
| Shopify-native | Theme App Extension and Shopify order integration |

---

# 36. Product Messaging

## App Name

**Simple Monogram**

## Suggested Shopify App Store Name

**Simple Monogram: Personalizer**

## Tagline

**Live personalization made simple.**

## Short Description

> Live product personalization for engraving, embroidery and monograms.

## Longer Description

> Add engraving, embroidery, monograms, names and custom text to Shopify products. Let shoppers choose approved fonts and colors and preview their personalization instantly before they buy. Personalization details and visual proofs are stored with the order for accurate fulfillment.

---

# 37. Recommended Technical Model

High-level application structure:

```text
Shop
 ├── Subscription
 ├── Settings
 ├── Fonts
 ├── ColorPalettes
 ├── PersonalizationTemplates
 │     ├── Fields
 │     ├── Fonts
 │     ├── Colors
 │     └── PreviewZones
 │
 ├── ProductAssignments
 │     ├── ShopifyProduct
 │     ├── ShopifyVariant
 │     └── Template
 │
 └── Customizations
       ├── ShopifyCartId
       ├── ShopifyOrderId
       ├── Product
       ├── Variant
       ├── Text
       ├── Font
       ├── Color
       ├── Zone
       ├── PreviewSnapshot
       └── Status
```

---

# 38. Suggested Data Entities

## Shop

- Shopify shop domain
- Shopify shop ID
- Current plan
- Install date
- Billing status
- Settings

## Personalization Template

- ID
- Shop ID
- Name
- Type
- Status
- Default font
- Available fonts
- Available colors
- Character rules
- Price rules
- Preview effect

## Preview Zone

- Template ID
- Product/variant reference
- X position
- Y position
- Width
- Height
- Rotation
- Font sizing rules
- Text alignment
- Effect

## Product Assignment

- Shopify product ID
- Shopify variant ID
- Template ID
- Status

## Customization

- Shopify cart ID
- Shopify line item ID
- Shopify order ID
- Product ID
- Variant ID
- Customer-entered text
- Font
- Color
- Style
- Placement
- Preview snapshot
- Confirmation
- Timestamp

---

# 39. Infrastructure Principles

To keep the $9 plan financially sustainable:

- Render live previews in the browser
- Avoid generating server images on every keystroke
- Store only meaningful personalization events
- Compress preview snapshots
- Use CDN/object storage for generated previews
- Avoid unnecessary permanent storage
- Cache font assets
- Use normalized placement coordinates
- Load storefront scripts only on applicable products
- Keep the Theme App Extension lightweight

---

# 40. Product Risk

The main strategic risk is losing focus.

Simple Monogram should not become:

> Product options + file upload + design canvas + image editor + AI + 3D + AR + POD platform.

Its strongest product identity is:

> **Controlled product personalization for Shopify merchants who want something fast, affordable, visual, and easy to manage.**

---

# 41. Final Product Definition

> **Simple Monogram is a Shopify personalization app that lets merchants add controlled text-based customization to products — including engraving, embroidery, monograms, names, initials, numbers and dates. Merchants choose the available fonts, colors, character rules and placement area. Customers personalize the product through a lightweight storefront widget and see the result instantly on the product image. The finished personalization and visual proof are attached to the Shopify cart and order for accurate fulfillment.**

### Launch Business Model

**Free**
- Up to 5 personalizable products

**Pro — $9/month**
- Unlimited personalizable products
- Unlimited personalized orders
- No transaction fees

---

# 42. Strategic Goal

Simple Monogram should become the default Shopify app for merchants who think:

> “I don't need a full product designer. I just need customers to put their name, initials, number or date in the right place and see exactly how it will look.”

That is the product category Simple Monogram should own.