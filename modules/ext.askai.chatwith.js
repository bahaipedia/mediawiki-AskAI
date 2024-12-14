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
			srsearch: prompt,
			srprop: ''
		};
		api.get( q ).done( function ( ret ) {
			onSearch( ret.query.search.map( ( x ) => x.title ) );
		} ).fail( function ( code, ret ) {
			console.log( 'Chat with AI: API query (list=search) failed: ' + JSON.stringify( ret ) );
		} );
	}

	/**
	 * Ask AI to narrow down successful search results (received from the API)
	 * to only the most relevant pages.
	 * If successful, redirect user to Special:AI?wpPages=(list).
	 *
	 * @param {string[]} pageNames List of article names in this wiki.
	 */
	function onSearch( pageNames ) {
		if ( !pageNames.length ) {
			console.log( 'Chat with AI: no pages found.' );
			return;
		}

		const q = {
			formatversion: 2,
			action: 'query',
			prop: 'askai',
			aiinstructions: mw.msg( 'askai-chatwith-instructions' ),
			aiprompt: pageNames.join( '\n' )
		};
		api.postWithToken( 'csrf', q ).done( function ( ret ) {
			console.log( 'Chat with API: response from AI: ' + JSON.stringify( ret ) );

			const relevantPageNames = ret.query.askai.response.split( '\n' ).map( ( x ) => x.trim() );
			if ( !relevantPageNames ) {
				console.log( 'Chat with AI: AI hasn\'t found any relevant pages.' );
				return;
			}

			// Redirect to Special:AI.
			const specialTitle = new mw.Title( 'Special:AI' );
			window.location.href = specialTitle.getUrl( {
				wpPages: relevantPageNames.join( '\n' )
			} );
		} ).fail( function ( code, ret ) {
			console.log( 'Chat with AI: API query (prop=askai) failed: ' + JSON.stringify( ret ) );
		} );
	}
} );
