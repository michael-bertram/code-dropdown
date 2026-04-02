import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

const TITLE = [['core/heading', { placeholder: 'Filename', level: 4 }]];

export default function Edit() {
  return (
    <div {...useBlockProps({ className: 'task-content-editor' })}>
      <InnerBlocks template={TITLE} templateLock={false} placeholder="Task title" />
    </div>
  );
}
