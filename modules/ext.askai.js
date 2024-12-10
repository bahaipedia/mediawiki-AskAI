/* Submits the form [[Special:AI]] and displays results without reloading the page. */

$( function () {
	const $form = $( '#mw-askai' ),
		$response = $form.find( '[name="wpResponse"]' ),
		$pages = $form.find( '[name="wpPages"]' ),
		$prompt = $form.find( '[name="wpPrompt"]' ),
		token = $( '#wpEditToken' ).val(),
		url = $form[ 0 ].action;

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

	function sendPrompt( extract ) {
		const prompt = $prompt.val();
		$.post( url, {
			wpExtract: extract,
			wpPrompt: prompt,
			wpEditToken: token
		} ).fail( ( xhr ) => {
			$response.val( mw.msg( 'askai-submit-failed',
				xhr.statusText + ' (' + url + ')'
			) );
		} ).done( ( ret ) => {
			$response.val(
				'>>> ' + prompt + '\n' +
				$( '<div>' ).append( ret ).find( '#mw-askai-response' ).text() +
				'\n\n' + $response.val()
			);
			$response.scrollTop( 0 );
		} );
	}

	function onsubmit( ev ) {
		ev.preventDefault();
		extractParagraphs().then( sendPrompt );
	}

	$form.on( 'submit', onsubmit );
}() );
