import Control, { ControlStruct } from '../core/base/Control';

interface FlowNode {
	baseX: number;
	baseY: number;
	x: number;
	y: number;
	radius: number;
	phase: number;
	driftSpeed: number;
	isPending?: boolean;
}

interface FlowEdge {
	from: number;
	to: number;
}

interface Pulse {
	edge: number;
	t: number;
	speed: number;
	size: number;
	color: string;
	direction: 1 | -1;
}

/**
 * @class FlowBackground
 * @implements ControlStruct
 * @description Animated page background of the index page. It shows a canvas
 *              of drifting nodes (the connected systems) linked by edges,
 *              with data pulses travelling along them (see the AppRectContainer
 *              component of the design system). A user can click empty
 *              background space to connect two new nodes.
 */
export default class FlowBackground extends Control implements ControlStruct {
	private readonly NODE_COUNT: number = 18;

	private canvas: HTMLCanvasElement;
	private canvasPrimary: string = '64, 156, 255';
	private canvasSecondary: string = '178, 122, 255';

	private nodes: FlowNode[] = [];
	private edges: FlowEdge[] = [];
	private pulses: Pulse[] = [];
	private pendingNodeIndex: number | null = null;

	private animationFrameId: number | null = null;
	private lastTimestamp: number | null = null;
	private width: number = 0;
	private height: number = 0;

	private themeObserver: MutationObserver | null = null;

	constructor() {
		super('body');
	}

	/**
	 * @desc Mount the canvas container and start the animation
	 */
	public init() {
		if (!this.valid) {
			return;
		}
		this.mount();
		this.readThemeSettings();
		this.resize();
		this.bindEvents();
		this.updateAnimationState();
	}

	/**
	 * @desc Create the background elements and prepend them to the body
	 */
	private mount() {
		const container = document.createElement('div');
		container.className = 'flow';
		container.setAttribute('aria-hidden', 'true');

		this.canvas = document.createElement('canvas');
		this.canvas.className = 'flow__canvas';

		const glowPrimary = document.createElement('div');
		glowPrimary.className = 'flow__glow flow__glow--primary';

		const glowSecondary = document.createElement('div');
		glowSecondary.className = 'flow__glow flow__glow--secondary';

		container.append(this.canvas, glowPrimary, glowSecondary);
		document.body.prepend(container);
	}

	/**
	 * @desc Read the canvas colors from the current theme's CSS tokens
	 */
	private readThemeSettings() {
		const styles = getComputedStyle(document.documentElement);
		const primary = styles.getPropertyValue('--canvas-primary').trim();
		const secondary = styles.getPropertyValue('--canvas-secondary').trim();
		if (primary) {
			this.canvasPrimary = primary;
		}
		if (secondary) {
			this.canvasSecondary = secondary;
		}
	}

