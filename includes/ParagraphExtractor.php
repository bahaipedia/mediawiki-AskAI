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
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use Psr\Log\LoggerInterface;
use Title;
use Wikimedia\ScopedCallback;

/**
 * Methods to split the page text into paragraphs and to search for paragraph numbers of snippets.
 */
class ParagraphExtractor {
	protected const LIMITS = [
		// Maximum number of times that findSnippet() is allowed to call findWordsRecursive()
		'recursionCalls' => 50,

		// If part of the snippet is found in more paragraphs than this, discard these matches,
		// assuming it to be an overly common word/expression.
		'partInTooManyParagraphs' => 5,

		// If findSnippet() found more paragraphs than this, log it as warning.
		'logIfParagraphCountIsGreaterThan' => 7,

		// If findSnippet() found more paragraphs than this, discard all matches as uncertain,
		// assuming that the snippet was generated from a list or table, not a continuous paragraph.
		'discardIfParagraphCountIsGreaterThan' => 12
	];

	/** @var LoggerInterface */
	protected $logger;

	/** @var Title */
	protected $title;

	/**
	 * @param Title $title
	 */
	public function __construct( Title $title ) {
		$this->title = $title;
		$this->logger = LoggerFactory::getInstance( 'FindParagraph' );
	}

	/**
	 * Obtain the text of several paragraphs by their numbers.
	 * @param string $parNumbers List of paragraph numbers (e.g. "1-7,10-12,15") or "" for entire page.
	 * @return string[] Concatenated text of requested paragraphs.
	 */
	public function extractParagraphs( $parNumbers ) {
		$allParagraphs = $this->getAllParagraphs();
		if ( $parNumbers === '' ) {
			return $allParagraphs;
		}

		return array_map( static function ( $index ) use ( $allParagraphs ) {
			return $allParagraphs[$index];
		}, $this->unpackParNumbers( $parNumbers ) );
	}

