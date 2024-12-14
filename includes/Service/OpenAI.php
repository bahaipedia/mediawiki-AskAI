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

namespace MediaWiki\AskAI\Service;

use Config;
use FormatJson;
use MediaWiki\MediaWikiServices;
use Status;

/**
 * External service that uses ChatGPT (OpenAI) API.
 */
class OpenAI implements IExternalService {
	/** @var Config */
	protected $config;

	/** @var string */
	protected $apiKey;

	/** @var string */
	protected $apiUrl;

	/** @var string */
	protected $model;

	/** @var bool */
	protected $isConfigured = true;

	/**
	 * @param Config $config
	 */
	public function __construct( Config $config ) {
		$opts = $config->get( 'AskAIServiceOptionsOpenAI' );

		$this->apiKey = $opts['apiKey'] ?? '';
		$this->apiUrl = $opts['apiUrl'] ?? '';
		$this->model = $opts['model'] ?? '';

		$this->isConfigured = ( $this->apiKey && $this->apiUrl && $this->model );
	}

	/**
	 * Send an arbitrary question to ChatGPT and return the response.
	 * @param string $prompt Question to ask.
	 * @param string $instructions Preferences on how to respond, e.g. "You are a research assistant".
	 * @param Status $status
	 * @return string|false
	 */
	public function query( $prompt, $instructions, Status $status ) {
		if ( !$this->isConfigured ) {
			$status->fatal( 'askai-openai-not-configured' );
			return false;
		}

		$postData = FormatJson::encode( [
			'model' => $this->model,
			'messages' => [
				[
					'role' => 'system',
					'content' => $instructions
				],
				[
					'role' => 'user',
					'content' => $prompt
				]
			]
		] );
		$req = MediaWikiServices::getInstance()->getHttpRequestFactory()->create(
			$this->apiUrl,
			[
				'method' => 'POST',
				'postData' => $postData
			],
			__METHOD__
		);
		$req->setHeader( 'Authorization', 'Bearer ' . $this->apiKey );
		$req->setHeader( 'Content-Type', 'application/json' );

		$httpStatus = $req->execute();
		if ( !$httpStatus->isOK() ) {
			$status->merge( $httpStatus );
			return false;
		}
		$ret = FormatJson::decode( $req->getContent(), true );

		return $ret['choices'][0]['message']['content'] ?? '';
	}
}
