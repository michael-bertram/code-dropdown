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
   WORDPRESS 6.9+ ABILITIES API & AI INTEGRATION
   ========================================================================== */

/**
 * Register Ability Category for Code Dropdown Tools.
 */
add_action( 'wp_abilities_api_categories_init', function() {
	if ( function_exists( 'wp_register_ability_category' ) ) {
		wp_register_ability_category(
			'code-dropdown-tools',
			array(
				'label'       => __( 'Code Dropdown Utilities', 'code-dropdown' ),
				'description' => __( 'Abilities for code analysis, syntax detection, and block metadata generation.', 'code-dropdown' ),
			)
		);
	}
} );

/**
 * Register Step 2 Ability: Auto-Fill Block Metadata & Syntax Formatting.
 */
add_action( 'wp_abilities_api_init', function() {
	if ( ! function_exists( 'wp_register_ability' ) ) {
		return;
	}

	wp_register_ability(
		'code-dropdown/auto-fill-metadata',
		array(
			'category'            => 'code-dropdown-tools',
			'label'               => __( 'Auto-Fill Code Metadata & Syntax', 'code-dropdown' ),
			'description'         => __( 'Analyzes code to detect language badge, idiomatic filename, summary title, and syntax line highlighting.', 'code-dropdown' ),
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
						'minLength'   => 1,
					),
				),
				'required'             => array( 'code' ),
				'additionalProperties' => false,
			),
			'output_schema'       => array(
				'type'       => 'object',
				'properties' => array(
					'codeLanguage'    => array( 'type' => 'string' ),
					'filename'        => array( 'type' => 'string' ),
					'title'           => array( 'type' => 'string' ),
					'highlightLines'  => array( 'type' => 'string' ),
					'showLineNumbers' => array( 'type' => 'boolean' ),
				),
				'required'             => array( 'codeLanguage', 'filename', 'title', 'highlightLines', 'showLineNumbers' ),
				'additionalProperties' => false,
			),
			'execute_callback'    => 'code_dropdown_execute_autofill_ability',
		)
	);
} );

/**
 * Execution callback for metadata auto-fill.
 *
 * @param array $args Input parameters.
 * @return array|WP_Error Output payload matching output_schema or WP_Error.
 */
