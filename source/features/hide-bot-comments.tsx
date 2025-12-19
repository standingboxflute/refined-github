import './hide-bot-comments.css'
import React from 'dom-chef';
import { $ } from 'select-dom/strict.js';
import { $$, countElements, elementExists } from 'select-dom';
import * as pageDetect from 'github-url-detection';
import delegate, { type DelegateEvent } from 'delegate-it';

import delay from '../helpers/delay.js';
import features from '../feature-manager.js';

let shouldObserve: boolean;
let currentCount = 0;

let observer: MutationObserver = new MutationObserver((mutations) => {
	if (shouldObserve) {
		let shouldUpdate: boolean = false;
		mutations.forEach((mutation) => {
			if (mutation.addedNodes.length > 0) {
				shouldUpdate = true;
			}
		});

		if (shouldUpdate) {
			hideComments();
		}
	}
})

async function unhide(event: DelegateEvent): Promise<void> {
	shouldObserve = false;
	currentCount = 0;
	observer.disconnect;
	for (const comment of $$('.rgh-hidden-bot-comment')) {
		comment.hidden = false;
	}

	//Expand all "similar comments" boxes
	for (const similarCommentsExpandButton of $$('.rgh-hidden-bot-comment')) {
		similarCommentsExpandButton.click();
	}

	await delay(10);

	$('.rgh-hidden-bot-comment').scrollIntoView();
	event.delegateTarget.parentElement!.remove();
	$('.discussion-timeline-actions').prepend(
		<p className="rgh-bot-comments-note">
			<button className="btn-link text-empahsized rgh-hide-bot-comments" type="button">Hide bot comments</button>
		</p>
	)
	delegate('.rgh-hide-bot-comments', 'click', hide);
}

async function hide(event: DelegateEvent) {
	event.delegateTarget.parentElement!.remove();
	hideComments();
	setupObserver();
}

function hideComment(comment: HTMLElement): void {
	if (!comment.hidden) {
		comment.hidden = true;
		comment.classList.add('rgh-hidden-bot-comment')
	}
}

function init(): void {
	hideComments();
	setupObserver();
}

function hideComments() {
	$$('.js-timeline-item').forEach((commentText, index, array) => {
		const comment = commentText.closest('.js-timeline-item')!;
		if (elementExists('.Label', comment)) {
			const label = $('.Label', comment).textContent;
			if (label === 'bot') {
				if (index > 1 && index < array.length - 1) {
					hideComment(comment);
				}
			}
		}
	});

	const hiddenCount = countElements('.rgh-hidden-bot-comment');
	if (hiddenCount > 0) {
		if (elementExists('.discussion-timeline-actions .rgh-bot-comments-note')) {
			$('.discussion-timeline-actions .rgh-bot-comments-note').replaceWith(<p className="rgh-bot-comments-note">
				{`${hiddenCount} bot comment${hiddenCount > 1 ? 's were' : 'was'} automatically hidden.  `}
				<button className="btn-link text-emphasized rgh-unhide-bot-comments" type="button">Show</button>
			</p>);
		} else {
			if (hiddenCount > currentCount) {
				$('.discussion-timeline-actions').prepend(
					<p className="rgh-bot-comments-note">
						{`${hiddenCount} bot comment${hiddenCount > 1 ? 's were' : 'was'} automatically hidden.  `}
						<button className="btn-link text-emphasized rgh-unhide-bot-comments" type="button">Show</button>
					</p>,
				);
				delegate('.rgh-unhide-bot-comments', 'click', unhide)
			}
		}
	}
	currentCount = hiddenCount;
}

function setupObserver() {
	// Watch for dynamically loaded comments
	const targetNode = document.querySelector('.js-discussion');
	if (!targetNode) return;
	shouldObserve = true
	observer.observe(targetNode, {
		childList: true,
		subtree: true
	});
}

void features.add(import.meta.url, {
	include: [
		pageDetect.isPR,
	],
	deduplicate: '.rgh-bot-comments-note',
	awaitDomReady: true,
	init,
});

