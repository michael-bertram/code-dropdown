<?php
/**
 * Plugin Name:       Code Dropdown
 * Description:       Dropdown code block with interactive front-end controls and AI-powered metadata auto-fill via WordPress Abilities API.
 * Version:           1.0.0
 * Text Domain:       code-dropdown
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register custom block types from build directory metadata.
 */
function code_dropdown_register_blocks() {
	register_block_type_from_metadata( __DIR__ . '/build/code-dropdown' );
	register_block_type_from_metadata( __DIR__ . '/build/code-header' );
	register_block_type_from_metadata( __DIR__ . '/build/code-content' );
}
add_action( 'init', 'code_dropdown_register_blocks' );

/**
 * Enqueue front-end utility scripts.
 */
add_action( 'wp_enqueue_scripts', function() {
	wp_enqueue_script(
		'canvas-confetti',
		'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js',
		array(),
		null,
		true
	);
});

/**
 * Enqueue Prism.js assets on the front-end for syntax highlighting.
 */
function wpe_enqueue_syntax_highlighter_assets() {
	if ( ! is_admin() ) {
		wp_enqueue_script(
			'prism-js',
			'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js',
			array(),
			'1.29.0',
			true
		);

		wp_enqueue_script(
			'prism-autoloader',
			'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js',
			array( 'prism-js' ),
			'1.29.0',
			true
		);

		wp_enqueue_style(
			'prism-theme',
			'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css',
			array(),
			'1.29.0'
		);
	}
}
add_action( 'wp_enqueue_scripts', 'wpe_enqueue_syntax_highlighter_assets' );

/* ==========================================================================
   WORDPRESS 6.9+ ABILITIES API & AI INTEGRATION (PHASE 1)
   ========================================================================== */

/**
 * Register Ability Category for Code Dropdown Tools.
 */
add_action( 'wp_abilities_api_categories_init', function() {
	wp_register_ability_category(
		'code-dropdown-tools',
		array(
			'label'       => __( 'Code Dropdown Utilities', 'code-dropdown' ),
			'description' => __( 'Abilities for code analysis, syntax detection, and block metadata generation.', 'code-dropdown' ),
		)
	);
} );

/**
 * Register Ability: Auto-Fill Block Metadata.
 */
add_action( 'wp_abilities_api_init', function() {
	wp_register_ability(
		'code-dropdown/auto-fill-metadata',
		array(
			'category'            => 'code-dropdown-tools',
			'label'               => __( 'Auto-Fill Code Metadata', 'code-dropdown' ),
			'description'         => __( 'Analyzes code snippet to extract syntax language label, filename, and short header summary.', 'code-dropdown' ),
			'show_in_rest'        => true,
			'show_in_mcp'         => true,
			'permission_callback' => function() {
				return current_user_can( 'edit_posts' );
			},
			'input_schema'        => array(
				'type'       => 'object',
				'properties' => array(
					'code' => array(
						'type'        => 'string',
						'description' => __( 'The raw code snippet content to analyze.', 'code-dropdown' ),
						'minLength'   => 3,
					),
				),
				'required'             => array( 'code' ),
				'additionalProperties' => false,
			),
			'output_schema'       => array(
				'type'       => 'object',
				'properties' => array(
					'codeLanguage' => array(
						'type'        => 'string',
						'description' => __( 'Syntax language mapping token (e.g., PHP, JavaScript, CSS, HTML).', 'code-dropdown' ),
					),
					'filename'     => array(
						'type'        => 'string',
						'description' => __( 'Idiomatic filename for the snippet.', 'code-dropdown' ),
					),
					'title'        => array(
						'type'        => 'string',
						'description' => __( 'Concise snippet title/summary.', 'code-dropdown' ),
					),
				),
				'required'             => array( 'codeLanguage', 'filename', 'title' ),
				'additionalProperties' => false,
			),
			'execute_callback'    => 'code_dropdown_execute_autofill_ability',
		)
	);
} );

/**
 * Execution callback for metadata auto-fill ability.
 *
 * @param array $args Inputs compliant with input_schema.
 * @return array|WP_Error Output compliant with output_schema or WP_Error on failure.
 */
function code_dropdown_execute_autofill_ability( array $args ) {
	$code = sanitize_textarea_field( $args['code'] );

	if ( empty( trim( $code ) ) ) {
		return new WP_Error(
			'empty_code',
			__( 'Code snippet cannot be empty.', 'code-dropdown' ),
			array( 'status' => 400 )
		);
	}

	$prompt = "Analyze the code snippet below and return JSON with exact keys:
- 'codeLanguage': Choose one from ['PHP', 'JavaScript', 'CSS', 'HTML', 'SQL', 'Bash'].
- 'filename': An idiomatic filename (e.g. 'class-wp-custom.php', 'useFetch.js').
- 'title': A concise 3-6 word descriptive title.

Code:
{$code}
if ( function_exists( 'wp_ai_client_prompt' ) ) {
		$response = wp_ai_client_prompt(
			$prompt,
			array(
				'response_format' => array( 'type' => 'json_object' ),
			)
		);

		if ( ! is_wp_error( $response ) ) {
			$data = json_decode( $response, true );
			if ( is_array( $data ) && isset( $data['codeLanguage'], $data['filename'], $data['title'] ) ) {
				return array(
					'codeLanguage' => sanitize_text_field( $data['codeLanguage'] ),
					'filename'     => sanitize_file_name( $data['filename'] ),
					'title'        => sanitize_text_field( $data['title'] ),
				);
			}
		}
	}

	// Dynamic Fallback logic when AI provider is unreachable
	return array(
		'codeLanguage' => 'PHP',
		'filename'     => 'snippet.php',
		'title'        => __( 'Code Snippet', 'code-dropdown' ),
	);
}