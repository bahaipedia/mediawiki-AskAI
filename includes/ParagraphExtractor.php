<?php

/**
 * Implements AskAI extension for MediaWiki.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 * http://www.gnu.org/copyleft/gpl.html
 *
 * @file
 */

namespace MediaWiki\AskAI;

use DOMDocument;
use MediaWiki\MediaWikiServices;
use Title;
use Wikimedia\ScopedCallback;

/**
 * Methods to split the page text into paragraphs and to search for paragraph numbers of snippets.
 */
class ParagraphExtractor {
	/** @var Title */
	protected $title;

	/**
	 * @param Title $title
	 */
	public function __construct( Title $title ) {
		$this->title = $title;
	}

	/**
	 * Obtain the text of several paragraphs by their numbers.
	 * @param string $parNumbers List of paragraph numbers, e.g. "1-7,10-12,15".
	 * @return string Concatenated text of requested paragraphs.
	 */
	public function extractParagraphs( $parNumbers ) {
		/* TODO */
	}

	/**
	 * Search this page for all paragraphs that contain $textToFind or its parts.
	 * @param string $textToFind Arbitrary string, e.g. "Sentence is a sequence of words."
	 * @return string List of paragraph numbers, e.g. "1-7,10-12,15".
	 */
	public function findSnippet( $textToFind ) {
		/* TODO */
	}

	/**
	 * Parse this page and split it into paragraphs. Returns array of innerText of every paragraph.
	 * @return string[]
	 */
	public function getAllParagraphs() {
		$page = MediaWikiServices::getInstance()->getWikiPageFactory()->newFromTitle( $this->title );
		$pout = $page->getParserOutput();
		if ( !$pout ) {
			// Page doesn't exist, can't be parsed, etc.
			return [];
		}

		$text = $pout->getRawText();

		// Parse HTML, so that we can extract the paragraphs.
		// Because we don't need to modify/output this HTML, we don't need to bother with RemexHtml
		// and can use less tolerant DOMDocument, ignoring the irrelevant LibXML errors.
		$cleanup = $this->suppressLibXMLErrors();

		$doc = new DOMDocument;
		if ( !$doc->loadHTML( $text ) ) {
			// Failed to parse.
			return [];
		}

		$innerText = [];
		foreach ( $doc->getElementsByTagName( 'p' ) as $element ) {
			// We only want the text of this paragraph (without any HTML tags inside).
			$innerText[] = $element->textContent;
		}
		return $innerText;
	}

	/**
	 * Temporarily suppress LibXML errors. Automatically undone when returned object gets deconstructed.
	 * @return ScopedCallback
	 */
	protected function suppressLibXMLErrors() {
		$prevErrorMode = libxml_use_internal_errors( true );
		return new ScopedCallback( static function () use ( $prevErrorMode ) {
			libxml_clear_errors();
			libxml_use_internal_errors( $prevErrorMode );
		} );
	}
}
