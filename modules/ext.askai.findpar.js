/* Methods to find all paragraphs of the article that contain certain text. */

( function () {
	/** Maximum number of times that findText() is allowed to call findWordsRecursive() */
	const recursionLimit = 50;

	/**
	 * If part of the snippet is found in more paragraphs than this, discard these matches,
	 * assuming it to be an overly common word/expression.
	 */
	const tooManyParagraphsLimit = 5;

	/**
	 * If snippet had to be cut into more parts than this to find matches, discard all matches,
	 * assuming that the snippet was generated from a list or table, not a continuous paragraph.
	 */
	const tooManySnippetPartsMatched = 4;

	mw.askai = mw.askai || {};

	/**
	 * Search $document for paragraphs that contain "textToFind", return paragraph numbers.
	 *
	 * @param {string} textToFind Arbitrary string, e.g. "Sentence is a sequence of words."
	 * @param {jQuery} $document Paragraphs to be searched.
	 * @return {string} String that contains paragraph numbers, e.g. "1-7,10-12,15".
	 */
	mw.askai.findpar = function ( textToFind, $document ) {
		const parNumbers = findText( textToFind, $document.find( '.mw-parser-output > p' ) );
		return condenseParNumbers( parNumbers );
	};

	/**
	 * Asynchronously download the page and run mw.askai.findpar() on it.
	 *
	 * @param {string} textToFind Arbitrary string, e.g. "Sentence is a sequence of words."
	 * @param {string} pageName Page in this wiki that should be searched.
	 * @return {Promise<string>} Resolves into "Page_title#p1-7,10-12,15" or (if failed) "".
	 */
	mw.askai.findparInPage = function ( textToFind, pageName ) {
		const title = new mw.Title( pageName );
		const $d = $.Deferred();

		$.get( title.getUrl() ).done( ( html ) => {
			const parNumbers = mw.askai.findpar(
				textToFind,
				$( '<div>' ).append( html )
			);
			if ( !parNumbers ) {
				$d.resolve( '' );
				return;
			}

			$d.resolve( pageName + '#p' + parNumbers );
		} ).fail( () => $d.resolve( '' ) );

		return $d.promise();
	};

	/**
	 * Returns an array of paragraph numbers that are found in $paragraphs.
	 *
	 * @param {jQuery} $paragraphs Paragraphs to be searched.
	 * @return {number[]} E.g. [ 20, 21, 22, 34, 35 ].
	 */
	function getParNumbers( $paragraphs ) {
		return $paragraphs.map( ( idx, par ) => {
			return parseInt( $( par ).data( 'parNumber' ) );
		} ).toArray();
	}

	/**
	 * Remove unnecessary parts of snippet/text that can interfere with matching,
	 * such as quotes, newlines, excessive whitespace, etc.
	 *
	 * @param {string} input
	 * @return {string}
	 */
	function normalizeText( input ) {
		return input.replace( /['"]/g, '' )
			.replace( /\s+/g, ' ' );
	}

	/**
	 * Returns an array of paragraph numbers that contain specified text.
	 *
	 * @param {string} textToFind Arbitrary string, e.g. "Sentence is a sequence of words."
	 * @param {jQuery} $paragraphs Paragraphs to be searched.
	 * @return {number[]} E.g. [ 20, 21, 22, 34, 35 ].
	 */
	function findText( textToFind, $paragraphs ) {
		if ( !textToFind ) {
			return [];
		}

		$paragraphs.each( function ( idx, par ) {
			const $p = $( par );

			// Remember the number that each paragraph has. Used in getParNumbers().
			$p.data( 'parNumber', idx );

			// Remove quotes, because CirrusSearch excludes them from the snippet.
			$p.html( normalizeText( $p.html() ) );
		} );

		// Remove quotes from the snippet, so that behavior without CirrusSearch would be the same.
		textToFind = normalizeText( textToFind );

		let words = textToFind.split( /\s+/ );

		const results = [];
		let limit = 0;

		while ( words.length > 0 ) {
			const result = findWordsRecursive( words, $paragraphs );
			if ( !result ) {
				break;
			} else {
				words = result.leftoverWords;
				result.parNumbers = getParNumbers( result.paragraphs );

				if ( result.parNumbers.length <= tooManyParagraphsLimit ) {
					// New usable result.
					results.push( result );
				} else {
					// This match is useless (too many paragraphs), so we should discard it.
					// However, if one of these matched paragraphs directly follows the paragraph
					// from the previous match, this 1 paragraph is still useful.

					if ( results.length > 0 ) {
						const prev = results[ results.length - 1 ];
						if ( prev.parNumbers.length > 0 ) {
							const prevLastParNumber = prev.parNumbers[ prev.parNumbers.length - 1 ],
								extraParNumber = prevLastParNumber + 1;

							if ( result.parNumbers.indexOf( extraParNumber ) !== -1 ) {
								// This result is still useful.
								if ( prev.parNumbers.indexOf( extraParNumber ) === -1 ) {
									prev.parNumbers.push( extraParNumber );
								}
							}
						}
					}
				}
			}

			if ( limit++ > recursionLimit ) {
				console.log( 'findpar.js: Depth limit reached.' );
				break;
			}
		}

		// Get all paragraph numbers (sorted and unique).
		let parNumbers = [];
		for ( const result of results ) {
			parNumbers = parNumbers.concat( result.parNumbers );
			console.log( 'findpar.js: found paragraphs: query=' + result.query +
				', parNumbers=[' + result.parNumbers.join( ',' ) +
				'], leftoverWords=' + result.leftoverWords );
		}

		if ( results.length > tooManySnippetPartsMatched ) {
			console.log( 'findpar.js: discarding all matches (they are likely incorrect, ' +
				'because snippet was split into too many parts)' );
			return [];
		}

		return [ ...new Set( parNumbers ) ].sort();
	}

	/**
	 * Searches $paragraphs for the longest sequence of strings in "words" array.
	 *
	 * @param {string[]} words Full prompt, e.g. [ "Sentence", "consists", "of", "words." ].
	 * @param {jQuery} $paragraphs Paragraphs to be searched.
	 * @param {string} oldQuery Previously found string, e.g. "Sequential words can form a".
	 * @return {Object|null} Search result. If not null ("not found"), contains the following keys:
	 * {string} query Longest sequence of words from "words" array that have been found.
	 * {jQuery} paragraphs Paragraphs where "query" was found.
	 * {string[]} leftoverWords Remaining words from "words" array that haven't been found yet.
	 */
	function findWordsRecursive( words, $paragraphs, oldQuery = '' ) {
		if ( words.length < 1 ) {
			// Empty prompt.
			return null;
		}

		const query = oldQuery + ( oldQuery ? ' ' : '' ) + words[ 0 ];

		const $found = $paragraphs.filter( ( idx, par ) => {
			return ( par.innerText.indexOf( query ) !== -1 );
		} );
		if ( $found.length === 0 ) {
			// Not found in any of the paragraphs.
			if ( oldQuery === '' ) {
				// Discard the word that wasn't found, try again from the next word.
				words = words.slice( 1 );
				return findWordsRecursive( words, $paragraphs, oldQuery );
			}

			return null;
		} else {
			words = words.slice( 1 );

			const $foundBetter = findWordsRecursive( words, $found, query );
			if ( $foundBetter ) {
				// Succeeded at adding more words.
				return $foundBetter;
			}
			return {
				// Sentence that was found.
				query: query,

				// Where it was found.
				paragraphs: $found,

				// These words are not a continuation of already found sentence "query".
				leftoverWords: words
			};
		}
	}

	/**
	 * Compress list of paragraph numbers to shortest form,
	 * e.g. 1,2,3,4,5,6,7,10,11,12,15 to 1-7,10-12,15.
	 *
	 * @param {number[]} numbers
	 * @return {string}
	 */
	function condenseParNumbers( numbers ) {
		if ( !numbers.length ) {
			return '';
		}

		let next = numbers[ 0 ];
		const ranges = [ {
			start: next,
			end: next
		} ];

		for ( let i = 1; i < numbers.length; i++ ) {
			next = numbers[ i ];

			if ( next === ranges[ ranges.length - 1 ].end + 1 ) {
				// This number can be added to existing range.
				ranges[ ranges.length - 1 ].end = next;
			} else {
				ranges.push( { start: next, end: next } );
			}
		}

		const condensed = [];
		for ( const range of ranges ) {
			const rangeLen = range.end - range.start;
			if ( rangeLen === 0 ) {
				// Only 1 number.
				condensed.push( range.start );
			} else {
				condensed.push( range.start + ( rangeLen === 1 ? ',' : '-' ) + range.end );
			}
		}
		return condensed.join( ',' );
	}
}() );
