/* Add invisible tags <span id="p123"></span>, where 123 is paragraph number,
	to every paragraph of the article. */

$( function () {
	$( '.mw-parser-output > p' ).each( function ( idx, elem ) {
		$( elem ).prepend( $( '<span>' )
			.attr( 'class', 'showsectionlink' )
			.attr( 'id', 'p' + idx )
		);
	} );
} );
