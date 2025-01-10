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

	function extractParagraphs() {
		// List of pages isn't useful to the AI (it doesn't know what to do with it),
		// we need to retrieve the text of paragraphs (e.g. [[Some page#p6-8]])
		// and send this text to AI as a part of instructions (not the user-chosen Prompt).
		const promises = $pages.val().split( '\n' ).map( ( pageName ) => {
			let title;
			try {
				title = new mw.Title( pageName );
			} catch ( error ) {
				// Invalid title.
				return [];
			}

			const fragment = title.fragment,
				parNumbers = new Set();

			if ( fragment && fragment.match( /^p[0-9\-,]+$/ ) ) {
				// Anchor is the list of paragraphs, e.g. "p4", or "p6-8", or "p3,5,7".
				fragment.slice( 1 ).split( ',' ).forEach( ( pair ) => {
					const range = pair.split( '-' ),
						start = parseInt( range[ 0 ] ),
						end = parseInt( range.length > 1 ? range[ 1 ] : start );

					for ( let idx = start; idx <= end; idx++ ) {
						parNumbers.add( idx );
					}
				} );
			}

			const $d = $.Deferred();

			$.get( title.getUrl() ).done( ( html ) => {
				const $paragraphs = $( '<div>' ).append( html ).find( '.mw-parser-output > p' );

				let extract;
				if ( parNumbers.size === 0 ) {
					// Use the entire page (no paragraph numbers were selected).
					extract = $paragraphs.toArray();
				} else {
					extract = [];
					[ ...parNumbers ].sort( ( a, b ) => a - b ).forEach( ( idx ) => {
						const p = $paragraphs[ idx ];
						if ( p ) {
							extract.push( p );
						}
					} );
				}

				$d.resolve( {
					title: title,
					extract: extract.map( ( p ) => {
						return p.innerText.trim();
					} ).join( '\n\n' )
				} );
			} );

			return $d.promise();
		} );

		// Accumulate the results into 1 string.
		return Promise.all( promises ).then( ( pageResults ) => {
			return pageResults.filter( ( x ) => x.extract ).map( ( ret, idx ) => {
				const fragment = ret.title.fragment;
				return mw.msg( 'askai-source',
					idx + 1,
					ret.title.getPrefixedText() + ( fragment ? '#' + fragment : '' )
				) + '\n\n' + ret.extract;
			} ).join( '\n\n' );
		} );
	}

	/**
	 * Send arbitrary question to AI and display the result.
	 *
	 * @param {string} extract
	 */
	function sendPrompt( extract ) {
		const prompt = $prompt.val();
		$prompt.val( '' );

		const instructions = mw.msg( 'askai-default-instructions' ) + '\n\n' + extract,
			$todo = showPrompt( prompt );

		api.postWithToken( 'csrf', {
			format: 'json',
			formatversion: 2,
			action: 'query',
			prop: 'askai',
			aiprompt: prompt,
			aiinstructions: instructions
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
	 * Display AI response to user.
	 *
	 * @param {jQuery} $todo Value that was previously returned by showPrompt().
	 * @param {string} responseText
	 * @param {boolean} isSuccess True if this is a successful response, false for error.
	 */
	function showResponse( $todo, responseText, isSuccess ) {
		const $answer = $( '<p>' ).attr( 'class', 'mw-askai-answer' ).append( responseText );
		$todo.removeClass( 'mw-askai-prompt-loading' )
			.addClass( isSuccess ? 'mw-askai-prompt-loaded' : 'mw-askai-prompt-failed' )
			.after( $answer );
		$response.scrollTop( $response[ 0 ].scrollHeight );
	}

	function onsubmit( ev ) {
		ev.preventDefault();
		extractParagraphs().then( sendPrompt );
	}

	$form.on( 'submit', onsubmit );
}() );
