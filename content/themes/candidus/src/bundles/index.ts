import '../style/index.scss';

import FlowBackground from '../scripts/plugins/FlowBackground';
import PostListControl from '../scripts/modules/posts/PostListControl';
import TextClipper from '../scripts/modules/text/TextClipper';
import PostLoaderControl from '../scripts/modules/posts/PostLoaderControl';

const flowBackground = new FlowBackground();
const postListControl = new PostListControl({
	gridButton: '#grid__button',
	feedButton: '#feed__button',
	gridContainer: '#post__container',
	feedContainer: '#feed__container',
});
const postLoaderControl = new PostLoaderControl({
	loadMoreButton: '#read-more__button',
	postContainer: '#post__container',
	feedContainer: '#feed__container',
});

const postCardExcerptClipper = new TextClipper(document.querySelectorAll('.postcard__body'), 25);
const postFeedExcerptClipper = new TextClipper(document.querySelectorAll('.postfeed__body'), 40);


postCardExcerptClipper.truncate();
postFeedExcerptClipper.truncate();

postListControl.init();
postLoaderControl.init();
flowBackground.init();
