<?php
$persistent_id = $attributes['id'] ?? '';

if ( empty( $persistent_id ) ) {
    return; // Block must have a stable ID
}

$inner_blocks = $block->parsed_block['innerBlocks'] ?? [];

$title_html = '';
$content_html = '';

foreach ( $inner_blocks as $inner_block ) {
    if ( 'bigbite/code-header' === $inner_block['blockName'] ) {
        $title_html = render_block( $inner_block );
    } elseif ( 'bigbite/code-content' === $inner_block['blockName'] ) {
        $content_html = render_block( $inner_block );
    }
}
?>

<div
    data-wp-interactive="wpe"
    data-wp-init="callbacks.initTask"
    data-wp-class--complete="context.isComplete"
    <?php echo get_block_wrapper_attributes(); ?>
    <?php echo wp_interactivity_data_wp_context(array(
        'id' => $persistent_id,
        'isOpen' => false,
        'openText'  => '+',
        'closeText' => '-',
        'toggleText'  => '+',
        'isComplete' => false,
        'completeText' => esc_html__( 'Done', 'code-dropdown' ),
    )); ?>
>
    <div class="task-header">
        <?php echo ! empty( $title_html ) ? $title_html : 'Add a title'; ?>

        <button data-wp-on--click="actions.toggleOpen">
    <span data-wp-text="context.toggleText"></span>
</button>
    </div>

    <div
    class="task-panel"
    data-wp-class--active="context.isOpen"
>
        <div class="panel-content"><?php echo $content_html; ?></div>

        <div class="task-footer">
            <button data-wp-on--click="actions.toggleComplete" data-wp-class--is-completed="context.isComplete">
                <span data-wp-text="context.completeText"></span>
            </button>
        </div>
    </div>
</div>
