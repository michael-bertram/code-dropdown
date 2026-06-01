<?php
$persistent_id     = $attributes['id'] ?? '';
$show_badge        = $attributes['showLanguageBadge'] ?? true;
$code_lang         = $attributes['codeLanguage'] ?? 'PHP';

// Restored your original precise block.json naming choices!
$is_dark           = $attributes['isDarkMode'] ?? false;
$is_compact        = $attributes['isCompact'] ?? false;
$font_size         = $attributes['fontSize'] ?? '14px';

if ( empty( $persistent_id ) ) {
    return;
}

$theme_class   = $is_dark ? 'dark-theme' : '';
$compact_class = $is_compact ? 'is-compact' : '';
$inline_styles = sprintf( 'style="--code-font-size: %s;"', esc_attr( $font_size ) );

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
?>

<div
    data-wp-interactive="wpe"
    data-wp-init="callbacks.initTask"
    data-wp-class--complete="context.isComplete"
    <?php echo $inline_styles; ?>
    <?php echo get_block_wrapper_attributes( array(
        'class' => esc_attr( trim( "$theme_class $compact_class" ) )
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
    <div class="code-header">
        <div class="code-title-container">
            <div class="code-title">
                <?php 
                // Checks if rendered markup exists; if empty, strips fallback tags gracefully
                echo ! empty( trim( strip_tags( $title_html ) ) ) ? $title_html : '<h3>Untitled Snippet</h3>'; 
                ?>
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

    <div class="code-panel" data-wp-class--active="context.isOpen">
        <div class="panel-content"><?php echo $content_html; ?></div>

        <div class="code-footer">
            <button data-wp-on--click="actions.toggleComplete" data-wp-class--is-completed="context.isComplete">
                <span data-wp-text="context.completeText"></span>
            </button>
        </div>
    </div>
</div>