	/**
	 * Parse this page and split it into paragraphs. Returns array of innerText of every paragraph.
	 * @return string[]
	 */
	protected function getAllParagraphs() {
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
			$innerText[] = trim( $element->textContent );
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

	/**
	 * Uncompress the shortened list of paragraph numbers (with ranges) into an array of numbers.
	 * @param string $parNumbers List of paragraph numbers, e.g. "1-7,10-12,15".
	 * @return int[] Array of paragraph numbers, e.g. [ 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 15 ].
	 */
	public function unpackParNumbers( $parNumbers ) {
		$indexes = [];
		foreach ( explode( ',', $parNumbers ) as $pair ) {
			$range = explode( '-', $pair );
			$start = (int)$range[0];
			$end = $range[1] ?? $start;

			for ( $idx = $start; $idx <= $end; $idx++ ) {
				$indexes[] = $idx;
			}
		}

		return $indexes;
	}

	/**
	 * Compress the array of paragraph numbers to shortest string form.
	 * @param int[] $indexes Array of paragraph numbers, e.g. [ 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 15 ].
	 * @return string List of paragraph numbers, e.g. "1-7,10-12,15".
	 */
	public function packParNumbers( $indexes ) {
		if ( !$indexes ) {
			return '';
		}

		// Find any groups of sequential numbers, e.g. "1,2,3,4".
		$first = array_shift( $indexes );
		$ranges = [ [ 'start' => $first, 'end' => $first ] ];
		foreach ( $indexes as $number ) {
			if ( $number === $ranges[count( $ranges ) - 1]['end'] + 1 ) {
				// This number can be added to existing range.
				$ranges[count( $ranges ) - 1]['end'] = $number;
			} else {
				$ranges[] = [ 'start' => $number, 'end' => $number ];
			}
		}

		$packed = [];
		foreach ( $ranges as $range ) {
			$rangeLen = $range['end'] - $range['start'];
			if ( $rangeLen === 0 ) {
				// Only 1 number.
				$packed[] = $range['start'];
			} else {
				$packed[] = $range['start'] . ( $rangeLen === 1 ? ',' : '-' ) . $range['end'];
			}
		}

		return implode( ',', $packed );
	}

	/**
	 * Search this page for all paragraphs that contain $textToFind or its parts.
	 * @param string $textToFind Arbitrary string, e.g. "Sentence is a sequence of words."
	 * @return string List of paragraph numbers, e.g. "1-7,10-12,15".
	 */
	public function findSnippet( $textToFind ) {
		if ( !$textToFind ) {
			return '';
		}

		$paragraphs = $this->getAllParagraphs();
		if ( !$paragraphs ) {
			return '';
		}

		// Remove quotes from the snippet, so that behavior without CirrusSearch would be the same.
		$textToFind = $this->normalizeTextForSearch( $textToFind );
		$paragraphs = array_map( function ( $text ) {
			return $this->normalizeTextForSearch( $text );
		}, $paragraphs );

		$words = explode( ' ', $textToFind );
		$results = [];
		$limit = 0;

		while ( $words ) {
			$result = $this->findWordsRecursive( $words, $paragraphs );
			if ( !$result ) {
				break;
			}

			$words = $result['leftoverWords'];
			$result['parNumbers'] = array_keys( $result['paragraphs'] );

			if ( count( $result['parNumbers'] ) <= self::LIMITS['partInTooManyParagraphs'] ) {
				// New usable result.
				$results[] = $result;
			} else {
				// This match is useless (too many paragraphs), so we should discard it.
				// However, if one of these matched paragraphs directly follows the paragraph
				// from the previous match, this 1 paragraph is still useful.
				if ( $results ) {
					$prev = $results[count( $results ) - 1];
					$prevParCount = count( $prev['parNumbers'] );
					if ( $prevParCount ) {
						$extraParNumber = $prev['parNumbers'][$prevParCount - 1] + 1;
						if ( in_array( $extraParNumber, $result['parNumbers'] ) ) {
							// This result is still useful.
							$prev['parNumbers'][] = $extraParNumber;
						}
					}
				}
			}

			if ( $limit++ > self::LIMITS['recursionCalls'] ) {
				// Depth limit reached.
				break;
			}
		}

		// Get all paragraph numbers (sorted and unique).
		$parNumbers = [];
		$debugInfo = [];
		foreach ( $results as $result ) {
			$parNumbers = array_merge( $parNumbers, $result['parNumbers'] );
			$debugInfo[] = "\n\tfound paragraphs: query=\"" . $result['query'] .
				'\", parNumbers=[' . implode( ',', $result['parNumbers'] ) .
				'], leftoverWords="' . implode( ',', $result['leftoverWords'] ) . '"';
		}
		$parNumbers = array_unique( $parNumbers );
		sort( $parNumbers );
		$packedParNumbers = $this->packParNumbers( $parNumbers );

		$count = count( $parNumbers );
		$logContext = [
			'title' => $this->title->getPrefixedText(),
			'textToFind' => $textToFind,
			'count' => $count,
			'parNumbers' => $packedParNumbers,
			'debugInfo' => implode( '', $debugInfo )
		];
		$this->logger->info(
			'findpar: [[{title}]]: looking for "{textToFind}": found in {count} paragraphs: ' .
				'parNumbers="{parNumbers}". {debugInfo}',
			$logContext
		);

		if ( $count > self::LIMITS['logIfParagraphCountIsGreaterThan'] ) {
			$warningText = 'findpar: [[{title}]]: too many paragraphs found ({count}) when looking for "{textToFind}".';

			$discardResult = ( $count > self::LIMITS['discardIfParagraphCountIsGreaterThan'] );
			if ( $discardResult ) {
				$warningText .= ' Result discarded.';
				$this->logger->error( $warningText, $logContext );
				return '';
			}

			$this->logger->warning( $warningText, $logContext );
		}

		return $packedParNumbers;
	}

	/**
	 * Searches $paragraphs for the longest sequence of strings in $words array.
	 *
	 * @param string[] $words Full prompt, e.g. [ "Sentence", "consists", "of", "words." ].
	 * @param array<int,string> $paragraphs Paragraphs to be searched.
	 * @param string $oldQuery Previously found string, e.g. "Sequential words can form a".
	 * @return ?array Search result. If not null ("not found"), contains the following keys:
	 * string query Longest sequence of words from "words" array that have been found.
	 * string[] paragraphs Paragraphs where "query" was found.
	 * string[] leftoverWords Remaining words from "words" array that haven't been found yet.
	 * @phan-return ?array{query:string,paragraphs:array<int,string>,leftoverWords:string[]}
	 */
	protected function findWordsRecursive( array $words, array $paragraphs, $oldQuery = '' ) {
		if ( !$words ) {
			// Empty prompt.
			return null;
		}

		$query = $oldQuery . ( $oldQuery ? ' ' : '' ) . array_shift( $words );

		$found = array_filter( $paragraphs, static function ( $text ) use ( $query ) {
			return str_contains( $text, $query );
		} );
		if ( !$found ) {
			// Not found in any of the paragraphs.
			if ( $oldQuery === '' ) {
				// Discard the word that wasn't found, try again from the next word.
				return $this->findWordsRecursive( $words, $paragraphs, $oldQuery );
			}
			return null;
		}

		$foundBetter = $this->findWordsRecursive( $words, $found, $query );
		if ( $foundBetter ) {
			// Succeeded at adding more words.
			return $foundBetter;
		}

		return [
			// Sentence that was found.
			'query' => $query,

			// Where it was found.
			'paragraphs' => $found,

			// These words are not a continuation of already found sentence "query".
			'leftoverWords' => $words
		];
	}

	/**
	 * Remove unnecessary parts of snippet/text that can interfere with matching,
	 * such as quotes, newlines, excessive whitespace, etc.
	 *
	 * @param string $text
	 * @return string
	 */
	protected function normalizeTextForSearch( $text ) {
		$text = str_replace( [ '"', "'" ], '', $text );
		return preg_replace( '/\s+/', ' ', $text );
	}
}
