import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function Save() {
  return (
    <div {...useBlockProps.save({ className: 'task-content' })}>
      <InnerBlocks.Content />
    </div>
  );
}
