<?php
// Fallback gracefully to a temporary unique ID if attributes['id'] is empty
$persistent_id     = ! empty( $attributes['id'] ) ? $attributes['id'] : wp_unique_id( 'wpe-code-' );
$show_badge        = $attributes['showLanguageBadge'] ?? true;
$code_lang         = $attributes['codeLanguage'] ?? 'PHP';
$is_dark           = $attributes['isDarkMode'] ?? false;
$is_compact        = $attributes['isCompact'] ?? false;
$font_size         = $attributes['fontSize'] ?? '14px';
$max_height        = $attributes['maxHeight'] ?? 'none';
$show_lines        = $attributes['showLineNumbers'] ?? false;

$theme_class   = $is_dark ? 'dark-theme' : '';
$compact_class = $is_compact ? 'is-compact' : '';
$lines_class   = $show_lines ? 'has-line-numbers' : '';

// Map structural layout CSS variables dynamically
$inline_styles = sprintf(
    'style="--editor-code-font-size: %s; --panel-max-height: %s;"',
    esc_attr( $font_size ),
    esc_attr( $max_height )
);

$inner_blocks = $block->parsed_block['innerBlocks'] ?? [];
$title_html = '';
$content_html = '';

foreach ( $inner_blocks as $inner_block ) {
    if ( isset($inner_block['blockName']) && 'wpe/code-header' === $inner_block['blockName'] ) {
        $title_html = render_block( $inner_block );
    } elseif ( isset($inner_block['blockName']) && 'wpe/code-content' === $inner_block['blockName'] ) {
        $content_html = render_block( $inner_block );
    }
}

// DYNAMIC FRONTEND LINE & CHARACTER COUNT EXTRACTION
$line_gutter_html = '';
$character_count  = 0;
$line_count       = 1; // Default to 1 line minimum

if ( ! empty( $content_html ) ) {
    // Convert common HTML block variations to raw breaks before stripping tags
    $clean_breaks = preg_replace('/<br\s*\/?>/i', "\n", $content_html);
    $clean_breaks = preg_replace('/<\/p><p>/i', "\n", $clean_breaks);
    $clean_breaks = preg_replace('/<\/div><div>/i', "\n", $clean_breaks);
    
    // Extract pure plaintext text string
    $raw_code_text = strip_tags($clean_breaks);
    
    // Normalize Windows carriage returns \r\n to \n
    $raw_code_text = str_replace("\r", "", $raw_code_text);
    $character_count = strlen($raw_code_text);
    
    // Split text accurately into a single index array
    if (!empty(trim($raw_code_text))) {
        $lines = explode("\n", $raw_code_text);
        $line_count = count($lines);
    }

    // Build line numbers sidebar track column
    if ( $show_lines ) {
        $line_gutter_html .= '<div class="line-numbers-gutter" aria-hidden="true">';
        for ( $i = 1; $i <= $line_count; $i++ ) {
            $line_gutter_html .= '<span>' . $i . '</span>';
        }
        $line_gutter_html .= '</div>';
    }
}
?>

<div
    data-wp-interactive="wpe"
    data-wp-init="callbacks.initTask"
    data-wp-class--complete="context.isComplete"
    <?php echo $inline_styles; ?>
    <?php echo get_block_wrapper_attributes( array(
        'class' => esc_attr( trim( "wp-block-wpe-code-dropdown-editor $theme_class $compact_class $lines_class" ) )
    ) ); ?>
    <?php echo wp_interactivity_data_wp_context(array(
        'id'           => $persistent_id,                     
        'isOpen'       => false,
        'openText'     => '+',
        'closeText'    => '-',
        'toggleText'   => '+',
        'isComplete'   => false,
        'isCopied'     => false,
        'completeText' => esc_html__( 'Done', 'code-dropdown' ),
    )); ?>
>
    <div class="editor-combined-container">
        
        <div class="code-header">
            <div class="code-title-container">
                <div class="code-title">
                    <?php echo ! empty( trim( strip_tags( $title_html ) ) ) ? $title_html : '<h3>Untitled Snippet</h3>'; ?>
                </div>
                <?php if ( true === $show_badge ) : ?>
                    <span class="code-badge lang-<?php echo esc_attr( strtolower( $code_lang ) ); ?>">
                        <?php echo esc_html( $code_lang ); ?>
                    </span>
                <?php endif; ?>
            </div>

            <div class="code-actions">
                <button class="copy-button" data-wp-on--click="actions.copyToClipboard" data-wp-class--copied="context.isCopied" aria-label="Copy code to clipboard">
                    <svg class="icon-copy" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    <svg class="icon-check" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#4caf50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
                <button class="toggle-button" data-wp-on--click="actions.toggleOpen">
                    <span data-wp-text="context.toggleText"></span>
                </button>
            </div>
        </div>

        <div class="editor-inner-blocks-wrapper" data-wp-class--active="context.isOpen">
            <div class="panel-scroll-container">
                <div class="panel-content-flex-wrapper">
                    <?php echo $line_gutter_html; ?>
                    <div class="panel-content">
                        <?php echo $content_html; ?>
                    </div>
                </div>
            </div>
        </div>

        <div class="code-footer">
            <div class="code-analytics-meta">
                <span><?php echo esc_html( sprintf( _n( '%d line', '%d lines', $line_count, 'code-dropdown' ), $line_count ) ); ?></span>
                <span class="meta-divider">•</span>
                <span><?php echo esc_html( sprintf( __( '%s chars', 'code-dropdown' ), number_format( $character_count ) ) ); ?></span>
            </div>
            
            <button data-wp-on--click="actions.toggleComplete" data-wp-class--is-completed="context.isComplete">
                <span data-wp-text="context.completeText"></span>
            </button>
        </div>

    </div>
</div>