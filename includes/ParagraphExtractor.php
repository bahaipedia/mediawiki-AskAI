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

use Title;

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
}
