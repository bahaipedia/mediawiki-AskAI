/* Shows "Chat with AI" button to Special:Search (after the "Search" button). */

$( function () {
	const $submit = $( '#search [type="submit"]' );
	if ( !$submit.length ) {
		return;
	}

	const $prompt = $( '#searchText input' ),
		api = new mw.Api();

	// Add "Chat with AI" button.
	const $chatButton = $submit.clone()
		.attr( 'type', 'button' )
		.addClass( 'mw-askai-chatwith' )
		.click( prepareChat )
		.insertAfter( $submit );

	$chatButton.find( '.oo-ui-labelElement-label' ).text( mw.msg( 'askai-chatwith-button' ) );

	/* Handler of "Chat with AI" button */
	function prepareChat() {
		const prompt = $prompt.val().trim();
		if ( !prompt ) {
			return;
		}

		const q = {
			formatversion: 2,
			action: 'query',
			list: 'search',
			srlimit: 500,
			srwhat: 'text',
			srsearch: prompt,
			srprop: 'snippet'
		};
		api.get( q ).done( function ( ret ) {
			const snippets = {};
			ret.query.search.forEach( ( found ) => {
				const plaintextSnippet = $( '<div>' ).append( found.snippet ).text().trim();
				snippets[ found.title ] = plaintextSnippet;
			} );

			narrowDownPageNames( Object.keys( snippets ) ).then( ( pageNames ) => {
				const promises = pageNames.map( ( pageName ) => {
					// Download each of the articles and find the paragraphs that have the snippet.
					const title = new mw.Title( pageName );
					const $d = $.Deferred();

					$.get( title.getUrl() ).done( ( html ) => {
						const parNumbers = mw.askai.findpar(
							snippets[ pageName ],
							$( '<div>' ).append( html )
						);
						if ( !parNumbers ) {
							$d.resolve( null );
							return;
						}

						$d.resolve( pageName + '#p' + parNumbers );
					} );

					return $d.promise();
				} );

				return Promise.all( promises );
			} ).then( ( res ) => {
				const pages = res.filter( ( x ) => x );
				if ( !pages.length ) {
					console.log( 'Paragraph numbers not found in any of the titles.' );
					return;
				}

				// Redirect to Special:AI?wpPages=(list).
				const specialTitle = new mw.Title( 'Special:AI' );
				window.location.href = specialTitle.getUrl( {
					wpPages: pages.join( '\n' )
				} );
			} );
		} ).fail( function ( code, ret ) {
			console.log( 'Chat with AI: API query (list=search) failed: ' + JSON.stringify( ret ) );
		} );
	}

	/**
	 * Ask AI to narrow down successful search results (received from the API)
	 * to only the most relevant pages.
	 *
	 * @param {string[]} pageNames List of article names in this wiki.
	 * @return {Promise} Resolves into string[] (shortened subset of pageNames).
	 */
	function narrowDownPageNames( pageNames ) {
		if ( !pageNames.length ) {
			console.log( 'Chat with AI: no pages found.' );
			return;
		}

		// DEBUG: uncomment the following line to test this on all pages (without asking the AI).
		// return $.Deferred().resolve( pageNames );

		const q = {
			formatversion: 2,
			action: 'query',
			prop: 'askai',
			aiinstructions: mw.msg( 'askai-chatwith-instructions' ),
			aiprompt: pageNames.join( '\n' )
		};
		return api.postWithToken( 'csrf', q ).done( function ( ret ) {
			console.log( 'Chat with API: response from AI: ' + JSON.stringify( ret ) );

			const relevantPageNames = ret.query.askai.response.split( '\n' ).map( ( x ) => x.trim() );
			if ( !relevantPageNames ) {
				console.log( 'Chat with AI: AI hasn\'t found any relevant pages.' );
				return;
			}

			return relevantPageNames;
		} ).fail( function ( code, ret ) {
			console.log( 'Chat with AI: API query (prop=askai) failed: ' + JSON.stringify( ret ) );
		} );
	}
} );
