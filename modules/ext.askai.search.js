/* Shows "Add to AI chat" link near every search result on Special:Search. */

$( function () {
	const $snippets = $( '.searchresult' );
	if ( !$snippets.length ) {
		return;
	}

	const addedSources = [],
		specialTitle = new mw.Title( 'Special:AI' );

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
			pageName = $res.find( 'a' ).attr( 'title' ),
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
					addedSources.push( pageName );
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

		// Find the paragraph(s) that contain matched text.
		const snippets = {};
		snippets[ pageName ] = snippet;

		mw.askai.findparInPages( snippets ).then( ( pageAndParagraphs ) => {
			if ( !pageAndParagraphs.length ) {
				showAddPageLink( mw.msg( 'askai-search-add-not-found' ) );
				return;
			}

			addedSources.push( ...pageAndParagraphs );
			replaceWithViewLink( $loading );
		} ).catch( () => {
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
