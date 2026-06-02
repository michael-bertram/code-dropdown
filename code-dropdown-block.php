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

/**
 * Enqueue Prism.js assets on the front-end for syntax highlighting
 */
function wpe_enqueue_syntax_highlighter_assets() {
    // Only load these on the frontend, not in the administrative dashboard editor
    if ( ! is_admin() ) {
        // Enqueue Prism.js Core Script
        wp_enqueue_script(
            'prism-js',
            'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js',
            array(),
            '1.29.0',
            true
        );

        // Enqueue Autoloader Plugin (Automatically loads languages like PHP, JS, CSS, HTML)
        wp_enqueue_script(
            'prism-autoloader',
            'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js',
            array('prism-js'),
            '1.29.0',
            true
        );

        // Enqueue a clean Prism Theme CSS (Tomorrow Night theme works beautifully with Dark Mode)
        wp_enqueue_style(
            'prism-theme',
            'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css',
            array(),
            '1.29.0'
        );
    }
}
add_action( 'wp_enqueue_scripts', 'wpe_enqueue_syntax_highlighter_assets' );
