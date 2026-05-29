import { useBlockProps, RichText } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

export default function Edit({ attributes, setAttributes }) {
    const blockProps = useBlockProps({ 
        className: 'task-content-editor' 
    });

    return (
        <div {...blockProps}>
            <RichText
                tagName="h3" // Renders an <h3> tag on the page
                value={attributes.content} // Binds to your blocks attribute
                onChange={(value) => setAttributes({ content: value })}
                placeholder={__('Add Filename', 'code-dropdown')} 
                allowedFormats={[]} // Empty array disables bold/italics formatting popups for clean plain text
            />
        </div>
    );
}