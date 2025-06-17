# MonoInk.js

A lightweight JavaScript library that applies authentic retro computer display effects to web content. Render any webpage with a retro screen effect using pixelation, dithering, high contrast, and backlight effects reminiscent of classic CRT monitors and early computer displays.

## Features

- **Pixelation**: Create chunky, low-resolution blocks (1-100 density levels)
- **Dithering**: Floyd-Steinberg algorithm for authentic black/white dot patterns 
- **High Contrast**: Force colors to pure black or white
- **Backlight**: Colored lighting effects like vintage CRT monitors
- **Performance Optimized**: Canvas reuse, 60fps throttling, memory leak prevention
- **Cross-Origin Safe**: Graceful handling of CORS-restricted content
- **Real-time Updates**: Dynamic settings changes without reinitialization

## Installation

### NPM
```bash
npm install monoink
```

### Direct Download
```html
<script src="monoink.js"></script>
```

### CDN
```html
<!-- Latest version -->
<script src="https://unpkg.com/monoink@latest/monoink.js"></script>

<!-- Specific version -->
<script src="https://unpkg.com/monoink@1.0.0/monoink.js"></script>
```

### ES Modules
```javascript
import MonoInk from 'monoink';
```

### Install from GitHub
```bash
# Install latest release
npm install git+https://github.com/olgv/tool-monoink.git

# Install specific version
npm install git+https://github.com/olgv/tool-monoink.git#v1.0.0

# Install from develop branch
npm install git+https://github.com/olgv/tool-monoink.git#develop
```

## Quick Start

### Render Entire Page
```javascript
// Apply effects to the entire webpage
const monoInk = new MonoInk({
    pixelation: true,
    pixelDensity: 4,
    dithering: true,
    ditherDensity: 2
});

monoInk.render();
```

### Render Specific Element
```javascript
// Apply effects to a specific div or element
const targetDiv = document.getElementById('my-content');
const monoInk = new MonoInk({
    targetElement: targetDiv,
    pixelation: true,
    pixelDensity: 6,
    dithering: true
});

monoInk.render();
```

## API Reference

### Constructor

```javascript
new MonoInk(options)
```

#### Options

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `pixelDensity` | number | 4 | 1-100 | Size of pixelated blocks. Higher = chunkier pixels |
| `ditherDensity` | number | 2 | 1-10 | Fineness of dithering dots. Lower = finer dots |
| `pixelation` | boolean | false | - | Enable/disable pixelation effect |
| `dithering` | boolean | false | - | Enable/disable dithering effect |
| `highContrast` | boolean | true | - | Force similar colors to pure black/white |
| `backlight` | boolean | false | - | Enable colored backlight effect |
| `backlightColor` | object | `{r:255,g:165,b:0}` | RGB 0-255 | Backlight color |
| `targetElement` | Element | document.body | - | DOM element to apply effects to |
| `toggleButtonSelector` | string | "#toggle-backlight" | - | CSS selector for toggle button |

### Methods

#### `render()`
Applies the current effects to the target element.

```javascript
monoInk.render();
```

#### `updateSettings(newSettings)`
Dynamically update effect parameters without recreating the instance.

```javascript
monoInk.updateSettings({
    pixelDensity: 8,
    dithering: true,
    backlightColor: { r: 0, g: 255, b: 0 }
});
```

#### `toggleBacklight()`
Toggle the backlight effect on/off.

```javascript
await monoInk.toggleBacklight();
```

#### `destroy()`
Clean up resources and remove effects.

```javascript
monoInk.destroy();
```

## Usage Examples

### Basic Retro Effect
```javascript
const monoInk = new MonoInk({
    pixelation: true,
    pixelDensity: 6,
    dithering: true,
    ditherDensity: 1,
    highContrast: true
});

monoInk.render();
```

### Vintage Terminal Look
```javascript
const monoInk = new MonoInk({
    pixelation: false,
    dithering: true,
    ditherDensity: 3,
    backlight: true,
    backlightColor: { r: 0, g: 255, b: 0 }, // Green CRT
    highContrast: true
});

monoInk.render();
```

### Multiple Elements with Different Effects
```javascript
// Apply different effects to different sections
const header = document.getElementById('header');
const content = document.getElementById('main-content');

// Subtle effect for header
const headerEffects = new MonoInk({
    targetElement: header,
    pixelation: true,
    pixelDensity: 2,
    highContrast: false
});

// Stronger effect for main content
const contentEffects = new MonoInk({
    targetElement: content,
    pixelation: true,
    pixelDensity: 8,
    dithering: true,
    backlight: true,
    backlightColor: { r: 0, g: 255, b: 0 }
});

headerEffects.render();
contentEffects.render();
```

