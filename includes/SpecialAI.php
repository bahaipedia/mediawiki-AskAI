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

use FormSpecialPage;
use HTMLForm;
use MediaWiki\AskAI\Service\ServiceFactory;
use Status;
use Xml;

/**
 * Implements [[Special:AI]].
 */
class SpecialAI extends FormSpecialPage {
	public function __construct() {
		parent::__construct( 'AI', 'askai' );
	}

	public function requiresWrite() {
		return false;
	}

	/** @inheritDoc */
	protected function getFormFields() {
		return [
			'Pages' => [
				'type' => 'textarea',
				'rows' => 3,
				'label-message' => 'askai-field-pages',
				'required' => true
			],
			'Response' => [
				'type' => 'textarea',
				'rows' => 15,
				'label-message' => 'askai-field-response',
				'readonly' => true
			],
			'Prompt' => [
				'type' => 'text',
				'label-message' => 'askai-field-prompt',
				'required' => true
			],
			'Extract' => [
				'type' => 'hidden'
			]
		];
	}

	/** @inheritDoc */
	protected function alterForm( HTMLForm $form ) {
		$form->setId( 'mw-askai' );
		$this->getOutput()->addModules( 'ext.askai' );
	}

	/** @inheritDoc */
	public function onSubmit( array $data ) {
		$ai = ServiceFactory::getAI();
		if ( !$ai ) {
			return Status::newFatal( 'askai-unknown-service' );
		}

		$response = $ai->query( $data['Prompt'], $data['Extract'] );

		$this->getOutput()->disable();
		echo Xml::element( 'div', [
			'id' => 'mw-askai-response',
			'style' => 'white-space: pre-wrap'
		], $response );

		return Status::newGood();
	}

	/** @inheritDoc */
	protected function getDisplayFormat() {
		return 'ooui';
	}

	/** @inheritDoc */
	protected function getGroupName() {
		return 'wiki';
	}

	/** @inheritDoc */
	protected function getMessagePrefix() {
		return 'askai';
	}

	/** @inheritDoc */
	public function getDescription() {
		return $this->msg( 'askai' );
	}
}
