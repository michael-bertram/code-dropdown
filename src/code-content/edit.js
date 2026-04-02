import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

const CONTENT = [['core/code', { placeholder: 'Add code here...' }]];

export default function Edit() {
  return (
    <div {...useBlockProps({ className: 'task-content-editor' })}>
      <InnerBlocks template={CONTENT} templateLock={false} placeholder="Add code here..." />
    </div>
  );
}
