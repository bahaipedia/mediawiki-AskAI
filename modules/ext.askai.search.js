/* Shows "Add to AI chat" link near every search result on Special:Search. */

$( function () {
	const $snippets = $( '.searchresult' );
	if ( !$snippets.length ) {
		return;
	}

	const addedSources = [];

	/* Redirect to Special:AI, providing it with the previously added sources */
	function goToSpecial() {
		const title = new mw.Title( 'Special:AI' );
		window.location.href = title.getUrl( {
			wpPages: addedSources.join( '\n' )
		} );
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

			addedSources.push( pageLink.title + '#p' + parNumbers.join( ',' ) );

			$loading.replaceWith( $( '<a>' )
				.attr( 'class', 'mw-askai-search-view' )
				.append( mw.msg( 'askai-search-view' ) )
				.click( goToSpecial )
			);
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
