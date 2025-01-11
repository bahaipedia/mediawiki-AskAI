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

use FormatJson;
use MediaWiki\AskAI\Service\IExternalService;
use MediaWiki\AskAI\Service\ServiceFactory;
use MediaWiki\Logger\LoggerFactory;
use Psr\Log\LoggerInterface;
use Status;
use Title;
use User;

/**
 * High-level interface for sending queries to AI.
 */
class AIQuery {
	/** @var User */
	protected $user;

	/** @var IExternalService */
	protected $service;

	/** @var LoggerInterface */
	protected $logger;

	/** @var string */
	protected $instructions = '';

	/** @var string[] */
	protected $contextExtracts = [];

	/** @var Status */
	protected $status;

	/**
	 * @param User $user
	 */
	public function __construct( User $user ) {
		$this->user = $user;
		$this->service = ServiceFactory::getAI();
		$this->logger = LoggerFactory::getInstance( 'AskAI' );
		$this->status = Status::newGood();
	}

	/**
	 * Get Status object with any errors that might have occured during send().
	 * @return Status
	 */
	public function getStatus() {
		return $this->status;
	}

	/**
	 * Returns short name of the service (e.g. "OpenAI").
	 * @return string
	 */
	public function getServiceName() {
		if ( !$this->service ) {
			return 'none';
		}

		return $this->service->getName();
	}

	/**
	 * Set preferences on how AI should respond, e.g. "You are a research assistant".
	 * @param string $instructions
	 */
	public function setInstructionsText( $instructions ) {
		$this->instructions = $instructions;
	}

	/**
	 * Set AI instructions to contents of MediaWiki:Something message.
	 * @param string $msgName
	 */
	public function setInstructionsMessage( $msgName ) {
		$this->instructions = wfMessage( $msgName )->plain();
	}

	/**
	 * Choose several pages to be quoted at the end of AI instructions.
	 * If page name has an anchor like "#p2,4-6,9", only these paragraphs are included.
	 * @param string[] $pageNames E.g. [ 'First page#p1-7,10-12,15', 'Another page#p5', 'Page 3' ].
	 */
	public function setContextPages( $pageNames ) {
		// Obtain text of all pages. If paragraphs are specified, only these paragraphs are used.
		$extracts = [];

		foreach ( $pageNames as $idx => $pageName ) {
			$title = Title::newFromText( $pageName );
			if ( !$title ) {
				continue;
			}

			$parNumbers = '';
			if ( preg_match( '/^p([0-9\-,]+)$/', $title->getFragment(), $matches ) ) {
				$parNumbers = $matches[1];
			}

			$extractor = new ParagraphExtractor( $title );

			$foundParagraphs = $extractor->extractParagraphs( $parNumbers );
			if ( $foundParagraphs ) {
				$extracts[] = wfMessage( 'askai-source' )->numParams( $idx + 1 )->params( $title->getFullText() ) .
					"\n\n" . implode( "\n\n", $foundParagraphs );
			}
		}

		$this->contextExtracts = $extracts;
	}

	/**
	 * Send an arbitrary question to AI and return the response.
	 * @param string $prompt Question to ask, e.g. "How big are elephants?".
	 * @return string|null Text of response (if successful) or null.
	 */
	public function send( $prompt ) {
		if ( !$this->service ) {
			$this->status->fatal( 'askai-unknown-service' );
			return null;
		}

		$instructions = $this->instructions;
		if ( $this->contextExtracts ) {
			$instructions .= "\n\n" . implode( "\n\n", $this->contextExtracts );
		}

		$response = $this->service->query(
			$prompt,
			$instructions,
			$this->status
		);

		$this->logger->error( 'AskAI: query by User:{user} ({ip}): {params}',
			[
				'user' => $this->user->getName(),
				'ip' => $this->user->getRequest()->getIP(),
				'params' => FormatJson::encode( [
					'prompt' => $prompt,
					'error' => $this->status->isOK() ? '' : $this->status->getMessage()->plain(),
					'response' => $response ?? '',
					'instructions' => $instructions
				] )
			]
		);

		return $response;
	}
}
