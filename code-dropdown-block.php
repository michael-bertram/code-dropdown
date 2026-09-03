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
} );

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

/* ==========================================================================
   STEP 2: ABILITY - AUTO-FILL METADATA & SYNTAX
   ========================================================================== */

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
				$builder = wp_ai_client_prompt(
					$prompt,
					array(
						'response_format' => array( 'type' => 'json_object' ),
					)
				);

				if ( is_object( $builder ) && method_exists( $builder, 'generate_text' ) ) {
					$result = $builder->generate_text();
					if ( ! is_wp_error( $result ) ) {
						$clean_json = trim( preg_replace( '/^```(json)?|```$/m', '', trim( (string) $result ) ) );
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
				}
			} catch ( Exception $e ) {
				// Fall through to fallback engine
			}
		}

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

/* ==========================================================================
   USER PERSISTENCE REST ENDPOINTS & META
   ========================================================================== */

add_action( 'init', function() {
	register_meta(
		'user',
		'_wpe_completed_blocks',
		array(
			'type'          => 'object',
			'description'   => 'Track completed code block IDs per user.',
			'single'        => true,
			'show_in_rest'  => array(
				'schema' => array(
					'type'                 => 'object',
					'additionalProperties' => array( 'type' => 'boolean' ),
				),
			),
			'auth_callback' => function() {
				return current_user_can( 'read' );
			},
		)
	);
} );

/* ==========================================================================
   STEP 4: ABILITY - EXPLAIN THIS CODE
   ========================================================================== */

add_action( 'wp_abilities_api_init', function() {
	if ( ! function_exists( 'wp_register_ability' ) ) {
		return;
	}

	wp_register_ability(
		'code-dropdown/explain-code',
		array(
			'category'            => 'code-dropdown-tools',
			'label'               => __( 'Explain This Code', 'code-dropdown' ),
			'description'         => __( 'Generates a clear, line-by-line or conceptual summary of a code snippet.', 'code-dropdown' ),
			'show_in_rest'        => true,
			'show_in_mcp'         => true,
			'permission_callback' => '__return_true',
			'input_schema'        => array(
				'type'       => 'object',
				'properties' => array(
					'code'     => array(
						'type'        => 'string',
						'description' => __( 'The raw code snippet to explain.', 'code-dropdown' ),
						'minLength'   => 1,
					),
					'language' => array(
						'type'        => 'string',
						'description' => __( 'Programming language context.', 'code-dropdown' ),
					),
				),
				'required'             => array( 'code' ),
				'additionalProperties' => false,
			),
			'output_schema'       => array(
				'type'       => 'object',
				'properties' => array(
					'explanation' => array(
						'type'        => 'string',
						'description' => __( 'Concise 3-bullet breakdown of the code snippet.', 'code-dropdown' ),
					),
				),
				'required'             => array( 'explanation' ),
				'additionalProperties' => false,
			),
			'execute_callback'    => 'code_dropdown_execute_explain_ability',
		)
	);
} );

