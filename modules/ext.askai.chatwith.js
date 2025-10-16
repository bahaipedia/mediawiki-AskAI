/* Shows "Chat with AI" button to Special:Search (after the "Search" button). */

$( function () {
	const $submit = $( '#search [type="submit"], .mw-search-form-wrapper [type="submit"]' );
	if ( !$submit.length ) {
		return;
	}

	const api = new mw.Api();
	let isLoading;

	// Add "Chat with AI" button.
	const $chatButton = $submit.clone()
		.attr( 'type', 'button' )
		.addClass( 'mw-askai-chatwith' )
		.click( prepareChat )
		.insertAfter( $submit );

	$chatButton.find( '.oo-ui-labelElement-label' ).text( mw.msg( 'askai-chatwith-button' ) );

	/**
	 * Add more HTML to the loading screen (shown after "Chat with AI" button is clicked).
	 *
	 * @param {string} html
	 * @return {jQuery} Newly added element.
	 */
	function displayProgress( html ) {
		if ( !isLoading ) {
			// Replace current page with the loading screen.
			isLoading = true;
			mw.util.$content.empty().append(
				$( '<h1>' ).text( mw.msg( 'askai-chatwith-button' ) ),
				$( '<p>' ).text( mw.msg( 'askai-progress-header' ) )
			);
		}

		return $( '<p>' ).append( html, ' ' ).appendTo( mw.util.$content );
	}

	/**
	 * Get the list of search results from this wiki.
	 * Because "Chat with AI" is used on Special:Search, we can just get the titles/snippets
	 * that are currently being displayed.
	 *
	 * @return {Promise<Object>} Map of snippets: { 'Title 1': 'HTML snippet 1', ... }
	 */
	function getSearchResults() {
		const snippets = {};

		$( '.mw-search-result' ).each( ( idx, entry ) => {
			const $entry = $( entry ),
				title = $entry.find( '.mw-search-result-heading a' ).attr( 'title' ),
				snippet = $entry.find( '.searchresult' ).text();

			snippets[ title ] = snippet;
		} );

		return Promise.resolve( snippets );
	}

	/* Handler of "Chat with AI" button */
	function prepareChat() {
		getSearchResults().then( ( snippets ) => {
			const allPageNames = Object.keys( snippets );
			if ( allPageNames.length === 0 ) {
				// Nothing found.
				return;
			}

			const $todo = displayProgress( mw.msg( 'askai-progress-narrow', allPageNames.length ) );

			narrowDownPageNames( allPageNames ).fail( () => {
				$todo.append( mw.msg( 'askai-progress-narrow-empty' ) );
			} ).then( ( pageNames ) => {
				if ( pageNames.length === 0 ) {
					$todo.append( mw.msg( 'askai-progress-narrow-empty' ) );
					return;
				}

				$todo.append( mw.msg( 'askai-progress-narrow-ok', pageNames.length ), '<br>' );

				if ( pageNames.length < allPageNames.length ) {
					// At least 1 page was excluded.
					// Show the list of excluded pages to user.
					displayProgress( $( '<b>' ).append( mw.msg( 'askai-excluded-pages' ) ) );
					displayProgress( allPageNames.filter( ( name ) =>
						pageNames.indexOf( name ) === -1
					).map( mw.html.escape ).join( '<br>' ) );
				}

				displayProgress( $( '<b>' ).append( mw.msg( 'askai-included-pages' ) ) );
				displayProgress( pageNames.map( mw.html.escape ).join( '<br>' ) );

				// Download each of the articles and find the paragraphs that have the snippet.
				return mw.askai.findparInPages( snippets );
			} ).then( ( foundPages ) => {
				if ( !foundPages.length ) {
					displayProgress( mw.msg( 'askai-progress-findpar-empty' ) );
					return;
				}

				displayProgress( mw.msg( 'askai-progress-findpar-ok',
					mw.html.escape( foundPages.join( ', ' ) ) ) );

				const specialTitle = new mw.Title( 'Special:AI' ),
					url = specialTitle.getUrl( {
						wpPages: foundPages.join( '\n' )
					} );

				if ( window.location.href.indexOf( 'redirect=no' ) === -1 ) {
					// Immediately redirect to Special:AI.
					window.location.href = url;
				} else {
					// User can further inspect the progress page by adding ?redirect=no
					// to URL of Special:Search.
					displayProgress( $( '<a>' ).attr( 'href', url )
						.attr( 'class', 'mw-askai-search-view' )
						.append( mw.msg( 'askai-search-view' ) ) );
				}
			} );
		} );
	}

	/**
	 * Ask AI to narrow down successful search results (received from the API)
	 * to only the most relevant pages.
	 *
	 * @param {string[]} pageNames List of article names in this wiki.
	 * @return {Promise<string[]>} Shortened subset of pageNames.
	 */
	function narrowDownPageNames( pageNames ) {
		const q = {
			formatversion: 2,
			action: 'query',
			prop: 'askai',
			aiinstructionspage: 'askai-chatwith-instructions',
			aiprompt: pageNames.join( '\n' )
		};
		return api.postWithToken( 'csrf', q ).then( ( ret ) => {
			console.log( 'Chat with API: API query (prop=askai) succeeded: ' + JSON.stringify( ret ) );

			const result = ret.query.askai;
			if ( result.service === 'DebugService' ) {
				// DebugService doesn't know how to answer "narrow down" question.
				return pageNames;
			}

			return result.response.split( '\n' )
				.filter( ( x ) => x && !x.match( /Here are the|relevant content/ ) )
				.map( ( x ) => x.replace( /^-/, '' ).trim() )
				.filter( ( x ) => x );
		} ).fail( ( code, ret ) => {
			console.log( 'Chat with AI: API query (prop=askai) failed: ' + JSON.stringify( ret ) );
			return [];
		} );
	}
} );
