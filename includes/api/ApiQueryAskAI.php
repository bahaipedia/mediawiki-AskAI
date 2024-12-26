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

use ApiQueryBase;
use Status;
use Wikimedia\ParamValidator\ParamValidator;

class ApiQueryAskAI extends ApiQueryBase {
	public function execute() {
		$this->checkUserRightsAny( 'askai' );

		$user = $this->getUser();
		if ( $user->pingLimiter( 'askai' ) ) {
			$this->dieStatus( Status::newFatal( 'apierror-ratelimited' ) );
		}

		$params = $this->extractRequestParams();
		$query = new AIQuery( $user );
		$query->setInstructions( $params['aiinstructions'] );

		$response = $query->send( $params['aiprompt'] );
		if ( $response === null ) {
			$this->dieStatus( $query->getStatus() );
		}

		$r = [
			'response' => $response,
			'service' => $query->getServiceName()
		];
		$this->getResult()->addValue( 'query', $this->getModuleName(), $r );
	}

	/** @inheritDoc */
	public function mustBePosted() {
		return true;
	}

	/** @inheritDoc */
	public function needsToken() {
		return 'csrf';
	}

	/**
	 * @inheritDoc
	 */
	public function getAllowedParams() {
		return [
			'aiprompt' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => true
			],
			'aiinstructions' => [
				ParamValidator::PARAM_TYPE => 'string'
			]
		];
	}

	/**
	 * @inheritDoc
	 */
	protected function getExamplesMessages() {
		return [
			'action=query&prop=askai&token=123ABC&aiprompt=What+is+Pi'
				=> 'apihelp-query+askai-example',
			'action=query&prop=askai&token=123ABC&' .
				'aiprompt=What+is+circumference+of+circle+with+radius+1&aiinstructions=Assume+that+Pi+is+4.'
				=> 'apihelp-query+askai-example-instructions'
		];
	}
}