if ( ! function_exists( 'code_dropdown_execute_explain_ability' ) ) {
	function code_dropdown_execute_explain_ability( array $args ) {
		error_log( '[Code Dropdown AI] Ability invoked with raw args: ' . wp_json_encode( $args ) );

		$raw_input = isset( $args['code'] ) && is_string( $args['code'] ) ? $args['code'] : '';
		$decoded   = html_entity_decode( $raw_input, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		$decoded   = html_entity_decode( $decoded, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		$code      = wp_unslash( trim( $decoded ) );
		$language  = isset( $args['language'] ) ? sanitize_text_field( $args['language'] ) : 'code';

		if ( empty( $code ) ) {
			return new WP_Error(
				'empty_code',
				__( 'Code snippet cannot be empty.', 'code-dropdown' ),
				array( 'status' => 400 )
			);
		}

		$prompt = "You are an expert technical instructor. Analyze the following {$language} code snippet and explain what it does in exactly 3 clear, concise bullet points.
Requirements:
* Maximum 25 words per bullet.
* Focus on the actual functions, variables, conditions and logic present in the code.
* Do not invent functionality that is not present.
* Do not include a preamble or markdown code fences.
* Return only the 3 bullet points.

Code Snippet:
{$code}";

		if ( ! function_exists( 'wp_ai_client_prompt' ) ) {
			return new WP_Error(
				'ai_client_unavailable',
				__( 'The WordPress AI Client is not available.', 'code-dropdown' ),
				array( 'status' => 503 )
			);
		}

		try {
			$result = wp_ai_client_prompt( $prompt )->generate_text();

			if ( is_wp_error( $result ) ) {
				error_log( '[Code Dropdown AI Error] generate_text() failed: ' . $result->get_error_message() );
				return $result;
			}

			$explanation = is_string( $result ) ? trim( $result ) : '';

			if ( empty( $explanation ) ) {
				return new WP_Error(
					'ai_empty_response',
					__( 'The AI provider returned an empty response.', 'code-dropdown' ),
					array( 'status' => 502 )
				);
			}

			return array(
				'explanation' => sanitize_textarea_field( $explanation ),
			);

		} catch ( Throwable $e ) {
			error_log( '[Code Dropdown AI Exception] ' . $e->getMessage() );
			return new WP_Error(
				'ai_generation_exception',
				__( 'An unexpected error occurred while generating the explanation.', 'code-dropdown' ),
				array( 'status' => 500 )
			);
		}
	}
}

/* ==========================================================================
   STEP 5: ABILITY - CUSTOMIZE CODE / ADAPT TO MY SETUP
   ========================================================================== */

add_action( 'wp_abilities_api_init', function() {
	if ( ! function_exists( 'wp_register_ability' ) ) {
		return;
	}

	wp_register_ability(
		'code-dropdown/customize-code',
		array(
			'category'            => 'code-dropdown-tools',
			'label'               => __( 'Adapt Code to Setup', 'code-dropdown' ),
			'description'         => __( 'Replaces placeholder variables and config parameters in a code snippet with user-provided setup values.', 'code-dropdown' ),
			'show_in_rest'        => true,
			'show_in_mcp'         => true,
			'permission_callback' => '__return_true',
			'input_schema'        => array(
				'type'       => 'object',
				'properties' => array(
					'code'            => array(
						'type'        => 'string',
						'description' => __( 'The original code snippet.', 'code-dropdown' ),
						'minLength'   => 1,
					),
					'userInstruction' => array(
						'type'        => 'string',
						'description' => __( 'Customization instructions provided by the user.', 'code-dropdown' ),
						'minLength'   => 1,
					),
					'language'        => array(
						'type'        => 'string',
						'description' => __( 'Programming language token.', 'code-dropdown' ),
					),
				),
				'required'             => array( 'code', 'userInstruction' ),
				'additionalProperties' => false,
			),
			'output_schema'       => array(
				'type'       => 'object',
				'properties' => array(
					'personalizedCode' => array(
						'type'        => 'string',
						'description' => __( 'The transformed code snippet.', 'code-dropdown' ),
					),
				),
				'required'             => array( 'personalizedCode' ),
				'additionalProperties' => false,
			),
			'execute_callback'    => 'code_dropdown_execute_customize_ability',
		)
	);
} );

if ( ! function_exists( 'code_dropdown_execute_customize_ability' ) ) {
	function code_dropdown_execute_customize_ability( array $args ) {
		$raw_code        = isset( $args['code'] ) && is_string( $args['code'] ) ? $args['code'] : '';
		$user_instruction = isset( $args['userInstruction'] ) && is_string( $args['userInstruction'] ) ? $args['userInstruction'] : '';
		$language        = isset( $args['language'] ) ? sanitize_text_field( $args['language'] ) : 'code';

		$decoded     = html_entity_decode( $raw_code, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		$code        = wp_unslash( trim( $decoded ) );
		$instruction = sanitize_text_field( $user_instruction );

		if ( empty( $code ) || empty( $instruction ) ) {
			return new WP_Error(
				'invalid_input',
				__( 'Code snippet and user instruction cannot be empty.', 'code-dropdown' ),
				array( 'status' => 400 )
			);
		}

		$prompt = "You are an expert developer assistant. Refactor the following {$language} code snippet according to these exact setup requirements: '{$instruction}'.
Return ONLY the updated code snippet inside plain text (no markdown backticks, no explanatory commentary).

Original Code:
{$code}";

		if ( function_exists( 'wp_ai_client_prompt' ) ) {
			try {
				$result = wp_ai_client_prompt( $prompt )->generate_text();

				if ( ! is_wp_error( $result ) && ! empty( $result ) ) {
					$clean_code = trim( preg_replace( '/^```[a-z]*|```$/m', '', trim( (string) $result ) ) );
					return array(
						'personalizedCode' => esc_textarea( $clean_code ),
					);
				}
			} catch ( Throwable $e ) {
				error_log( '[Code Dropdown Customization Exception] ' . $e->getMessage() );
			}
		}

		// Local Heuristic Fallback Pair Replacement
		$customized_code = $code;
		if ( preg_match_all( '/([a-zA-Z0-9_]+)\s*=\s*[\'"]?([^\'"\s;]+)[\'"]?/', $instruction, $matches, PREG_SET_ORDER ) ) {
			foreach ( $matches as $match ) {
				$key             = $match[1];
				$val             = $match[2];
				$customized_code = preg_replace( '/\b' . preg_quote( $key, '/' ) . '\b/', $val, $customized_code );
			}
		}

		return array(
			'personalizedCode' => esc_textarea( $customized_code ),
		);
	}
}

/* ==========================================================================
   CONSOLIDATED REST API FALLBACK CONTROLLERS
   ========================================================================== */

add_action( 'rest_api_init', function() {
	// Auto-Fill Metadata Endpoint
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
			'args'                => array(
				'code' => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_textarea_field',
				),
			),
		)
	);

	// Toggle Task Completion Endpoint
	register_rest_route(
		'code-dropdown/v1',
		'/toggle-complete',
		array(
			'methods'             => 'POST',
			'callback'            => function( WP_REST_Request $request ) {
				$user_id  = get_current_user_id();
				$block_id = sanitize_text_field( $request->get_param( 'block_id' ) );
				$status   = (bool) $request->get_param( 'status' );

				if ( ! $user_id ) {
					return new WP_Error( 'unauthorized', __( 'User not logged in.', 'code-dropdown' ), array( 'status' => 401 ) );
				}

				if ( empty( $block_id ) ) {
					return new WP_Error( 'invalid_id', __( 'Block ID is required.', 'code-dropdown' ), array( 'status' => 400 ) );
				}

				$saved_tasks = get_user_meta( $user_id, '_wpe_completed_blocks', true );
				if ( ! is_array( $saved_tasks ) ) {
					$saved_tasks = array();
				}

				$saved_tasks[ $block_id ] = $status;
				update_user_meta( $user_id, '_wpe_completed_blocks', $saved_tasks );

				return array(
					'success' => true,
					'tasks'   => $saved_tasks,
				);
			},
			'permission_callback' => function() {
				return is_user_logged_in();
			},
			'args'                => array(
				'block_id' => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
				),
				'status'   => array(
					'required' => true,
					'type'     => 'boolean',
				),
			),
		)
	);

	// Explain Code Endpoint
	register_rest_route(
		'code-dropdown/v1',
		'/explain-code',
		array(
			'methods'             => 'POST',
			'callback'            => function( WP_REST_Request $request ) {
				$params   = $request->get_json_params();
				$raw_code = is_array( $params ) && isset( $params['code'] ) ? $params['code'] : $request->get_param( 'code' );
				$language = is_array( $params ) && isset( $params['language'] ) ? $params['language'] : $request->get_param( 'language' );

				return code_dropdown_execute_explain_ability( array(
					'code'     => (string) $raw_code,
					'language' => (string) $language,
				) );
			},
			'permission_callback' => '__return_true',
			'args'                => array(
				'code'     => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_textarea_field',
				),
				'language' => array(
					'required'          => false,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		)
	);

	// Customize Code Endpoint
	register_rest_route(
		'code-dropdown/v1',
		'/customize-code',
		array(
			'methods'             => 'POST',
			'callback'            => function( WP_REST_Request $request ) {
				$params      = $request->get_json_params();
				$raw_code    = is_array( $params ) && isset( $params['code'] ) ? $params['code'] : $request->get_param( 'code' );
				$instruction = is_array( $params ) && isset( $params['userInstruction'] ) ? $params['userInstruction'] : $request->get_param( 'userInstruction' );
				$language    = is_array( $params ) && isset( $params['language'] ) ? $params['language'] : $request->get_param( 'language' );

				return code_dropdown_execute_customize_ability( array(
					'code'            => (string) $raw_code,
					'userInstruction' => (string) $instruction,
					'language'        => (string) $language,
				) );
			},
			'permission_callback' => '__return_true',
			'args'                => array(
				'code'            => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_textarea_field',
				),
				'userInstruction' => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
				),
				'language'        => array(
					'required'          => false,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		)
	);
} );