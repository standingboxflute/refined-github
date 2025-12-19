import './hide-bot-comments.css'
import React from 'dom-chef';
import {$} from 'select-dom/strict.js';
import {$$, countElements, elementExists} from 'select-dom';
import * as pageDetect from 'github-url-detection';
import delegate, {type DelegateEvent} from 'delegate-it';

import delay from '../helpers/delay.js';
import features from '../feature-manager.js';

let shouldObserve: boolean;

let observer: MutationObserver = new MutationObserver((mutations) => {
	if (shouldObserve) {
		let shouldUpdate:boolean = false;
		mutations.forEach((mutation) => {
			if(mutation.addedNodes.length > 0) {
				shouldUpdate = true;
			}
		});

		if(shouldUpdate) {
			hideComments();
		}
	}
})

async function unhide(event:DelegateEvent): Promise<void> {
	shouldObserve = false;
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

async function hide(event:DelegateEvent) {
	event.delegateTarget.parentElement!.remove();
	hideComments();
	shouldObserve = true;
	setupObserver();
}

function hideComment(comment: HTMLElement): void {
	if(!comment.hidden) {
		comment.hidden = true;
		comment.classList.add('rgh-hidden-bot-comment')
	}
}

function init(): void {
	hideComments();
	shouldObserve = true;
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

	const botCount = countElements('.rgh-hidden-bot-comment');
	if (botCount > 0) {
		if (elementExists('.discussion-timeline-actions .rgh-bot-comments-note')) {
			$('.discussion-timeline-actions .rgh-bot-comments-note').replaceWith(<p className="rgh-bot-comments-note">
					{`${botCount} bot comment${botCount > 1 ? 's were' : 'was'} automatically hidden.  `}
					<button className="btn-link text-emphasized rgh-unhide-bot-comments" type="button">Show</button>
				</p>);
		} else {
			$('.discussion-timeline-actions').prepend(
				<p className="rgh-bot-comments-note">
					{`${botCount} bot comment${botCount > 1 ? 's were' : 'was'} automatically hidden.  `}
					<button className="btn-link text-emphasized rgh-unhide-bot-comments" type="button">Show</button>
				</p>,
			);
			delegate('.rgh-unhide-bot-comments', 'click', unhide)
		}
	}
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

