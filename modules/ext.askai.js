/* Submits the form [[Special:AI]] and displays results without reloading the page. */

$( function () {
	var $form = $( '#mw-askai' ),
		$response = $form.find( '[name="wpResponse"]' ),
		$pages = $form.find( '[name="wpPages"]' ),
		$prompt = $form.find( '[name="wpPrompt"]' ),
		token = $( '#wpEditToken' ).val(),
		url = $form[ 0 ].action;

	function onsubmit( ev ) {
		ev.preventDefault();

		$.post( url, {
			wpPages: $pages.val(),
			wpPrompt: $prompt.val(),
			wpEditToken: token
		} ).fail( function ( xhr ) {
			$response.val( mw.msg( 'askai-submit-failed',
				xhr.statusText + ' (' + url + ')'
			) );
		} ).done( function ( ret ) {
			var responseText = $( '<div>' ).append( ret ).find( '#mw-askai-response' ).text();
			$response.val( responseText );
		} );
	}

	$form.on( 'submit', onsubmit );
}() );
