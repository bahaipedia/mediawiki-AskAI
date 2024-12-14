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

use Status;

/**
 * Fake service that responds to any prompts with "What did the user request?" information.
 */
class DebugService implements IExternalService {
	/**
	 * Send an arbitrary question to ChatGPT and return the response.
	 * @param string $prompt Question to ask.
	 * @param string $instructions Preferences on how to respond, e.g. "You are a research assistant".
	 * @param Status $status
	 * @return string
	 */
	public function query( $prompt, $instructions, Status $status ) {
		$delim = str_repeat( '-', 80 );
		$response = wfMessage( 'askai-debug-header' )->plain() . "\n\n" .
			wfMessage( 'askai-debug-prompt' )->plain() .
			"\n$delim\n$prompt\n$delim\n\n" .
			wfMessage( 'askai-debug-instructions' )->plain() .
			"\n$delim\n$instructions\n$delim";

		return $response;
	}
}
