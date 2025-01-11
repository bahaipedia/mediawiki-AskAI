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

/**
 * @file
 * API to search articles for paragraph numbers that contain some text.
 */

use ApiQuery;
use ApiQueryBase;
use FormatJson;
use Status;
use Title;
use Wikimedia\ParamValidator\ParamValidator;

class ApiQueryFindParagraph extends ApiQueryBase {
	/**
	 * @param ApiQuery $query
	 * @param string $moduleName
	 */
	public function __construct( ApiQuery $query, $moduleName ) {
		parent::__construct( $query, $moduleName, 'fp' );
	}

	/** @inheritDoc */
	public function execute() {
		$this->checkUserRightsAny( 'askai' );

		$params = $this->extractRequestParams();
		$user = $this->getUser();
		if ( $user->pingLimiter( 'askai-findparagraph' ) ) {
			$this->dieStatus( Status::newFatal( 'apierror-ratelimited' ) );
		}

		// JSON payload is { "Title 1": "Text to find 1", "Title 2": "Text 2", ... }
		$status = FormatJson::parse( $params['json'], FormatJson::FORCE_ASSOC );
		if ( !$status->isOK() ) {
			$this->dieStatus( $status );
		}

		$found = [];
		$notFound = [];
		foreach ( $status->getValue() as $pageName => $textToFind ) {
			$title = Title::newFromText( $pageName );
			if ( !$title ) {
				$this->dieWithError( [ 'apierror-invalidtitle', wfEscapeWikiText( $pageName ) ] );
			}

			$extractor = new ParagraphExtractor( $title );
			$foundParagraphs = $extractor->findSnippet( $textToFind );
			if ( $foundParagraphs ) {
				$title->setFragment( 'p' . $foundParagraphs );
				$found[] = $title->getFullText();
			} else {
				$notFound[] = $title->getFullText();
			}

		}

		$r = [
			'found' => $found,
			'notfound' => $notFound
		];
		$this->getResult()->addValue( 'query', $this->getModuleName(), $r );
	}

	/** @inheritDoc */
	public function mustBePosted() {
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public function getAllowedParams() {
		return [
			'json' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => true
			]
		];
	}

	/**
	 * @inheritDoc
	 */
	protected function getExamplesMessages() {
		return [
			'action=query&prop=findparagraph&token=123ABC&json=PAYLOAD'
				=> 'apihelp-query+findparagraph-example',
		];
	}
}
