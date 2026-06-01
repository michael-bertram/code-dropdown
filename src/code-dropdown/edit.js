import { __ } from '@wordpress/i18n';
import { useBlockProps, InnerBlocks, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, SelectControl } from '@wordpress/components';
import './editor.scss';

export default function Edit({ attributes, setAttributes }) {
    const { 
        showLanguageBadge, 
        codeLanguage, 
        isDarkMode, 
        isCompact,
        maxHeight,
        showLineNumbers,
        fontSize // Pulled attribute back in
    } = attributes;

    const blockProps = useBlockProps({
        className: `wp-block-wpe-code-dropdown-editor ${isDarkMode ? 'dark-theme' : ''} ${isCompact ? 'is-compact' : ''}`,
        style: { '--editor-code-font-size': fontSize } // Binds the editor canvas view live
    });

    const maxHeightOptions = [
        { label: 'No Limit (Scroll disabled)', value: 'none' },
        { label: 'Short (250px)', value: '250px' },
        { label: 'Medium (400px)', value: '400px' },
        { label: 'Tall (600px)', value: '600px' },
    ];

    // Sizing Array profiles
    const fontSizeOptions = [
        { label: 'Small (12px)', value: '12px' },
        { label: 'Normal (14px)', value: '14px' },
        { label: 'Medium (16px)', value: '16px' },
        { label: 'Large (18px)', value: '18px' },
    ];

    return (
        <>
            <InspectorControls>
                <PanelBody title={__('Code Display Settings', 'code-dropdown')} initialOpen={true}>
                    <ToggleControl
                        label={__('Show Language Badge', 'code-dropdown')}
                        checked={showLanguageBadge}
                        onChange={(value) => setAttributes({ showLanguageBadge: value })}
                    />
                    {showLanguageBadge && (
                        <SelectControl
                            label={__('Code Language', 'code-dropdown')}
                            value={codeLanguage}
                            options={[
                                { label: 'PHP', value: 'PHP' },
                                { label: 'JavaScript', value: 'JS' },
                                { label: 'CSS', value: 'CSS' },
                                { label: 'HTML', value: 'HTML' },
                            ]}
                            onChange={(value) => setAttributes({ codeLanguage: value })}
                        />
                    )}
                </PanelBody>

                <PanelBody title={__('Design & Layout', 'code-dropdown')} initialOpen={true}>
                    <ToggleControl
                        label={__('Use Dark Theme', 'code-dropdown')}
                        checked={isDarkMode}
                        onChange={(value) => setAttributes({ isDarkMode: value })}
                    />
                    <ToggleControl
                        label={__('Compact Spacing Layout', 'code-dropdown')}
                        checked={isCompact}
                        onChange={(value) => setAttributes({ isCompact: value })}
                    />
                    <ToggleControl
                        label={__('Show Line Numbers', 'code-dropdown')}
                        checked={showLineNumbers}
                        onChange={(value) => setAttributes({ showLineNumbers: value })}
                    />
                    <SelectControl
                        label={__('Max Panel Height', 'code-dropdown')}
                        value={maxHeight}
                        options={maxHeightOptions}
                        onChange={(value) => setAttributes({ maxHeight: value })}
                    />
                    {/* Added Font Size selector control back to the layout flow */}
                    <SelectControl
                        label={__('Code Font Size', 'code-dropdown')}
                        value={fontSize}
                        options={fontSizeOptions}
                        onChange={(value) => setAttributes({ fontSize: value })}
                    />
                </PanelBody>
            </InspectorControls>

            <div {...blockProps}>
                <div className="editor-combined-container">
                    {showLanguageBadge && (
                        <span className={`code-badge lang-${codeLanguage.toLowerCase()}`}>
                            {codeLanguage}
                        </span>
                    )}
                    <InnerBlocks 
                        allowedBlocks={['wpe/code-header', 'wpe/code-content']}
                        template={[['wpe/code-header', {}], ['wpe/code-content', {}]]}
                        templateLock="all"
                    />
                </div>
            </div>
        </>
    );
}