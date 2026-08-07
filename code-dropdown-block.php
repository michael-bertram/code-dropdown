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

<?php
/**
 * Register REST route for AI Code Explanation.
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'tutorial-code/v1', '/explain', array(
        'methods'             => 'POST',
        'permission_callback' => '__return_true', // Add rate-limiting/nonces for production
        'callback'            => function ( WP_REST_Request $request ) {
            $code     = $request->get_param( 'code' );
            $filename = sanitize_text_field( $request->get_param( 'filename' ) );
            $language = sanitize_text_field( $request->get_param( 'language' ) );

            if ( empty( $code ) ) {
                return new WP_Error( 'missing_code', __( 'No code provided.', 'tutorial-code' ), array( 'status' => 400 ) );
            }

            $system_instruction = 'You are an expert developer assistant inside a coding tutorial. ' .
                'Explain the given code snippet concisely for a student. Focus on what key functions do, ' .
                'any important parameters, and potential pitfalls. Keep the explanation to 3-4 bullet points max.';

            $prompt = sprintf(
                "File: %s\nLanguage: %s\nCode:\n```\n%s\n```",
                $filename ?: 'snippet',
                $language ?: 'plain text',
                $code
            );

            try {
                // Using WP 7.0's native wp_ai_client_prompt builder
                $result = wp_ai_client_prompt( $prompt )
                    ->using_system_instruction( $system_instruction )
                    ->using_temperature( 0.2 )
                    ->using_model_preference( array( 'gpt-4o-mini', 'claude-3-5-haiku', 'gemini-1-5-flash' ) )
                    ->generate_text_result();

                return new WP_REST_Response( array(
                    'explanation' => $result->get_text_content(),
                ), 200 );
            } catch ( Exception $e ) {
                return new WP_Error( 'ai_error', $e->getMessage(), array( 'status' => 500 ) );
            }
        },
    ) );
} );