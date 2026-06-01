import { __ } from '@wordpress/i18n';
import { useBlockProps, InnerBlocks, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, SelectControl } from '@wordpress/components';
import './editor.scss';

export default function Edit({ attributes, setAttributes }) {
    const { 
        showLanguageBadge, 
        codeLanguage, 
        isDarkMode, 
        fontSize, 
        isCompact 
    } = attributes;

    // Build the dynamic editor classes based on user sidebar choices
    const blockProps = useBlockProps({
        className: `wp-block-wpe-code-dropdown-editor ${isDarkMode ? 'dark-theme' : ''} ${isCompact ? 'is-compact' : ''}`,
        style: { '--editor-code-font-size': fontSize } // Pass font size down as a CSS variable
    });

    const languageOptions = [
        { label: 'PHP', value: 'PHP' },
        { label: 'JavaScript', value: 'JS' },
        { label: 'CSS', value: 'CSS' },
        { label: 'HTML', value: 'HTML' },
        { label: 'Python', value: 'Python' },
        { label: 'SQL', value: 'SQL' },
    ];

    const fontSizeOptions = [
        { label: 'Small (12px)', value: '12px' },
        { label: 'Normal (14px)', value: '14px' },
        { label: 'Medium (16px)', value: '16px' },
        { label: 'Large (18px)', value: '18px' },
    ];

    return (
        <>
            <InspectorControls>
                {/* Panel 1: Original Language Controls */}
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
                            options={languageOptions}
                            onChange={(value) => setAttributes({ codeLanguage: value })}
                        />
                    )}
                </PanelBody>

                {/* New Panel 2: Design Styling Layout Controls */}
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
                    <SelectControl
                        label={__('Code Font Size', 'code-dropdown')}
                        value={fontSize}
                        options={fontSizeOptions}
                        onChange={(value) => setAttributes({ fontSize: value })}
                    />
                </PanelBody>
            </InspectorControls>

            {/* Structured Editor Canvas Container */}
            <div {...blockProps}>
                <div className="editor-combined-container">
                    {showLanguageBadge && (
                        <span className={`code-badge lang-${codeLanguage.toLowerCase()}`}>
                            {codeLanguage}
                        </span>
                    )}
                    <InnerBlocks 
                        allowedBlocks={['wpe/code-header', 'wpe/code-content']}
                        template={[
                            ['wpe/code-header', {}],
                            ['wpe/code-content', {}]
                        ]}
                        templateLock="all"
                    />
                </div>
            </div>
        </>
    );
}