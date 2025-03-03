/* Submits the form [[Special:AI]] and displays results without reloading the page. */

$( function () {
	const $form = $( '#mw-askai' ),
		$pages = $form.find( '[name="wpPages"]' ),
		$prompt = $form.find( '[name="wpPrompt"]' ),
		api = new mw.Api();

	// Replace <textarea> for response with <div> (which can have advanced formatting).
	const $oldResponse = $form.find( '[name="wpResponse"]' );
	const $response = $( '<div>' )
		.attr( 'class', $oldResponse.attr( 'class' ) )
		.addClass( 'mw-askai-response' );
	$oldResponse.replaceWith( $response );

	/**
	 * Send arbitrary question to AI and display the result.
	 *
	 * @param {string[]} pageNames
	 */
	function sendPrompt( pageNames ) {
		const prompt = $prompt.val();
		$prompt.val( '' );

		const $todo = showPrompt( prompt );

		api.postWithToken( 'csrf', {
			format: 'json',
			formatversion: 2,
			action: 'query',
			prop: 'askai',
			aiprompt: prompt,
			aiinstructionspage: 'askai-default-instructions',
			aicontextpages: pageNames.join( '|' )
		} ).done( function ( ret ) {
			showResponse( $todo, ret.query.askai.response, true );
		} ).fail( function ( code, ret ) {
			showResponse( $todo, mw.msg( 'askai-submit-failed', ret.error.info ), false );
		} );
	}

	/**
	 * Display the currently loading prompt.
	 * Returns element that can be used in showResponse()
	 *
	 * @param {string} prompt
	 * @return {jQuery} Newly created jQuery element inside Response field.
	 */
	function showPrompt( prompt ) {
		return $( '<p>' ).append( '>>> ', prompt )
			.attr( 'class', 'mw-askai-prompt mw-askai-prompt-loading' )
			.appendTo( $response );
	}

	/**
	 * Replace source number (referenced in AI response) with a link to the related page/paragraphs.
	 *
	 * @param {number} sourceNumber
	 * @return {string|false} HTML of the link if this source exists, false otherwise.
	 */
	function getLinkToSource( sourceNumber ) {
		if ( sourceNumber < 1 ) {
			return false;
		}

		const source = $pages.val().split( '\n' )[ sourceNumber - 1 ];
		if ( !source ) {
			// Some unrelated number (greater than the number of page names).
			return false;
		}

		// Wanted format of the links: (Source #1, par 1, 4, 7)
		// Here "1", "4" and "7" are 3 separate links to paragraphs 1, 4 and 7.
		const sourceName = mw.msg( 'askai-source', sourceNumber );

		const title = new mw.Title( source );
		if ( !title.fragment ) {
			// No paragraph numbers, so we link to the entire page.
			return '(' + makeLink( title, sourceName ) + ')';
		}

		// When "source" includes several paragraphs (e.g. "Name of page#par3-5,8"),
		// show links to the beginning of each range (in this example, "3" and "8").
		const links = [];
		title.fragment.replace( /^par(.*)$/, '$1' ).split( ',' ).forEach( ( pair ) => {
			title.fragment = 'par' + pair.split( '-' )[ 0 ];
			links.push( makeLink( title, pair ) );
		} );

		return '(' + sourceName + ', ' + mw.msg( 'askai-source-paragraph' ) + ' ' + links.join( ', ' ) + ')';
	}

	/**
	 * Helper method used by getLinkToSource(), returns HTML of one link.
	 *
	 * @param {mw.Title} mwTitle
	 * @param {string} text
	 * @return {string}
	 */
	function makeLink( mwTitle, text ) {
		const $link = $( '<a>' ).attr( 'href', mwTitle.getUrl() ).append( text );
		return $link[ 0 ].outerHTML;
	}

	/**
	 * Display AI response to user.
	 *
	 * @param {jQuery} $todo Value that was previously returned by showPrompt().
	 * @param {string} responseText
	 * @param {boolean} isSuccess True if this is a successful response, false for error.
	 */
	function showResponse( $todo, responseText, isSuccess ) {
		// If response from the AI mentions things like "Source #1",
		// convert them into clickable links to the articles/paragraphs
		// that were listed in the field "List of wiki pages".

		const replaceFunc = function ( matchedText, sourceNumber ) {
			return getLinkToSource( sourceNumber ) || matchedText;
		};
		responseText = responseText.replace( /Source #([0-9]+)/g, replaceFunc );
		responseText = responseText.replace( /\(([0-9]+)\)/g, replaceFunc );

		const $answer = $( '<p>' ).attr( 'class', 'mw-askai-answer' ).append( responseText );
		$todo.removeClass( 'mw-askai-prompt-loading' )
			.addClass( isSuccess ? 'mw-askai-prompt-loaded' : 'mw-askai-prompt-failed' )
			.after( $answer );
		$response.scrollTop( $response[ 0 ].scrollHeight );
	}

	function onsubmit( ev ) {
		ev.preventDefault();
		sendPrompt( $pages.val().split( '\n' ) );
	}

	$form.on( 'submit', onsubmit );
}() );