	/**
	 * @desc Bind resize, visibility, click and theme change listeners
	 */
	private bindEvents() {
		window.addEventListener('resize', () => this.resize());
		window.addEventListener('click', (event) => this.handleBackgroundClick(event));
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) {
				this.stop();
			} else {
				this.updateAnimationState();
			}
		});

		// Theme changes replace the canvas colors
		this.themeObserver = new MutationObserver(() => {
			this.readThemeSettings();
			this.updateAnimationState();
		});
		this.themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		});
	}

	private random(min: number, max: number): number {
		return min + Math.random() * (max - min);
	}

	private prefersReducedMotion(): boolean {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	private createPulse(edgeIndex?: number): Pulse {
		return {
			edge: edgeIndex ?? Math.floor(Math.random() * this.edges.length),
			t: Math.random(),
			speed: this.random(0.045, 0.12),
			size: this.random(1.4, 2.6),
			color: Math.random() > 0.3 ? this.canvasPrimary : this.canvasSecondary,
			direction: Math.random() > 0.5 ? 1 : -1,
		};
	}

	/**
	 * @desc Distribute nodes across the canvas and connect each of them
	 *       to its closest neighbours
	 */
	private buildGraph() {
		this.nodes = [];
		this.edges = [];
		this.pulses = [];
		this.pendingNodeIndex = null;

		const nodeCount = Math.max(10, Math.min(this.NODE_COUNT, Math.floor(this.width / 80)));

		for (let i = 0; i < nodeCount; i++) {
			const x = this.random(0.04, 0.96) * this.width;
			const y = this.random(0.04, 0.96) * this.height;
			this.nodes.push({
				baseX: x,
				baseY: y,
				x,
				y,
				radius: this.random(1.8, 4),
				phase: this.random(0, Math.PI * 2),
				driftSpeed: this.random(0.1, 0.35),
			});
		}

		this.nodes.forEach((node, i) => {
			const neighbours = this.nodes
				.map((other, j) => ({
					index: j,
					distance: Math.hypot(other.baseX - node.baseX, other.baseY - node.baseY),
				}))
				.filter(({ index }) => index !== i)
				.sort((a, b) => a.distance - b.distance);

			for (let k = 0; k < 2 && k < neighbours.length; k++) {
				const target = neighbours[k].index;
				const exists = this.edges.some(
					(edge) =>
						(edge.from === i && edge.to === target) || (edge.from === target && edge.to === i),
				);
				if (!exists) {
					this.edges.push({ from: i, to: target });
				}
			}
		});

		const pulseCount = Math.ceil(this.edges.length / 2);
		for (let i = 0; i < pulseCount; i++) {
			this.pulses.push(this.createPulse());
		}
	}

	private drawFrame(ctx: CanvasRenderingContext2D, delta: number, time: number) {
		ctx.clearRect(0, 0, this.width, this.height);

		// Nodes drift gently around their base position
		this.nodes.forEach((node) => {
			node.x = node.baseX + Math.sin(time * node.driftSpeed + node.phase) * 12;
			node.y = node.baseY + Math.cos(time * node.driftSpeed * 0.7 + node.phase) * 9;
		});

		// Edges
		ctx.lineWidth = 1;
		this.edges.forEach((edge) => {
			const from = this.nodes[edge.from];
			const to = this.nodes[edge.to];
			ctx.beginPath();
			ctx.moveTo(from.x, from.y);
			ctx.lineTo(to.x, to.y);
			ctx.strokeStyle = `rgba(${this.canvasPrimary}, 0.08)`;
			ctx.stroke();
		});

		// Data pulses travelling along the edges
		this.pulses.forEach((pulse, i) => {
			const edge = this.edges[pulse.edge];
			if (!edge) {
				this.pulses[i] = this.createPulse();
				return;
			}

			pulse.t += (pulse.speed * delta * pulse.direction) / 1000;
			if (pulse.t >= 1 || pulse.t <= 0) {
				this.pulses[i] = this.createPulse();
				return;
			}

			const from = this.nodes[edge.from];
			const to = this.nodes[edge.to];
			const color = pulse.color;

			const x = from.x + (to.x - from.x) * pulse.t;
			const y = from.y + (to.y - from.y) * pulse.t;

			// Comet trail
			const dx = to.x - from.x;
			const dy = to.y - from.y;
			const length = Math.hypot(dx, dy) || 1;
			const trailLength = Math.min(34, length * 0.18);
			const tailX = x - (dx / length) * trailLength * pulse.direction;
			const tailY = y - (dy / length) * trailLength * pulse.direction;

			const trail = ctx.createLinearGradient(tailX, tailY, x, y);
			trail.addColorStop(0, `rgba(${color}, 0)`);
			trail.addColorStop(1, `rgba(${color}, 0.35)`);

			ctx.beginPath();
			ctx.moveTo(tailX, tailY);
			ctx.lineTo(x, y);
			ctx.strokeStyle = trail;
			ctx.lineWidth = 1.6;
			ctx.stroke();

			// Glowing packet head
			ctx.beginPath();
			ctx.arc(x, y, pulse.size, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(${color}, 0.9)`;
			ctx.shadowColor = `rgba(${color}, 0.9)`;
			ctx.shadowBlur = 10;
			ctx.fill();
			ctx.shadowBlur = 0;
		});

		// Nodes - the connected systems
		this.nodes.forEach((node) => {
			if (node.isPending) {
				// First click waiting for its counterpart: pulsing ring
				const pulse = 2.5 + Math.sin(time * 4) * 2;
				ctx.beginPath();
				ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(${this.canvasSecondary}, 0.5)`;
				ctx.fill();

				ctx.beginPath();
				ctx.arc(node.x, node.y, node.radius + 3 + pulse, 0, Math.PI * 2);
				ctx.strokeStyle = `rgba(${this.canvasSecondary}, 0.5)`;
				ctx.lineWidth = 1.2;
				ctx.stroke();
				return;
			}

			ctx.beginPath();
			ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(${this.canvasPrimary}, 0.3)`;
			ctx.fill();

			ctx.beginPath();
			ctx.arc(node.x, node.y, node.radius + 2.5, 0, Math.PI * 2);
			ctx.strokeStyle = `rgba(${this.canvasPrimary}, 0.16)`;
			ctx.lineWidth = 1;
			ctx.stroke();
		});
	}

	private draw = (timestamp: number) => {
		const ctx = this.canvas?.getContext('2d');
		if (!this.canvas || !ctx) {
			return;
		}

		if (this.lastTimestamp === null) {
			this.lastTimestamp = timestamp;
		}
		const delta = Math.min(50, timestamp - this.lastTimestamp);
		this.lastTimestamp = timestamp;

		this.drawFrame(ctx, delta, timestamp / 1000);

		this.animationFrameId = requestAnimationFrame(this.draw);
	};

	private renderStaticFrame() {
		const ctx = this.canvas?.getContext('2d');
		if (ctx) {
			this.drawFrame(ctx, 0, performance.now() / 1000);
		}
	}

	private addNodeAt(x: number, y: number): number {
		this.nodes.push({
			baseX: x,
			baseY: y,
			x,
			y,
			radius: 3,
			phase: this.random(0, Math.PI * 2),
			driftSpeed: 0.25,
			isPending: true,
		});
		return this.nodes.length - 1;
	}

	/**
	 * @desc Never place interactive nodes on top of controls a user interacts with
	 */
	private isInteractiveTarget(target: EventTarget | null): boolean {
		return (
			target instanceof Element &&
			target.closest(
				'a, button, input, textarea, select, label, .navbar, .sidebar, .footer, .toolbar, .postcard, .postfeed, .postbanner, .subscribe, .tagcloud, .swiper',
			) !== null
		);
	}

	private handleBackgroundClick(event: MouseEvent) {
		if (event.button !== 0 || this.isInteractiveTarget(event.target)) {
			return;
		}

		if (this.pendingNodeIndex === null) {
			this.pendingNodeIndex = this.addNodeAt(event.clientX, event.clientY);
		} else {
			const fromIndex = this.pendingNodeIndex;
			this.pendingNodeIndex = null;
			this.nodes[fromIndex].isPending = false;

			const toIndex = this.addNodeAt(event.clientX, event.clientY);
			this.nodes[toIndex].isPending = false;

			const edgeIndex = this.edges.length;
			this.edges.push({ from: fromIndex, to: toIndex });
			this.pulses.push(this.createPulse(edgeIndex));
			this.pulses.push(this.createPulse(edgeIndex));
		}

		if (this.prefersReducedMotion()) {
			this.renderStaticFrame();
		}
	}

	private resize() {
		if (!this.canvas) {
			return;
		}

		const dpr = window.devicePixelRatio || 1;
		this.width = window.innerWidth;
		this.height = window.innerHeight;

		this.canvas.width = this.width * dpr;
		this.canvas.height = this.height * dpr;
		this.canvas.style.width = `${this.width}px`;
		this.canvas.style.height = `${this.height}px`;

		const ctx = this.canvas.getContext('2d');
		if (ctx) {
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}

		this.buildGraph();

		if (this.prefersReducedMotion()) {
			this.renderStaticFrame();
		}
	}

	private start() {
		if (this.animationFrameId === null) {
			this.lastTimestamp = null;
			this.animationFrameId = requestAnimationFrame(this.draw);
		}
	}

	private stop() {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	/**
	 * @desc The animation loop is paused when a user prefers reduced motion.
	 *       A single static frame is rendered instead.
	 */
	private updateAnimationState() {
		if (this.prefersReducedMotion()) {
			this.stop();
			this.renderStaticFrame();
		} else {
			this.start();
		}
	}
}
