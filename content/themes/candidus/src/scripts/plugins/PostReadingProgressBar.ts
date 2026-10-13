import Control, { ControlStruct } from '../core/base/Control';

interface PostLoaderControlSelectors {
	postReadingBar: string;
	postContainer: string;
}

/**
 * A class representing a reading progress bar for a post.
 */
export default class PostReadingProgressBar extends Control implements ControlStruct {
	private postReadingBar: HTMLProgressElement;
	private postContainer: HTMLElement;

	/**
	 * Creates a PostReadingProgressBar instance.
	 *
	 * @param {Object} options - The selectors for the progress bar and post container.
	 * @param {string} options.postReadingBar - Selector for the progress bar element.
	 * @param {string} options.postContainer - Selector for the post container element.
	 */
	constructor({ postReadingBar, postContainer }: PostLoaderControlSelectors) {
		super(postReadingBar, postContainer);
		this.postReadingBar = this.$query(postReadingBar) as HTMLProgressElement;
		this.postContainer = this.$query(postContainer);
	}

	/**
	 * Initializes the progress bar by showing it and starting the monitoring.
	 */
	public init() {
		if (this.valid) {
			this.positionProgressBar();
			window.addEventListener('resize', () => this.positionProgressBar());
			this.showProgressBar();
			this.monitorProgressBar();
		}
	}

	/**
	 * Places the bar directly below the navbar, whose height varies with
	 * the viewport.
	 */
	private positionProgressBar() {
		const navbar = this.$query('#navbar__container');
		if (navbar) {
			this.postReadingBar.style.top = `${navbar.getBoundingClientRect().height}px`;
		}
	}

	/**
	 * Shows the progress bar by setting its opacity to 1.
	 */
	private showProgressBar() {
		this.postReadingBar.style.opacity = '1';
	}

	/**
	 * Continuously monitors the reading progress by updating the progress bar value.
	 */
	private monitorProgressBar() {
		let frameListening = () => {
			const contentBox = this.postContainer.getBoundingClientRect();
			const midPoint = window.innerHeight / 2;
			if (contentBox.top > midPoint) {
				this.postReadingBar.value = 0;
			}
			if (contentBox.top < midPoint) {
				this.postReadingBar.value = this.postReadingBar.max;
			}
			if (contentBox.top <= midPoint && contentBox.bottom >= midPoint) {
				this.postReadingBar.value =
					(this.postReadingBar.max * Math.abs(contentBox.top - midPoint)) / contentBox.height;
			}
			window.requestAnimationFrame(frameListening);
		};
		window.requestAnimationFrame(frameListening);
	}
}

