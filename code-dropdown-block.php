<?php
/**
 * Plugin Name:       Code Dropdown
 * Description:       An interactive block with the Interactivity API.
 * Version:           0.1.0
 * Requires at least: 6.7
 * Requires PHP:      7.4
 * Author:            Michael Bertram
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       code-dropdown
 *
 * @package           code-dropdown
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers all blocks.
 */
function code_dropdown_register_blocks() {

    register_block_type_from_metadata( __DIR__ . '/build/code-dropdown' );
    register_block_type_from_metadata( __DIR__ . '/build/code-header' );
    register_block_type_from_metadata( __DIR__ . '/build/code-content' );

}
add_action( 'init', 'code_dropdown_register_blocks' );

add_action( 'wp_enqueue_scripts', function() {
    wp_enqueue_script( 'canvas-confetti', 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js', array(), null, true );
});
