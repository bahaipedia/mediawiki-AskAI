/* Shows "Chat with AI" button to Special:Search (after the "Search" button). */

$( function () {
	const $submit = $( '#search [type="submit"], .mw-search-form-wrapper [type="submit"]' );
	if ( !$submit.length ) {
		return;
	}

	const $prompt = $( '#searchText input' ),
		api = new mw.Api();

	let $loading;

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
		if ( !$loading ) {
			// Replace current page with the loading screen.
			$loading = $( '<h1>' ).text( mw.msg( 'askai-chatwith-button' ) );
			mw.util.$content.empty().append( $loading );
		}

		return $( '<p>' ).append( html, ' ' ).appendTo( mw.util.$content );
	}

	/* Handler of "Chat with AI" button */
	function prepareChat() {
		const prompt = $prompt.val().trim();
		if ( !prompt ) {
			return;
		}

		// Initialize loading screen.
		let $todo = displayProgress( mw.msg( 'askai-progress-search', mw.html.escape( prompt ) ) );

		const q = {
			formatversion: 2,
			action: 'query',
			list: 'search',
			srlimit: 500,
			srwhat: 'text',
			srsearch: prompt,
			srprop: 'snippet'
		};
		api.get( q ).fail( () => {
			$todo.append( mw.msg( 'askai-progress-search-fail' ) );
		} ).done( ( ret ) => {
			if ( ret.query.search.length === 0 ) {
				$todo.append( mw.msg( 'askai-progress-search-empty' ) );
				return;
			}

			const snippets = {};
			ret.query.search.forEach( ( found ) => {
				// Not all search results have a snippet. Snippet is necessary
				// to find relevant paragraphs, so skip results without a snippet.
				if ( found.snippet ) {
					const plaintextSnippet = $( '<div>' ).append( found.snippet ).text().trim();
					snippets[ found.title ] = plaintextSnippet;
				}
			} );

			const allPageNames = Object.keys( snippets );
			$todo.append( mw.msg( 'askai-progress-search-ok', allPageNames.length ) );

			$todo = displayProgress( mw.msg( 'askai-progress-narrow', allPageNames.length ) );

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
				return Promise.all(
					pageNames.map( ( pageName ) => {
						const $todo2 = displayProgress(
							mw.msg( 'askai-progress-findpar', mw.html.escape( pageName ) ) );

						return mw.askai.findparInPage(
							snippets[ pageName ],
							pageName
						).then( ( res ) => {
							$todo2.append( res ? mw.msg( 'askai-progress-findpar-ok', res ) :
								mw.msg( 'askai-progress-findpar-empty' ) );
							return res;
						} );
					} )
				);
			} ).then( ( res ) => {
				const pages = res.filter( ( x ) => x );
				if ( !pages.length ) {
					displayProgress( mw.msg( 'askai-progress-findpar-all-empty' ) );
					return;
				}

				displayProgress( mw.msg( 'askai-progress-findpar-all-ok',
					mw.html.escape( pages.join( ', ' ) ) ) );

				const specialTitle = new mw.Title( 'Special:AI' ),
					url = specialTitle.getUrl( {
						wpPages: pages.join( '\n' )
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
			aiinstructions: mw.msg( 'askai-chatwith-instructions' ),
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
