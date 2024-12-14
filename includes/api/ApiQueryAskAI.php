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
 * API to send questions to AI.
 */

use ApiQuery;
use ApiQueryBase;
use MediaWiki\AskAI\Service\ServiceFactory;
use Status;
use Wikimedia\ParamValidator\ParamValidator;

class ApiQueryAskAI extends ApiQueryBase {
	/**
	 * @param ApiQuery $query
	 * @param string $moduleName
	 */
	public function __construct( ApiQuery $query, $moduleName ) {
		parent::__construct( $query, $moduleName, 'ai' );
	}

	public function execute() {
		$params = $this->extractRequestParams();

		$ai = ServiceFactory::getAI();
		if ( !$ai ) {
			$this->dieStatus( Status::newFatal( 'askai-unknown-service' ) );
		}

		$status = Status::newGood();
		$response = $ai->query(
			$params['prompt'],
			$params['instructions'],
			$status
		);
		if ( !$status->isOK() ) {
			$this->dieStatus( $status );
		}

		$r = [ 'response' => $response ];
		$this->getResult()->addValue( 'query', $this->getModuleName(), $r );
	}

	/**
	 * @inheritDoc
	 */
	public function getAllowedParams() {
		return [
			'prompt' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => true
			],
			'instructions' => [
				ParamValidator::PARAM_TYPE => 'string'
			]
		];
	}

	/**
	 * @inheritDoc
	 */
	protected function getExamplesMessages() {
		return [
			'action=query&prop=askai&aiprompt=What+is+Pi'
				=> 'apihelp-query+askai-example',
			'action=query&prop=askai&' .
				'aiprompt=What+is+circumference+of+circle+with+radius+1&aiinstructions=Assume+that+Pi+is+4.'
				=> 'apihelp-query+askai-example-instructions'
		];
	}
}
