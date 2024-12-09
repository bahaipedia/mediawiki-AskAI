<?php

/**
 * Implements AskAI extension for MediaWiki.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 * http://www.gnu.org/copyleft/gpl.html
 *
 * @file
 */

namespace MediaWiki\AskAI;

use MediaWiki\Hook\BeforePageDisplayHook;
use MediaWiki\Hook\SpecialSearchResultsPrependHook;
use OutputPage;
use Skin;
use SpecialSearch;

/**
 * Hooks of Extension:AskAI.
 */
class Hooks implements BeforePageDisplayHook, SpecialSearchResultsPrependHook {
	/**
	 * Add "addparlinks" module to articles.
	 *
	 * @param OutputPage $out
	 * @param Skin $skin
	 * @return void
	 */
	public function onBeforePageDisplay( $out, $skin ): void {
		$out->addModules( 'ext.askai.addparlinks' );
	}

	/**
	 * Add our JavaScript module to Special:Search.
	 * @param SpecialSearch $specialSearch
	 * @param OutputPage $out
	 * @param string $term
	 * @return bool|void
	 */
	public function onSpecialSearchResultsPrepend( $specialSearch, $out, $term ) {
		if ( $out->getContext()->getUser()->isAllowed( 'askai' ) ) {
			$out->addModules( 'ext.askai.search' );
		}
	}
}
