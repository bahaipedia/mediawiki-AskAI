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

	/** @var string E.g. "assume Pi to be 4" */
	protected $instructionsText;

	/** @var string E.g. "askai-default-instructions". */
	protected $instructionsMessageName;

	/**
	 * @var string[] E.g. [ 'First page#p1-7,10-12,15', 'Another page#p5', 'Page 3' ].
	 */
	protected $contextPages;

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
		$this->instructionsText = $instructions;
	}

	/**
	 * Set AI instructions to contents of MediaWiki:Something message.
	 * @param string $msgName
	 */
	public function setInstructionsMessage( $msgName ) {
		$this->instructionsMessageName = $msgName;
	}

	/**
	 * Choose several pages to be quoted at the end of AI instructions.
	 * If page name has an anchor like "#p2,4-6,9", only these paragraphs are included.
	 * @param string[] $pageNames E.g. [ 'First page#p1-7,10-12,15', 'Another page#p5', 'Page 3' ].
	 */
	public function setContextPages( $pageNames ) {
		$this->contextPages = $pageNames;
	}

	/**
	 * Obtain quotes from all context pages (requested paragraphs only).
	 * @return string[]
	 */
	protected function getContextExtracts() {
		if ( !$this->contextPages ) {
			return [];
		}

		// Obtain text of all pages. If paragraphs are specified, only these paragraphs are used.
		$extracts = [];
		foreach ( $this->contextPages as $idx => $pageName ) {
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

		return $extracts;
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

		$logInfo = [
			'prompt' => $prompt
		];
		$instructions = '';
		if ( $this->instructionsMessageName ) {
			$instructions = wfMessage( $this->instructionsMessageName )->plain();
			$logInfo['instructionspage'] = $this->instructionsMessageName;
		} elseif ( $this->instructionsText ) {
			$logInfo['instructions'] = $this->instructionsText;
		}

		$contextExtracts = $this->getContextExtracts();
		if ( $contextExtracts ) {
			$instructions .= "\n\n" . implode( "\n\n", $contextExtracts );
			$logInfo['contextpages'] = $this->contextPages;
		}

		$response = $this->service->query(
			$prompt,
			$instructions,
			$this->status
		);
		if ( $this->status->isOK() ) {
			$logInfo['response'] = $response ?? '(null)';
		} else {
			$logInfo['error'] = $this->status->getMessage()->plain();
		}

		$this->logger->info( 'AskAI: query by User:{user} ({ip}): {params}',
			[
				'user' => $this->user->getName(),
				'ip' => $this->user->getRequest()->getIP(),
				'params' => FormatJson::encode( $logInfo )
			]
		);

		return $response;
	}
}
