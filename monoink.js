class MonoInk {
	constructor({
		pixelDensity = 4,
		ditherDensity = 2,
		pixelation = false,
		dithering = false,
		backlight = false,
		backlightColor = { r: 255, g: 165, b: 0 },
		highContrast = true,
		targetElement = null,
		toggleButtonSelector = "#toggle-backlight"
	} = {}) {
		this.validateInputs({ pixelDensity, ditherDensity, backlightColor });

		Object.assign(this, {
			pixelDensity: Math.max(1, Math.min(pixelDensity, 100)),
			ditherDensity: Math.max(1, Math.min(ditherDensity, 10)),
			pixelation,
			dithering,
			backlight,
			backlightColor: { ...backlightColor },
			highContrast,
			targetElement: targetElement || document.body,
			toggleButtonSelector,
			canvas: null,
			captureCanvas: null,
			processCanvas: null,
			mainCtx: null,
			captureCtx: null,
			processCtx: null,
			toggleButton: null,
			isDestroyed: false,
			lastRenderTime: 0
		});

		this.findToggleButton();
		this.render = this.render.bind(this);
		this.toggleBacklight = this.toggleBacklight.bind(this);
		this.handleResize = this.debounce(this.render, 250);
		window.addEventListener("resize", this.handleResize);
	}

	validateInputs({ pixelDensity, ditherDensity, backlightColor }) {
		if (typeof pixelDensity !== 'number' || pixelDensity <= 0) throw new Error('MonoInk: pixelDensity must be a positive number');
		if (typeof ditherDensity !== 'number' || ditherDensity <= 0) throw new Error('MonoInk: ditherDensity must be a positive number');
		if (!backlightColor || typeof backlightColor.r !== 'number' || typeof backlightColor.g !== 'number' || typeof backlightColor.b !== 'number') {
			throw new Error('MonoInk: backlightColor must be an object with r, g, b number properties');
		}
	}

	findToggleButton() {
		try {
			this.toggleButton = this.targetElement.querySelector(this.toggleButtonSelector);
		} catch (e) {
			console.warn('MonoInk: Could not find toggle button with selector:', this.toggleButtonSelector);
		}
	}

	debounce(func, wait) {
		let timeout;
		return (...args) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => func.apply(this, args), wait);
		};
	}

	async render() {
		if (this.isDestroyed) return;
		const now = performance.now();
		if (now - this.lastRenderTime < 16) {
			requestAnimationFrame(this.render.bind(this));
			return;
		}
		this.lastRenderTime = now;

		try {
			const hasEffects = this.pixelation || this.dithering || this.highContrast || this.backlight;
			if (!hasEffects) {
				if (this.canvas && this.canvas.parentNode) this.canvas.remove();
				return;
			}
			this.setupCanvases();
			this.drawBackground();
			this.drawImages();
			this.drawText();
			this.processCapture();
			this.finalizeRender();
		} catch (error) {
			this.handleError(error);
		}
	}

	handleError(error) {
		console.error("MonoInk render failed:", error);
		if (this.canvas && this.canvas.parentNode) this.canvas.remove();
		this.canvas = this.mainCtx = null;
	}

	setupCanvases() {
		const { innerWidth, innerHeight } = window;
		const dpr = window.devicePixelRatio || 1;

		if (!this.canvas) {
			this.canvas = document.createElement("canvas");
			this.canvas.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9998;`;
			this.mainCtx = this.canvas.getContext("2d", { alpha: false });
		}
		this.canvas.width = innerWidth * dpr;
		this.canvas.height = innerHeight * dpr;
		this.mainCtx.scale(dpr, dpr);
		this.mainCtx.imageSmoothingEnabled = false;

		const captureWidth = innerWidth * dpr;
		const captureHeight = innerHeight * dpr;
		if (!this.captureCanvas || this.captureCanvas.width !== captureWidth || this.captureCanvas.height !== captureHeight) {
			this.captureCanvas = document.createElement("canvas");
			this.captureCanvas.width = captureWidth;
			this.captureCanvas.height = captureHeight;
			this.captureCtx = this.captureCanvas.getContext("2d", { alpha: false });
		}

		let processWidth, processHeight;
		if (this.pixelation) {
			const physicalPixelDensity = Math.round(this.pixelDensity * dpr);
			processWidth = Math.max(1, Math.floor(captureWidth / physicalPixelDensity));
			processHeight = Math.max(1, Math.floor(captureHeight / physicalPixelDensity));
		} else {
			processWidth = captureWidth;
			processHeight = captureHeight;
		}
		if (!this.processCanvas || this.processCanvas.width !== processWidth || this.processCanvas.height !== processHeight) {
			this.processCanvas = document.createElement("canvas");
			this.processCanvas.width = processWidth;
			this.processCanvas.height = processHeight;
			this.processCtx = this.processCanvas.getContext("2d", { alpha: false });
		}

		this.captureCtx.clearRect(0, 0, captureWidth, captureHeight);
		this.processCtx.imageSmoothingEnabled = false;
		this.processCtx.clearRect(0, 0, processWidth, processHeight);
	}

	drawBackground() {
		const { width, height } = this.captureCanvas;
		try {
			const bgColor = getComputedStyle(this.targetElement).backgroundColor || '#ffffff';
			this.captureCtx.fillStyle = bgColor;
		} catch (e) {
			this.captureCtx.fillStyle = '#ffffff';
		}
		this.captureCtx.fillRect(0, 0, width, height);
	}

	drawImages() {
		const dpr = window.devicePixelRatio || 1;
		const images = this.targetElement.getElementsByTagName('img');
		for (const img of images) {
			if (img.complete && img.naturalWidth !== 0) {
				const rect = img.getBoundingClientRect();
				if (rect.width > 0 && rect.height > 0) {
					try {
						this.captureCtx.drawImage(img, rect.left * dpr, rect.top * dpr, rect.width * dpr, rect.height * dpr);
					} catch (e) {
						console.warn('MonoInk: Could not draw image:', img.src);
					}
				}
			}
		}
	}

	drawText() {
		const dpr = window.devicePixelRatio || 1;
		const textElements = this.targetElement.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, a, button, label');
		for (const element of textElements) {
			if (this.shouldSkipElement(element)) continue;
			try {
				const style = window.getComputedStyle(element);
				const rect = element.getBoundingClientRect();
				if (rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) continue;
				const fontSize = parseFloat(style.fontSize || '16px') * dpr;
				const fontFamily = style.fontFamily || 'Arial, sans-serif';
				const fontWeight = style.fontWeight || 'normal';
				this.captureCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
				this.captureCtx.fillStyle = style.color || '#000000';
				this.captureCtx.textBaseline = 'top';
				const textContent = this.getDirectTextContent(element);
				if (textContent.trim()) this.captureCtx.fillText(textContent, rect.left * dpr, rect.top * dpr);
			} catch (e) {
				console.warn('MonoInk: Could not render text element:', e);
			}
		}
	}

	shouldSkipElement(element) {
		if (element === this.canvas || element.closest('.controls')) return true;
		try {
			const style = window.getComputedStyle(element);
			return style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0;
		} catch (e) {
			return true;
		}
	}

	getDirectTextContent(element) {
		return Array.from(element.childNodes).filter(node => node.nodeType === 3).map(node => node.textContent.trim()).filter(text => text.length > 0).join(' ');
	}

	processCapture() {
		this.processCtx.drawImage(this.captureCanvas, 0, 0, this.processCanvas.width, this.processCanvas.height);
		if (this.highContrast) this.processHighContrast();
		if (this.dithering) {
			if (this.pixelation) this.applyDitheringToPixelatedBlocks();
			else this.applyRegularDithering();
		}
		if (this.backlight) this.applyBacklight();
	}

	processHighContrast() {
		const { width, height } = this.processCanvas;
		const imageData = this.processCtx.getImageData(0, 0, width, height);
		const data = imageData.data;
		for (let i = 0; i < data.length; i += 4) {
			const r = data[i], g = data[i + 1], b = data[i + 2];
			const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(b - r));
			if (maxDiff < 30) {
				const color = (r + g + b) / 3 > 128 ? 255 : 0;
				data[i] = data[i + 1] = data[i + 2] = color;
			}
		}
		this.processCtx.putImageData(imageData, 0, 0);
	}

	applyDitheringToPixelatedBlocks() {
		const dpr = window.devicePixelRatio || 1;
		const physicalPixelDensity = this.pixelDensity * dpr;
		const subdivisions = Math.max(1, Math.round(physicalPixelDensity / this.ditherDensity));

		if (subdivisions <= 1) {
			const { width, height } = this.processCanvas;
			const imageData = this.processCtx.getImageData(0, 0, width, height);
			const data = imageData.data;
			for (let i = 0; i < data.length; i += 4) {
				const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
				const newPixel = gray > 128 ? 255 : 0;
				data[i] = data[i + 1] = data[i + 2] = newPixel;
			}
			this.processCtx.putImageData(imageData, 0, 0);
			return;
		}

		const { width: processWidth, height: processHeight } = this.processCanvas;
		const blockImageData = this.processCtx.getImageData(0, 0, processWidth, processHeight);
		const blockData = blockImageData.data;
		const finalWidth = processWidth * subdivisions;
		const finalHeight = processHeight * subdivisions;
		const finalCanvas = document.createElement("canvas");
		finalCanvas.width = finalWidth;
		finalCanvas.height = finalHeight;
		const finalCtx = finalCanvas.getContext("2d", { alpha: false });
		finalCtx.imageSmoothingEnabled = false;

		for (let y = 0; y < processHeight; y++) {
			for (let x = 0; x < processWidth; x++) {
				const blockIdx = (y * processWidth + x) * 4;
				const gray = 0.299 * blockData[blockIdx] + 0.587 * blockData[blockIdx + 1] + 0.114 * blockData[blockIdx + 2];
				finalCtx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
				finalCtx.fillRect(x * subdivisions, y * subdivisions, subdivisions, subdivisions);
			}
		}

		const imageData = finalCtx.getImageData(0, 0, finalWidth, finalHeight);
		const data = imageData.data;
		for (let y = 0; y < finalHeight; y++) {
			for (let x = 0; x < finalWidth; x++) {
				const idx = (y * finalWidth + x) * 4;
				const oldPixel = data[idx];
				const newPixel = oldPixel > 128 ? 255 : 0;
				const error = oldPixel - newPixel;
				data[idx] = data[idx + 1] = data[idx + 2] = newPixel;
				const blockX_start = Math.floor(x / subdivisions) * subdivisions;
				const blockY_start = Math.floor(y / subdivisions) * subdivisions;
				const blockX_end = blockX_start + subdivisions;
				const blockY_end = blockY_start + subdivisions;
				if (x + 1 < blockX_end) data[idx + 4] = Math.max(0, Math.min(255, data[idx + 4] + error * 7 / 16));
				if (y + 1 < blockY_end) {
					if (x - 1 >= blockX_start) data[idx + finalWidth * 4 - 4] = Math.max(0, Math.min(255, data[idx + finalWidth * 4 - 4] + error * 3 / 16));
					data[idx + finalWidth * 4] = Math.max(0, Math.min(255, data[idx + finalWidth * 4] + error * 5 / 16));
					if (x + 1 < blockX_end) data[idx + finalWidth * 4 + 4] = Math.max(0, Math.min(255, data[idx + finalWidth * 4 + 4] + error * 1 / 16));
				}
			}
		}
		finalCtx.putImageData(imageData, 0, 0);
		this.processCanvas.width = finalWidth;
		this.processCanvas.height = finalHeight;
		this.processCtx.imageSmoothingEnabled = false;
		this.processCtx.drawImage(finalCanvas, 0, 0);
	}

	applyRegularDithering() {
		const { width: processWidth, height: processHeight } = this.processCanvas;
		const ditherWidth = Math.max(1, Math.floor(processWidth / this.ditherDensity));
		const ditherHeight = Math.max(1, Math.floor(processHeight / this.ditherDensity));
		const ditherCanvas = document.createElement('canvas');
		ditherCanvas.width = ditherWidth;
		ditherCanvas.height = ditherHeight;
		const ditherCtx = ditherCanvas.getContext('2d');
		ditherCtx.drawImage(this.processCanvas, 0, 0, ditherWidth, ditherHeight);
		const imageData = ditherCtx.getImageData(0, 0, ditherWidth, ditherHeight);
		const data = imageData.data;

		for (let i = 0; i < data.length; i += 4) {
			const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
			data[i] = data[i + 1] = data[i + 2] = gray;
		}
		for (let y = 0; y < ditherHeight; y++) {
			for (let x = 0; x < ditherWidth; x++) {
				const idx = (y * ditherWidth + x) * 4;
				const oldPixel = data[idx];
				const newPixel = oldPixel > 128 ? 255 : 0;
				const error = oldPixel - newPixel;
				data[idx] = data[idx + 1] = data[idx + 2] = newPixel;
				if (x + 1 < ditherWidth) data[idx + 4] = Math.max(0, Math.min(255, data[idx + 4] + (error * 7) / 16));
				if (y + 1 < ditherHeight) {
					if (x > 0) data[idx + ditherWidth * 4 - 4] = Math.max(0, Math.min(255, data[idx + ditherWidth * 4 - 4] + (error * 3) / 16));
					data[idx + ditherWidth * 4] = Math.max(0, Math.min(255, data[idx + ditherWidth * 4] + (error * 5) / 16));
					if (x + 1 < ditherWidth) data[idx + ditherWidth * 4 + 4] = Math.max(0, Math.min(255, data[idx + ditherWidth * 4 + 4] + (error * 1) / 16));
				}
			}
		}
		ditherCtx.putImageData(imageData, 0, 0);
		this.processCtx.drawImage(ditherCanvas, 0, 0, processWidth, processHeight);
	}

	applyBacklight() {
		const { width, height } = this.processCanvas;
		const imageData = this.processCtx.getImageData(0, 0, width, height);
		const data = imageData.data;
		const { r, g, b } = this.backlightColor;
		for (let i = 0; i < data.length; i += 4) {
			if (data[i + 3] !== 0 && (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0)) {
				data[i] = r; data[i + 1] = g; data[i + 2] = b;
			}
		}
		this.processCtx.putImageData(imageData, 0, 0);
	}

	finalizeRender() {
		const { innerWidth, innerHeight } = window;
		this.mainCtx.clearRect(0, 0, innerWidth, innerHeight);
		this.mainCtx.drawImage(this.processCanvas, 0, 0, this.processCanvas.width, this.processCanvas.height, 0, 0, innerWidth, innerHeight);
		if (!this.canvas.parentNode) {
			this.targetElement.appendChild(this.canvas);
		}
	}

	async toggleBacklight() {
		if (this.isDestroyed) return;
		this.backlight = !this.backlight;
		await this.render();
	}

	updateSettings(newSettings) {
		if (this.isDestroyed) return;
		const allowedSettings = ['pixelDensity', 'ditherDensity', 'pixelation', 'dithering', 'backlight', 'backlightColor', 'highContrast'];
		let needsRerender = false;
		for (const [key, value] of Object.entries(newSettings)) {
			if (allowedSettings.includes(key) && this[key] !== value) {
                if (key === 'pixelDensity') this[key] = Math.max(1, Math.min(value, 100));
                else if (key === 'ditherDensity') this[key] = Math.max(1, Math.min(value, 10));
				else if (key === 'backlightColor') this[key] = { ...value };
				else this[key] = value;

                if(key === 'pixelDensity' || key === 'pixelation') this.processCanvas = null;
				needsRerender = true;
			}
		}
		if (needsRerender) this.render();
	}

	destroy() {
		this.isDestroyed = true;
		window.removeEventListener("resize", this.handleResize);
		if (this.canvas && this.canvas.parentNode) this.canvas.remove();
		this.canvas = this.captureCanvas = this.processCanvas = this.mainCtx = this.captureCtx = this.processCtx = this.toggleButton = this.targetElement = null;
	}
}
// Browser global
if (typeof window !== 'undefined') {
	window.MonoInk = MonoInk;
}

// ES module export
if (typeof module !== 'undefined' && module.exports) {
	module.exports = MonoInk;
}

// ES6 module export
if (typeof exports !== 'undefined') {
	exports.default = MonoInk;
}