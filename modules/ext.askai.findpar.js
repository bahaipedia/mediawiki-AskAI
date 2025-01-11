/* Methods to find all paragraphs of the article that contain certain text. */

( function () {
	mw.askai = mw.askai || {};

	/**
	 * Search pages for paragraphs that contain "textToFind", return paragraph numbers.
	 *
	 * @param {string} textToFind Arbitrary string, e.g. "Sentence is a sequence of words."
	 * @param {string} pageName Page in this wiki that should be searched.
	 * @return {Promise<string>} Resolves into "Page_title#p1-7,10-12,15" or (if failed) "".
	 */
	mw.askai.findparInPage = function ( textToFind, pageName ) {
		const $d = $.Deferred(),
			api = new mw.Api(),
			pagesToSearch = {};

		pagesToSearch[ pageName ] = textToFind;
		api.post( {
			format: 'json',
			formatversion: 2,
			action: 'query',
			prop: 'findparagraph',
			fpjson: JSON.stringify( pagesToSearch )
		} ).done( function ( ret ) {
			$d.resolve( ret.query.findparagraph.found[ 0 ] || '' );
		} ).fail( function () {
			$d.resolve( '' );
		} );

		return $d.promise();
	};
}() );
