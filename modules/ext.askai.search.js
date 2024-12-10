/* Shows "Add to AI chat" link near every search result on Special:Search. */

$( function () {
	const $snippets = $( '.searchresult' );
	if ( !$snippets.length ) {
		return;
	}

	const addedSources = [],
		specialTitle = new mw.Title( 'Special:AI' );

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

	/**
	 * Replace element $elem with "View AI chat" link.
	 *
	 * @param {jQuery} $elem
	 */
	function replaceWithViewLink( $elem ) {
		$elem.replaceWith( $( '<a>' )
			.attr( 'class', 'mw-askai-search-view' )
			.append( mw.msg( 'askai-search-view' ) )
		);

		// Update all links to Special:AI to include previously added sources
		$( '.mw-askai-search-view' ).attr( 'href', specialTitle.getUrl( {
			wpPages: addedSources.join( '\n' )
		} ) );
	}

	/* Handler of "Add to AI chat" link */
	function addToAI() {
		const $addLink = $( this ),
			$res = $addLink.parents( '.mw-search-result' ),
			pageLink = $res.find( 'a' )[ 0 ],
			snippet = $res.find( '.searchresult' ).text().trim();

		const $loading = $( '<span>' )
			.attr( 'class', 'mw-askai-search-adding' )
			.append( mw.msg( 'askai-search-adding' ) );

		$addLink.replaceWith( $loading );

		/**
		 * Replace $loading with "Add the entire page" link.
		 * This is fallback behavior for when paragraph numbers weren't found.
		 *
		 * @param {mw.Message} reasonMsg
		 */
		function showAddPageLink( reasonMsg ) {
			const $addPageLink = $( '<a>' )
				.attr( 'class', 'mw-askai-search-add-page' )
				.append( mw.msg( 'askai-search-add-page' ) )
				.click( function () {
					addedSources.push( pageLink.title );
					replaceWithViewLink( $( this ).parent() );
				} );

			$loading.replaceWith( $( '<span>' )
				.attr( 'class', 'mw-askai-search-failed' )
				.append(
					reasonMsg,
					' ',
					$addPageLink
				)
			);
		}

		// Download the article and find the paragraph(s) that contain "matchedText".
		$.get( pageLink.href ).done( ( html ) => {
			const parNumbers = mw.askai.findpar(
				snippet,
				$( '<div>' ).append( html )
			);

			if ( !parNumbers.length ) {
				showAddPageLink( mw.msg( 'askai-search-add-not-found' ) );
				return;
			}

			addedSources.push( pageLink.title + '#p' + condenseParNumbers( parNumbers ) );
			replaceWithViewLink( $loading );
		} ).fail( () => {
			showAddPageLink( mw.msg( 'askai-search-add-failed' ) );
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
