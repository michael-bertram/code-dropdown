<?php
/**
 * Plugin Name:       Code Dropdown
 * ...
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function code_dropdown_register_blocks() {
    register_block_type_from_metadata( __DIR__ . '/build/code-dropdown' );
    register_block_type_from_metadata( __DIR__ . '/build/code-header' );
    register_block_type_from_metadata( __DIR__ . '/build/code-content' );
}
add_action( 'init', 'code_dropdown_register_blocks' );

add_action( 'wp_enqueue_scripts', function() {
    wp_enqueue_script( 'canvas-confetti', 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js', array(), null, true );
});
