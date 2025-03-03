/* Add invisible tags <span id="p123"></span>, where 123 is paragraph number,
	to every paragraph of the article. */

$( function () {
	$( '.mw-parser-output > p' ).each( function ( idx, elem ) {
		$( elem ).prepend( $( '<span>' )
			.attr( 'class', 'showsectionlink' )
			.attr( 'id', 'par' + idx )
		);
	} );

	const anchor = window.location.hash;
	if ( anchor.match( /^#par[0-9]+$/ ) ) {
		// When user loads the page with #par123 in its URL,
		// scrolling doesn't happen naturally, because this anchor doesn't exist yet.
		// Now that we have just added this anchor, we can perform the scrolling.
		$( anchor )[ 0 ].scrollIntoView();
	}
} );