### Dynamic Controls
```javascript
const monoInk = new MonoInk();

// Create control interface
document.getElementById('pixel-slider').addEventListener('input', (e) => {
    monoInk.updateSettings({ 
        pixelation: true,
        pixelDensity: parseInt(e.target.value) 
    });
});

document.getElementById('dither-slider').addEventListener('input', (e) => {
    monoInk.updateSettings({ 
        dithering: true,
        ditherDensity: parseInt(e.target.value) 
    });
});
```

### Color Picker Integration
```javascript
document.getElementById('color-picker').addEventListener('change', (e) => {
    const hex = e.target.value;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    monoInk.updateSettings({
        backlight: true,
        backlightColor: { r, g, b }
    });
});
```

## Effect Combinations

### Pixelated Dithering
When both pixelation and dithering are enabled, MonoInk creates large pixelated blocks with fine dithering patterns within each block:

```javascript
// Large blocks with fine internal dithering
const monoInk = new MonoInk({
    pixelation: true,
    pixelDensity: 20,    // Very chunky blocks
    dithering: true,
    ditherDensity: 1     // Very fine dots within blocks
});
```

### Independent Effects
Effects can be combined or used separately:

- **Pixelation only**: Chunky, blocky appearance
- **Dithering only**: Fine black/white dot patterns
- **High Contrast only**: Pure black/white conversion
- **Backlight only**: Colored overlay effect

## Performance Notes

- **Canvas Reuse**: Canvases are reused to minimize memory allocation
- **Frame Rate Limiting**: Automatic 60fps throttling prevents excessive rendering
- **Lazy Rendering**: Effects only apply when enabled
- **Memory Management**: Proper cleanup prevents memory leaks
- **CORS Handling**: Graceful degradation for cross-origin images

## Browser Support

- Modern browsers with Canvas 2D support
- Chrome 60+, Firefox 55+, Safari 11+, Edge 79+
- Mobile browsers supported

## Error Handling

MonoInk includes robust error handling:

```javascript
try {
    const monoInk = new MonoInk({
        pixelDensity: -5  // Invalid value
    });
} catch (error) {
    console.error('MonoInk initialization failed:', error.message);
}
```

Common errors:
- Invalid parameter types or ranges
- Missing target elements
- Canvas creation failures
- CORS-restricted content (handled gracefully)

## CSS Integration

The effect canvas is automatically styled and positioned:

```css
/* MonoInk canvas styling (automatic) */
canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9998;
}
```

To customize or hide specific elements from effects:

```css
.no-monoink {
    /* Elements with this class will be skipped */
}
```

## Advanced Usage

### Multiple Instances
```javascript
// Different effects for different areas
const headerEffects = new MonoInk({
    targetElement: document.header,
    pixelation: true,
    pixelDensity: 3
});

const contentEffects = new MonoInk({
    targetElement: document.main,
    dithering: true,
    ditherDensity: 2
});
```

### Animation Integration
```javascript
// Animate pixel density over time
let density = 1;
setInterval(() => {
    density = (density % 10) + 1;
    monoInk.updateSettings({ pixelDensity: density });
}, 200);
```

### Responsive Design
```javascript
// Adjust effects based on screen size
function updateForScreenSize() {
    const isMobile = window.innerWidth < 768;
    monoInk.updateSettings({
        pixelDensity: isMobile ? 2 : 4,
        ditherDensity: isMobile ? 4 : 2
    });
}

window.addEventListener('resize', updateForScreenSize);
```

## Cleanup

Always clean up when done:

```javascript
// Before page unload
window.addEventListener('beforeunload', () => {
    monoInk.destroy();
});

// Or when switching views
function cleanup() {
    monoInk.destroy();
}
```

## Demo

You can see MonoInk.js in action by opening the included `index.html` file in your browser, or visit the online demo at: [GitHub Pages Demo](https://olgv.github.io/tool-monoink)

## License

MIT License - Feel free to use in personal and commercial projects.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup
```bash
# Clone the repository
git clone https://github.com/olgv/tool-monoink.git
cd tool-monoink

# No dependencies to install - pure vanilla JS!
# Open index.html in your browser to test changes
```

### Guidelines
- Code follows existing style
- Performance optimizations are maintained
- Cross-browser compatibility is preserved
- Test thoroughly before submitting 