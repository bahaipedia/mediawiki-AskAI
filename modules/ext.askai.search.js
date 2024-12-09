/* Shows "Add to AI chat" link near every search result on Special:Search. */

$( function () {
	const $snippets = $( '.searchresult' );
	if ( !$snippets.length ) {
		return;
	}

	const addedSources = [],
		specialTitle = new mw.Title( 'Special:AI' );

	/* Update all links to Special:AI to include previously added sources */
	function updateGotoLinks() {
		$( '.mw-askai-search-view' ).attr( 'href', specialTitle.getUrl( {
			wpPages: addedSources.join( '\n' )
		} ) );
	}

	/**
	 * Compress list of paragraph numbers to shortest form,
	 * e.g. 1,2,3,4,5,6,7,10,11,12,15 to 1-7,10-12,15.
	 *
	 * @param {number[]} numbers
	 * @return {string}
	 */
	function condenseParNumbers( numbers ) {
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

	/* Handler of "Add to AI chat" link */
	function addToAI() {
		const $addLink = $( this ),
			$res = $addLink.parents( '.mw-search-result' ),
			pageLink = $res.find( 'a' )[ 0 ],
			matchedSentences = $res.find( '.searchresult' ).text().trim().split( /\.\s/ );

		const $loading = $( '<span>' )
			.attr( 'class', 'mw-askai-search-adding' )
			.append( mw.msg( 'askai-search-adding' ) );

		$addLink.replaceWith( $loading );

		// Download the article and find the paragraph(s) that contain "matchedText".
		$.get( pageLink.href ).done( ( html ) => {
			const parNumbers = [];

			$( '<div>' ).append( html ).find( '.mw-parser-output > p' ).each( ( idx, p ) => {
				for ( const sentence of matchedSentences ) {
					if ( p.innerText.indexOf( sentence ) !== -1 ) {
						parNumbers.push( idx );
						return;
					}
				}
			} );

			if ( !parNumbers.length ) {
				$loading.replaceWith( mw.msg( 'askai-search-add-not-found' ) );
				return;
			}

			addedSources.push( pageLink.title + '#p' + condenseParNumbers( parNumbers ) );

			$loading.replaceWith( $( '<a>' )
				.attr( 'class', 'mw-askai-search-view' )
				.append( mw.msg( 'askai-search-view' ) )
			);
			updateGotoLinks();
		} ).fail( () => {
			$loading.replaceWith( mw.msg( 'askai-search-add-failed' ) );
		} );
	}

	// Every result should have "Add to AI chat" link
	$snippets.each( ( idx, result ) => {
		$( result ).next( '.mw-search-result-data' ).append( ' ', $( '<a>' )
			.attr( 'class', 'mw-askai-search-add' )
			.append( mw.msg( 'askai-search-add' ) )
			.click( addToAI )
		);
	} );
} );
