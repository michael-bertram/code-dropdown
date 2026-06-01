import { __ } from '@wordpress/i18n';
import { useBlockProps, InnerBlocks, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, SelectControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data'; // Added to pull live inner block content
import './editor.scss';

export default function Edit({ attributes, setAttributes, clientId }) {
    const { 
        showLanguageBadge, 
        codeLanguage, 
        isDarkMode, 
        isCompact,
        maxHeight,
        showLineNumbers,
        fontSize 
    } = attributes;

    // 1. Grab the live text data inside the child wpe/code-content block dynamically
    const innerCodeText = useSelect((select) => {
        const { getBlocks } = select('core/block-editor');
        const innerBlocks = getBlocks(clientId);
        
        // Find our code content child block
        const contentBlock = innerBlocks.find(block => block.name === 'wpe/code-content');
        
        // Return the code attribute string if it exists
        return contentBlock?.attributes?.code || '';
    }, [clientId]);

    // 2. JavaScript Line & Character Analytics Counter Engine
    const cleanRawText = innerCodeText.replace(/<[^>]*>/g, ''); // Strip any rich text HTML tags
    const characterCount = cleanRawText.length;
    
    // Split lines by line breaks. If empty text, default to 1 row.
    const linesArray = cleanRawText.split('\n');
    const lineCount = innerCodeText ? linesArray.length : 1;

    // 3. Setup dynamic inline styles to pass custom variables to editor container
    const blockProps = useBlockProps({
        className: `wp-block-wpe-code-dropdown-editor ${isDarkMode ? 'dark-theme' : ''} ${isCompact ? 'is-compact' : ''} ${showLineNumbers ? 'has-line-numbers' : ''}`,
        style: { 
            '--editor-code-font-size': fontSize,
            '--panel-max-height': maxHeight
        }
    });

    const maxHeightOptions = [
        { label: 'No Limit (Scroll disabled)', value: 'none' },
        { label: 'Short (250px)', value: '250px' },
        { label: 'Medium (400px)', value: '400px' },
        { label: 'Tall (600px)', value: '600px' },
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
                    <SelectControl
                        label={__('Code Font Size', 'code-dropdown')}
                        value={fontSize}
                        options={fontSizeOptions}
                        onChange={(value) => setAttributes({ fontSize: value })}
                    />
                </PanelBody>
            </InspectorControls>

            <div {...blockProps}>
            {/* Move the language badge wrapper clean out of the code flex alignment zone */}
            <div className="editor-combined-container">
                {showLanguageBadge && (
                    <span className={`code-badge lang-${codeLanguage.toLowerCase()}`}>
                        {codeLanguage}
                    </span>
                )}
                
                <div 
                    className="editor-inner-blocks-wrapper" 
                    data-show-lines={showLineNumbers}
                    data-line-count={lineCount}
                    style={{ '--panel-max-height': maxHeight }}
                >
                    <InnerBlocks 
                        allowedBlocks={['wpe/code-header', 'wpe/code-content']}
                        template={[['wpe/code-header', {}], ['wpe/code-content', {}]]}
                        templateLock="all"
                    />
                </div>

                {/* Live Editor Analytics Meta Footer Status Info bar */}
                <div className="code-footer">
                    <div className="code-analytics-meta">
                        <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
                        <span className="meta-divider">•</span>
                        <span>{characterCount.toLocaleString()} chars</span>
                    </div>
                </div>

            </div>
        </div>
    </>
    );
}