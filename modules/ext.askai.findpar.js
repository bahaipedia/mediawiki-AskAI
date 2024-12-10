/* Methods to find all paragraphs of the article that contain certain text. */

( function () {
	/** Maximum number of times that findText() is allowed to call findWordsRecursive() */
	const recursionLimit = 50;

	mw.askai = mw.askai || {};

	/**
	 * Search $document for paragraphs that contain "textToFind", return array of paragraph numbers.
	 *
	 * @param {string} textToFind Arbitrary string, e.g. "Sentence is a sequence of words."
	 * @param {jQuery} $document Paragraphs to be searched.
	 * @return {number[]} E.g. [ 20, 21, 22, 34, 35 ].
	 */
	mw.askai.findpar = function ( textToFind, $document ) {
		return findText( textToFind, $document.find( '.mw-parser-output > p' ) );
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
	 * Returns an array of paragraph numbers that contain specified text.
	 *
	 * @param {string} textToFind Arbitrary string, e.g. "Sentence is a sequence of words."
	 * @param {jQuery} $paragraphs Paragraphs to be searched.
	 * @return {number[]} E.g. [ 20, 21, 22, 34, 35 ].
	 */
	function findText( textToFind, $paragraphs ) {
		$paragraphs.each( function ( idx, par ) {
			// Remember the number that each paragraph has. Used in getParNumbers().
			$( par ).data( 'parNumber', idx );
		} );

		let words = textToFind.split( /\s+/ );

		const results = [];
		let limit = 0;

		while ( words.length > 0 ) {
			const result = findWordsRecursive( words, $paragraphs );
			if ( !result ) {
				break;
			} else {
				results.push( result );
				words = result.leftoverWords;
			}

			if ( limit++ > recursionLimit ) {
				console.log( 'findpar.js: Depth limit reached.' );
				break;
			}
		}

		// Get all paragraph numbers (sorted and unique).
		let parNumbers = [];
		for ( const result of results ) {
			parNumbers = parNumbers.concat( getParNumbers( result.paragraphs ) );
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
}() );