if ( ! function_exists( 'code_dropdown_execute_autofill_ability' ) ) {
	function code_dropdown_execute_autofill_ability( array $args ) {
		$raw_code = isset( $args['code'] ) && is_string( $args['code'] ) ? $args['code'] : '';
		$code     = sanitize_textarea_field( $raw_code );

		if ( '' === trim( $code ) ) {
			return new WP_Error(
				'empty_code',
				__( 'Code snippet cannot be empty.', 'code-dropdown' ),
				array( 'status' => 400 )
			);
		}

		$prompt = "You are a software engineer and code analyzer. Analyze the snippet below and return ONLY a raw JSON object (no markdown, no backticks) with these exact keys:
- 'codeLanguage': The exact matching token from ['PHP', 'JS', 'CSS', 'HTML', 'JSON', 'SQL', 'Bash'].
- 'filename': An idiomatic filename (e.g., 'block.json', 'class-wp-widget.php', 'useFetch.js').
- 'title': A concise 3-6 word summary title.
- 'highlightLines': Important line numbers to highlight (e.g. '1', '3-5', '2,8-10') or empty string '' if none.
- 'showLineNumbers': true if the snippet has more than 3 lines or structural logic, false otherwise.

Snippet:
{$code}";

		if ( function_exists( 'wp_ai_client_prompt' ) ) {
			try {
				$ai_response = wp_ai_client_prompt(
					$prompt,
					array(
						'response_format' => array( 'type' => 'json_object' ),
					)
				);

				if ( ! is_wp_error( $ai_response ) ) {
					$raw_json = '';
					if ( is_string( $ai_response ) ) {
						$raw_json = $ai_response;
					} elseif ( is_object( $ai_response ) ) {
						if ( method_exists( $ai_response, 'generate' ) ) {
							$generated = $ai_response->generate();
							$raw_json  = is_string( $generated ) ? $generated : (string) $generated;
						} elseif ( method_exists( $ai_response, 'get_text' ) ) {
							$raw_json = (string) $ai_response->get_text();
						} elseif ( method_exists( $ai_response, '__toString' ) ) {
							$raw_json = (string) $ai_response;
						}
					}

					$clean_json = trim( preg_replace( '/^```(json)?|```$/m', '', trim( $raw_json ) ) );
					$data       = json_decode( $clean_json, true );

					if ( is_array( $data ) && isset( $data['codeLanguage'], $data['filename'], $data['title'] ) ) {
						return array(
							'codeLanguage'    => sanitize_text_field( $data['codeLanguage'] ),
							'filename'        => sanitize_file_name( $data['filename'] ),
							'title'           => sanitize_text_field( $data['title'] ),
							'highlightLines'  => isset( $data['highlightLines'] ) ? sanitize_text_field( $data['highlightLines'] ) : '',
							'showLineNumbers' => isset( $data['showLineNumbers'] ) ? (bool) $data['showLineNumbers'] : true,
						);
					}
				}
			} catch ( Exception $e ) {
				// Fall through to fallback engine
			}
		}

		// Smart Fallback Parser (Runs offline or when AI provider key is not configured)
		$trimmed_code = trim( $code );
		$lines_count  = count( explode( "\n", $trimmed_code ) );

		if ( ( str_starts_with( $trimmed_code, '{' ) && str_ends_with( $trimmed_code, '}' ) ) || 
		     ( str_starts_with( $trimmed_code, '[' ) && str_ends_with( $trimmed_code, ']' ) ) ) {
			$json_test = json_decode( $trimmed_code, true );
			return array(
				'codeLanguage'    => 'JSON',
				'filename'        => ( is_array( $json_test ) && isset( $json_test['name'] ) ) ? 'block.json' : 'data.json',
				'title'           => __( 'JSON Structure', 'code-dropdown' ),
				'highlightLines'  => '1',
				'showLineNumbers' => $lines_count > 3,
			);
		}

		if ( preg_match( '/^<[!a-zA-Z]/', $trimmed_code ) ) {
			return array(
				'codeLanguage'    => 'HTML',
				'filename'        => 'index.html',
				'title'           => __( 'HTML Markup', 'code-dropdown' ),
				'highlightLines'  => '',
				'showLineNumbers' => $lines_count > 3,
			);
		}

		if ( str_contains( $trimmed_code, '<?php' ) || str_contains( $trimmed_code, 'namespace ' ) ) {
			return array(
				'codeLanguage'    => 'PHP',
				'filename'        => 'functions.php',
				'title'           => __( 'PHP Script', 'code-dropdown' ),
				'highlightLines'  => '',
				'showLineNumbers' => true,
			);
		}

		if ( preg_match( '/(const|let|var|import|export|function)\s/', $trimmed_code ) ) {
			return array(
				'codeLanguage'    => 'JS',
				'filename'        => 'script.js',
				'title'           => __( 'JavaScript Code', 'code-dropdown' ),
				'highlightLines'  => '',
				'showLineNumbers' => $lines_count > 3,
			);
		}

		return array(
			'codeLanguage'    => 'PHP',
			'filename'        => 'snippet.php',
			'title'           => __( 'Code Snippet', 'code-dropdown' ),
			'highlightLines'  => '',
			'showLineNumbers' => $lines_count > 3,
		);
	}
}

/* Direct REST API Fallback Route */
add_action( 'rest_api_init', function() {
	register_rest_route(
		'code-dropdown/v1',
		'/auto-fill-metadata',
		array(
			'methods'             => 'POST',
			'callback'            => function( WP_REST_Request $request ) {
				$params   = $request->get_json_params();
				$raw_code = is_array( $params ) && isset( $params['code'] ) ? $params['code'] : $request->get_param( 'code' );
				return code_dropdown_execute_autofill_ability( array( 'code' => (string) $raw_code ) );
			},
			'permission_callback' => function() {
				return current_user_can( 'edit_posts' );
			},
		)
	);
} );