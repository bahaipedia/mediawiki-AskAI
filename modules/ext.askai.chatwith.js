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
			srsearch: prompt
		};
		api.get( q ).done( function ( ret ) {
			onSearch( ret.query.search.map( ( x ) => x.title ) );
		} ).fail( function ( code, ret ) {
			console.log( 'API query failed: ' + JSON.stringify( ret ) );
		} );
	}

	/**
	 * Narrow down successful search results received from the API.
	 *
	 * @param {string[]} pageNames List of article names in this wiki.
	 */
	function onSearch( pageNames ) {
		// TODO: make POST request to Special:AI and ask AI to "Filter the list of titles provided
		// below and return the results most likely to contain relevant content".

		// TODO: use the response of AI (list of titles) to redirect to Special:AI?wpPages=(list)
	}
} );
