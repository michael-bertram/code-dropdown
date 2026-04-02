import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';
import { useEffect } from '@wordpress/element';

const TEMPLATE = [['wpe/code-header'], ['wpe/code-content']];

export default function Edit({ attributes, setAttributes, clientId }) {
  // If no ID exists, save the block's clientId as the permanent ID
  useEffect(() => {
    if (!attributes.id) {
      setAttributes({ id: clientId });
    }
  }, []);

  return (
    <div {...useBlockProps({ className: 'task-block-editor' })}>
      <InnerBlocks template={TEMPLATE} templateLock="all" />
    </div>
  );
}
