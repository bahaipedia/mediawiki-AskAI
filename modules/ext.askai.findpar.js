/* Methods to find all paragraphs of the article that contain certain text. */

( function () {
	mw.askai = mw.askai || {};

	/**
	 * Search pages for paragraphs that contain certain text, return paragraph numbers.
	 *
	 * @param {Object} titleToSnippet Text to find in each page, e.g. { "Page 1": "Some sentence" }.
	 * @return {Promise<string>} Resolves into [ "Page_title#p1-7,10-12,15", ... ].
	 */
	mw.askai.findparInPages = function ( titleToSnippet ) {
		const $d = $.Deferred(),
			api = new mw.Api();

		api.post( {
			format: 'json',
			formatversion: 2,
			action: 'query',
			prop: 'findparagraph',
			fpjson: JSON.stringify( titleToSnippet )
		} ).done( function ( ret ) {
			$d.resolve( ret.query.findparagraph.found );
		} ).fail( function () {
			$d.resolve( [] );
		} );

		return $d.promise();
	};
}() );
